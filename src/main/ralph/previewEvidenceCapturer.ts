import type { ValidationError, ValidationWarning } from './ralphArtifact';

type PlaywrightBrowser = import('playwright').Browser;
type PlaywrightBrowserContext = import('playwright').BrowserContext;
type PlaywrightPage = import('playwright').Page;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ViewportPreset = 'desktop' | 'mobile' | 'tablet';

export interface ViewportConfig {
  preset: ViewportPreset;
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
}

export const VIEWPORT_PRESETS: Record<ViewportPreset, ViewportConfig> = {
  desktop: {
    preset: 'desktop',
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    isMobile: false,
  },
  mobile: {
    preset: 'mobile',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
  },
  tablet: {
    preset: 'tablet',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: false,
  },
};

export interface ScreenshotResult {
  route: string;
  viewport: ViewportPreset;
  screenshotPath: string | null;
  screenshotBase64: string | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  durationMs: number;
  timestamp: number;
}

export interface ConsoleEvidence {
  route: string;
  viewport: ViewportPreset;
  consoleErrors: string[];
  consoleWarnings: string[];
  pageErrors: string[];
  failedRequests: FailedRequest[];
  timestamp: number;
}

export interface FailedRequest {
  url: string;
  status: number;
  failureReason: string;
}

export interface PreviewEvidenceResult {
  screenshots: ScreenshotResult[];
  consoleEvidence: ConsoleEvidence[];
  routes: string[];
  viewports: ViewportPreset[];
  skipped: boolean;
  skipReason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Evidence Capturer
// ─────────────────────────────────────────────────────────────────────────────

export class PreviewEvidenceCapturer {
  private browser: PlaywrightBrowser | null = null;
  private context: PlaywrightBrowserContext | null = null;

  /**
   * Capture screenshots and browser evidence for a running preview server
   */
  async captureEvidence(
    previewUrl: string,
    routes: string[],
    viewports: ViewportPreset[] = ['desktop', 'mobile']
  ): Promise<PreviewEvidenceResult> {
    const startTime = Date.now();
    const screenshots: ScreenshotResult[] = [];
    const consoleEvidence: ConsoleEvidence[] = [];

    // Check if Playwright is available
    if (!await this.isPlaywrightAvailable()) {
      return {
        screenshots: [],
        consoleEvidence: [],
        routes,
        viewports,
        skipped: true,
        skipReason: 'Playwright is not installed. Run: npm install @playwright/test && npx playwright install chromium',
      };
    }

    try {
      await this.launchBrowser();

      for (const viewport of viewports) {
        await this.setupContextForViewport(viewport);

        for (const route of routes) {
          const url = this.buildUrl(previewUrl, route);

          // Capture screenshot
          const screenshotResult = await this.captureScreenshot(url, route, viewport);
          screenshots.push(screenshotResult);

          // Capture console evidence
          const consoleResult = await this.captureConsoleEvidence(url, route, viewport);
          consoleEvidence.push(consoleResult);
        }
      }

      return {
        screenshots,
        consoleEvidence,
        routes,
        viewports,
        skipped: false,
        skipReason: null,
      };
    } catch (error) {
      return {
        screenshots,
        consoleEvidence,
        routes,
        viewports,
        skipped: true,
        skipReason: error instanceof Error ? error.message : 'Unknown error during capture',
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Check if Playwright is available
   */
  private async isPlaywrightAvailable(): Promise<boolean> {
    try {
      const { chromium } = await import('playwright');
      const testBrowser = await chromium.launch({ headless: true });
      await testBrowser.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Launch the browser
   */
  private async launchBrowser(): Promise<void> {
    if (this.browser && this.browser.isConnected()) {
      return;
    }

    const { chromium } = await import('playwright');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  /**
   * Close the browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Setup context for a specific viewport
   */
  private async setupContextForViewport(viewport: ViewportPreset): Promise<void> {
    const config = VIEWPORT_PRESETS[viewport];

    if (this.context) {
      await this.context.close();
    }

    this.context = await this.browser!.newContext({
      viewport: {
        width: config.width,
        height: config.height,
      },
      deviceScaleFactor: config.deviceScaleFactor,
      isMobile: config.isMobile,
    });
  }

  /**
   * Capture a screenshot for a URL
   */
  private async captureScreenshot(
    url: string,
    route: string,
    viewport: ViewportPreset
  ): Promise<ScreenshotResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!this.context) {
      return {
        route,
        viewport,
        screenshotPath: null,
        screenshotBase64: null,
        errors: [{ code: 'NO_CONTEXT', message: 'Browser context not initialized' }],
        warnings: [],
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    const page = await this.context.newPage();

    try {
      // Capture console messages during page load
      const consoleMessages: string[] = [];
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        consoleMessages.push(text);
        if (msg.type() === 'error') {
          consoleErrors.push(text);
        } else if (msg.type() === 'warning') {
          consoleWarnings.push(text);
        }
      });

      // Navigate and wait for network idle
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Take screenshot
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      const screenshotBase64 = screenshotBuffer.toString('base64');

      // Check for console errors
      if (consoleErrors.length > 0) {
        errors.push({
          code: 'CONSOLE_ERRORS',
          message: `${consoleErrors.length} console errors detected: ${consoleErrors.slice(0, 3).join('; ')}`,
        });
      }

      return {
        route,
        viewport,
        screenshotPath: null,
        screenshotBase64,
        errors,
        warnings,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      errors.push({
        code: 'SCREENSHOT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        route,
        viewport,
        screenshotPath: null,
        screenshotBase64: null,
        errors,
        warnings,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Capture console evidence for a URL
   */
  private async captureConsoleEvidence(
    url: string,
    route: string,
    viewport: ViewportPreset
  ): Promise<ConsoleEvidence> {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: FailedRequest[] = [];

    if (!this.context) {
      return {
        route,
        viewport,
        consoleErrors: ['No browser context'],
        consoleWarnings: [],
        pageErrors: ['No browser context'],
        failedRequests: [],
        timestamp: Date.now(),
      };
    }

    const page = await this.context.newPage();

    try {
      // Listen for console messages
      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
          consoleErrors.push(text);
        } else if (msg.type() === 'warning') {
          consoleWarnings.push(text);
        }
      });

      // Listen for page errors
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      // Listen for failed requests
      page.on('requestfailed', (request) => {
        const failure = request.failure();
        failedRequests.push({
          url: request.url(),
          status: 0,
          failureReason: failure?.errorText ?? 'Unknown',
        });
      });

      // Listen for response with non-2xx status
      page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) {
          failedRequests.push({
            url: response.url(),
            status,
            failureReason: `HTTP ${status}`,
          });
        }
      });

      // Navigate and wait
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait a bit for any async errors
      await page.waitForTimeout(1000);

      return {
        route,
        viewport,
        consoleErrors,
        consoleWarnings,
        pageErrors,
        failedRequests,
        timestamp: Date.now(),
      };
    } catch (error) {
      pageErrors.push(error instanceof Error ? error.message : 'Unknown error');

      return {
        route,
        viewport,
        consoleErrors,
        consoleWarnings,
        pageErrors,
        failedRequests,
        timestamp: Date.now(),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Build full URL from preview URL and route
   */
  private buildUrl(previewUrl: string, route: string): string {
    const baseUrl = previewUrl.endsWith('/') ? previewUrl.slice(0, -1) : previewUrl;
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    return `${baseUrl}${cleanRoute}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: PreviewEvidenceCapturer | null = null;

export function getPreviewEvidenceCapturer(): PreviewEvidenceCapturer {
  if (!instance) {
    instance = new PreviewEvidenceCapturer();
  }
  return instance;
}

export function resetPreviewEvidenceCapturer(): void {
  instance = null;
}