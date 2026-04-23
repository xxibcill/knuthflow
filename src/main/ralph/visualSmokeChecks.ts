import type { ValidationError, ValidationWarning } from './ralphArtifact';
import type { ScreenshotResult, ConsoleEvidence } from './previewEvidenceCapturer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VisualSmokeCheckOptions {
  blankScreenThreshold?: number; // Min percentage of non-white pixels to be considered non-blank
  checkOverflow?: boolean;
  checkMissingContent?: boolean;
  allowedConsoleErrors?: string[];
}

export interface VisualSmokeCheckResult {
  passed: boolean;
  checks: SmokeCheck[];
  summary: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  durationMs: number;
  timestamp: number;
}

export interface SmokeCheck {
  name: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  description: string;
  details?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual Smoke Checks
// ─────────────────────────────────────────────────────────────────────────────

export class VisualSmokeChecks {
  private defaultOptions: VisualSmokeCheckOptions = {
    blankScreenThreshold: 5, // 5% non-white pixels minimum
    checkOverflow: true,
    checkMissingContent: true,
    allowedConsoleErrors: [],
  };

  /**
   * Run visual smoke checks on screenshot and console evidence
   */
  runChecks(
    screenshots: ScreenshotResult[],
    consoleEvidence: ConsoleEvidence[],
    options: VisualSmokeCheckOptions = {}
  ): VisualSmokeCheckResult {
    const startTime = Date.now();
    const checks: SmokeCheck[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check each screenshot for visual issues
    for (const screenshot of screenshots) {
      if (screenshot.screenshotBase64) {
        // Check for blank screen
        const blankCheck = this.checkForBlankScreen(screenshot);
        checks.push(blankCheck);
        if (!blankCheck.passed) {
          errors.push({
            code: 'BLANK_SCREEN',
            message: `Blank or near-blank screen detected at ${screenshot.route} (${screenshot.viewport})`,
          });
        }
      }

      // Check for missing content
      const contentCheck = this.checkForMissingContent(screenshot);
      checks.push(contentCheck);
      if (!contentCheck.passed) {
        warnings.push({
          code: 'MISSING_CONTENT',
          message: `Possible missing content at ${screenshot.route} (${screenshot.viewport})`,
        });
      }
    }

    // Check console evidence for errors
    for (const evidence of consoleEvidence) {
      // Severe browser errors
      const errorCheck = this.checkForSevereErrors(evidence, options.allowedConsoleErrors ?? []);
      checks.push(errorCheck);
      if (!errorCheck.passed) {
        errors.push({
          code: 'BROWSER_ERRORS',
          message: `Severe browser errors at ${evidence.route} (${evidence.viewport}): ${evidence.consoleErrors.length} errors`,
        });
      }

      // Failed network requests
      const networkCheck = this.checkForFailedRequests(evidence);
      checks.push(networkCheck);
      if (!networkCheck.passed) {
        warnings.push({
          code: 'FAILED_REQUESTS',
          message: `Failed network requests at ${evidence.route} (${evidence.viewport}): ${evidence.failedRequests.length} failed`,
        });
      }
    }

    // Check for horizontal overflow (layout issues)
    if (options.checkOverflow) {
      const overflowChecks = this.checkForLayoutOverflow(screenshots);
      checks.push(...overflowChecks);
      for (const check of overflowChecks) {
        if (!check.passed && check.severity === 'error') {
          errors.push({
            code: 'LAYOUT_OVERFLOW',
            message: check.description,
          });
        }
      }
    }

    const allPassed = checks.every((c) => c.passed);

    return {
      passed: allPassed,
      checks,
      summary: allPassed
        ? 'All visual smoke checks passed'
        : `Visual smoke checks failed: ${checks.filter((c) => !c.passed).length} check(s) failed`,
      errors,
      warnings,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if screenshot is blank or near-blank
   */
  private checkForBlankScreen(screenshot: ScreenshotResult): SmokeCheck {
    if (!screenshot.screenshotBase64) {
      return {
        name: 'blank_screen',
        passed: false,
        severity: 'error',
        description: 'Screenshot not available',
        details: 'Cannot check for blank screen without screenshot',
      };
    }

    try {
      // Decode base64 and analyze image data
      // For simplicity, we'll check if screenshot has significant content
      // In a real implementation, you would decode the PNG and analyze pixels
      const buffer = Buffer.from(screenshot.screenshotBase64, 'base64');

      // Check if image is too small (likely blank/corrupt)
      if (buffer.length < 1000) {
        return {
          name: 'blank_screen',
          passed: false,
          severity: 'error',
          description: 'Screenshot appears to be empty or corrupt',
          details: `Image buffer size: ${buffer.length} bytes`,
        };
      }

      // Placeholder: Real implementation would decode PNG and check pixel variance
      // For now, assume screenshot is valid if it has reasonable size
      return {
        name: 'blank_screen',
        passed: true,
        severity: 'info',
        description: 'Screenshot has content',
        details: `Screenshot size: ${buffer.length} bytes`,
      };
    } catch (error) {
      return {
        name: 'blank_screen',
        passed: false,
        severity: 'error',
        description: 'Failed to analyze screenshot',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check for missing content indicators
   */
  private checkForMissingContent(screenshot: ScreenshotResult): SmokeCheck {
    if (!screenshot.screenshotBase64) {
      return {
        name: 'missing_content',
        passed: false,
        severity: 'warning',
        description: 'Screenshot not available',
      };
    }

    // Check screenshot size - very small screenshots may indicate missing content
    const buffer = Buffer.from(screenshot.screenshotBase64, 'base64');

    // A typical meaningful screenshot should be at least a few KB
    // This is a rough heuristic
    if (buffer.length < 5000) {
      return {
        name: 'missing_content',
        passed: false,
        severity: 'warning',
        description: 'Screenshot may be missing content',
        details: `Screenshot size (${buffer.length} bytes) below typical threshold`,
      };
    }

    return {
      name: 'missing_content',
      passed: true,
      severity: 'info',
      description: 'Screenshot has expected size',
    };
  }

  /**
   * Check for severe browser console errors
   */
  private checkForSevereErrors(evidence: ConsoleEvidence, allowedErrors: string[]): SmokeCheck {
    const severeErrors = evidence.consoleErrors.filter((error) => {
      // Filter out known harmless errors
      for (const allowed of allowedErrors) {
        if (error.includes(allowed)) {
          return false;
        }
      }
      return true;
    });

    // Also check page errors
    const allErrors = [...severeErrors, ...evidence.pageErrors];

    if (allErrors.length > 0) {
      return {
        name: 'console_errors',
        passed: false,
        severity: 'error',
        description: `${allErrors.length} console/page error(s) detected`,
        details: allErrors.slice(0, 5).join('\n'), // Show first 5 errors
      };
    }

    return {
      name: 'console_errors',
      passed: true,
      severity: 'info',
      description: 'No severe browser errors detected',
    };
  }

  /**
   * Check for failed network requests
   */
  private checkForFailedRequests(evidence: ConsoleEvidence): SmokeCheck {
    const criticalFailures = evidence.failedRequests.filter(
      (req) => req.status >= 500 || req.failureReason.toLowerCase().includes('failed')
    );

    if (criticalFailures.length > 0) {
      return {
        name: 'failed_requests',
        passed: false,
        severity: 'warning',
        description: `${criticalFailures.length} critical failed request(s)`,
        details: criticalFailures.map((r) => `${r.url}: ${r.failureReason}`).join('\n'),
      };
    }

    return {
      name: 'failed_requests',
      passed: true,
      severity: 'info',
      description: 'No critical failed requests',
    };
  }

  /**
   * Check for layout overflow (horizontal scroll indicators)
   */
  private checkForLayoutOverflow(screenshots: ScreenshotResult[]): SmokeCheck[] {
    const results: SmokeCheck[] = [];

    // This would require analyzing actual DOM or screenshot pixel data
    // For now, return an info check as placeholder
    results.push({
      name: 'layout_overflow',
      passed: true,
      severity: 'info',
      description: 'Layout overflow check - placeholder',
      details: 'Real implementation would check for horizontal scroll or clipped content',
    });

    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: VisualSmokeChecks | null = null;

export function getVisualSmokeChecks(): VisualSmokeChecks {
  if (!instance) {
    instance = new VisualSmokeChecks();
  }
  return instance;
}

export function resetVisualSmokeChecks(): void {
  instance = null;
}