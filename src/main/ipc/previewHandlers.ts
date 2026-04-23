import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { getPreviewCommandDetector } from '../ralph/previewCommandDetector';
import { getPreviewProcessManager } from '../ralph/previewProcessManager';
import { getPreviewEvidenceCapturer } from '../ralph/previewEvidenceCapturer';
import { getVisualSmokeChecks } from '../ralph/visualSmokeChecks';
import { createArtifact } from '../ralph/ralphArtifact';

/**
 * Register handlers for preview command detection and visual validation
 */
export function registerPreviewHandlers(): void {
  const detector = getPreviewCommandDetector();
  const processManager = getPreviewProcessManager();
  const capturer = getPreviewEvidenceCapturer();
  const smokeChecks = getVisualSmokeChecks();

  // ─────────────────────────────────────────────────────────────────────────
  // Preview Command Detection
  // ─────────────────────────────────────────────────────────────────────────

  ipcMain.handle('preview:detectCommand', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    config?: {
      blueprintPreviewCommand?: string;
      ralphProjectPreviewCommand?: string;
      forcedPort?: number;
      forcedRoutes?: string[];
    }
  ) => {
    try {
      const result = detector.detect(workspacePath, config);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Preview Process Management
  // ─────────────────────────────────────────────────────────────────────────

  ipcMain.handle('preview:startPreview', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    config?: {
      blueprintPreviewCommand?: string;
      ralphProjectPreviewCommand?: string;
      forcedPort?: number;
      forcedRoutes?: string[];
    }
  ) => {
    try {
      // First detect the preview command
      const detection = detector.detect(workspacePath, config);

      if (!detection.found || !detection.preview) {
        return {
          success: false,
          error: detection.reason,
          suggestion: detection.suggestion ?? undefined
        };
      }

      // Start the preview process
      const previewProcess = await processManager.startPreview(detection.preview);

      // Wait for it to be ready
      const url = await previewProcess.readyPromise;

      return {
        success: true,
        result: {
          processId: previewProcess.id,
          url,
          port: previewProcess.port,
          command: previewProcess.command.command,
          logs: previewProcess.logs,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('preview:stopPreview', async (
    _event: IpcMainInvokeEvent,
    processId: string
  ) => {
    try {
      await processManager.stopPreview(processId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('preview:getProcessStatus', async (
    _event: IpcMainInvokeEvent,
    processId: string
  ) => {
    try {
      const process = processManager.getProcess(processId);
      if (!process) {
        return { success: false, error: 'Process not found' };
      }

      return {
        success: true,
        result: {
          id: process.id,
          status: process.status,
          port: process.port,
          pid: process.pid,
          startupTimeMs: process.startupTimeMs,
          url: processManager.getProcessUrl(processId),
          error: process.error,
          logs: process.logs,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('preview:stopAllPreviews', async (_event: IpcMainInvokeEvent) => {
    try {
      await processManager.stopAll();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Screenshot and Visual Evidence Capture
  // ─────────────────────────────────────────────────────────────────────────

  ipcMain.handle('preview:captureEvidence', async (
    _event: IpcMainInvokeEvent,
    previewUrl: string,
    routes: string[],
    viewports?: ('desktop' | 'mobile' | 'tablet')[]
  ) => {
    try {
      const result = await capturer.captureEvidence(
        previewUrl,
        routes,
        viewports ?? ['desktop', 'mobile']
      );

      return {
        success: true,
        result: {
          ...result,
          screenshots: result.screenshots.map((s) => ({
            ...s,
            screenshotBase64: s.screenshotBase64 ? '[BASE64_DATA]' : null,
          })),
        },
        skipped: result.skipped,
        skipReason: result.skipReason,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('preview:captureAndStoreEvidence', async (
    _event: IpcMainInvokeEvent,
    projectId: string,
    runId: string,
    iteration: number,
    previewUrl: string,
    routes: string[],
    viewports?: ('desktop' | 'mobile' | 'tablet')[]
  ) => {
    try {
      // Capture evidence
      const evidence = await capturer.captureEvidence(
        previewUrl,
        routes,
        viewports ?? ['desktop', 'mobile']
      );

      if (evidence.skipped) {
        return {
          success: true,
          result: {
            screenshots: [],
            consoleEvidence: evidence.consoleEvidence,
            routes,
            viewports,
            skipped: true,
            skipReason: evidence.skipReason,
          },
        };
      }

      // Store screenshots as artifacts
      const screenshotArtifacts = [];
      for (const screenshot of evidence.screenshots) {
        if (screenshot.screenshotBase64) {
          const artifact = createArtifact({
            projectId,
            runId,
            iteration,
            itemId: null,
            type: 'preview_screenshot',
            content: screenshot.screenshotBase64,
            exitCode: screenshot.errors.length > 0 ? 1 : 0,
            durationMs: screenshot.durationMs,
            severity: screenshot.errors.length > 0 ? 'error' : 'info',
            metadata: {
              route: screenshot.route,
              viewport: screenshot.viewport,
              timestamp: screenshot.timestamp,
              errors: screenshot.errors,
              warnings: screenshot.warnings,
            },
          });
          screenshotArtifacts.push(artifact);
        }
      }

      // Run visual smoke checks
      const smokeCheckResult = smokeChecks.runChecks(evidence.screenshots, evidence.consoleEvidence);

      // Store smoke check result as artifact (stored for audit trail, summary returned in result)
      createArtifact({
        projectId,
        runId,
        iteration,
        itemId: null,
        type: 'visual_smoke_check',
        content: JSON.stringify(smokeCheckResult),
        exitCode: smokeCheckResult.passed ? 0 : 1,
        durationMs: smokeCheckResult.durationMs,
        severity: smokeCheckResult.passed ? 'info' : 'error',
        metadata: {
          checks: smokeCheckResult.checks.map((c) => ({
            name: c.name,
            passed: c.passed,
            severity: c.severity,
          })),
          routes,
          viewports,
          timestamp: smokeCheckResult.timestamp,
        },
      });

      // Store console evidence as artifact
      const consoleArtifact = createArtifact({
        projectId,
        runId,
        iteration,
        itemId: null,
        type: 'console_evidence',
        content: JSON.stringify(evidence.consoleEvidence),
        exitCode: evidence.consoleEvidence.some((e) => e.consoleErrors.length > 0 || e.pageErrors.length > 0) ? 1 : 0,
        durationMs: null,
        severity: evidence.consoleEvidence.some((e) => e.consoleErrors.length > 0) ? 'warning' : 'info',
        metadata: {
          routes,
          viewports,
          totalErrors: evidence.consoleEvidence.reduce((sum, e) => sum + e.consoleErrors.length, 0),
          totalPageErrors: evidence.consoleEvidence.reduce((sum, e) => sum + e.pageErrors.length, 0),
          totalFailedRequests: evidence.consoleEvidence.reduce((sum, e) => sum + e.failedRequests.length, 0),
        },
      });

      return {
        success: true,
        result: {
          screenshots: screenshotArtifacts.map((a) => ({
            id: a.id,
            route: a.metadata.route as string,
            viewport: a.metadata.viewport as string,
            timestamp: a.metadata.timestamp as number,
            passed: a.severity !== 'error',
          })),
          smokeCheck: {
            passed: smokeCheckResult.passed,
            checks: smokeCheckResult.checks.length,
            errors: smokeCheckResult.errors.length,
            warnings: smokeCheckResult.warnings.length,
          },
          consoleEvidence: {
            artifactId: consoleArtifact.id,
            totalErrors: evidence.consoleEvidence.reduce((sum, e) => sum + e.consoleErrors.length, 0),
          },
          skipped: false,
          skipReason: null,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Visual Smoke Checks
  // ─────────────────────────────────────────────────────────────────────────

  ipcMain.handle('preview:runVisualSmokeChecks', async (
    _event: IpcMainInvokeEvent,
    screenshots: Array<{ route: string; viewport: string; screenshotBase64: string | null; errors: Array<{ code: string; message: string }>; warnings: Array<{ code: string; message: string }> }>,
    consoleEvidence: Array<{ route: string; viewport: string; consoleErrors: string[]; consoleWarnings: string[]; pageErrors: string[]; failedRequests: Array<{ url: string; status: number; failureReason: string }> }>,
    options?: { checkOverflow?: boolean; allowedConsoleErrors?: string[] }
  ) => {
    try {
      const result = smokeChecks.runChecks(
        screenshots as any,
        consoleEvidence as any,
        options
      );

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}