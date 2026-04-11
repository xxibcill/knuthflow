import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { StopReason, VALID_STOP_REASONS } from '../../shared/ralphTypes';
import {
  getRalphRuntime,
  getRuntimeForRunId,
} from '../index';

function isValidStopReason(reason: string): reason is StopReason {
  return VALID_STOP_REASONS.includes(reason as StopReason);
}

export function registerRalphRuntimeHandlers(): void {
  ipcMain.handle('ralphRuntime:start', async (_event: IpcMainInvokeEvent, projectId: string, name: string, sessionId: string, ptySessionId: string) => {
    try {
      const runtime = getRalphRuntime(projectId);
      const run = runtime.start(projectId, name, sessionId, ptySessionId);
      return { success: true, run };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphRuntime:pause', async (_event: IpcMainInvokeEvent, runId: string) => {
    try {
      const runtime = getRuntimeForRunId(runId);
      if (runtime && runtime.ownsRun(runId)) {
        runtime.pause(runId);
        return { success: true };
      }
      return { success: false, error: 'Run not found' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphRuntime:resume', async (_event: IpcMainInvokeEvent, runId: string) => {
    try {
      const runtime = getRuntimeForRunId(runId);
      if (runtime && runtime.ownsRun(runId)) {
        runtime.resume(runId);
        return { success: true };
      }
      return { success: false, error: 'Run not found' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphRuntime:stop', async (_event: IpcMainInvokeEvent, runId: string, reason: string, message: string, canResume?: boolean) => {
    try {
      if (!isValidStopReason(reason)) {
        return { success: false, error: `Invalid stop reason: ${reason}` };
      }
      const runtime = getRuntimeForRunId(runId);
      if (runtime && runtime.ownsRun(runId)) {
        runtime.stop(runId, reason, message, canResume ?? false);
        return { success: true };
      }
      return { success: false, error: 'Run not found' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphRuntime:getState', async (_event: IpcMainInvokeEvent, runId: string) => {
    try {
      const runtime = getRuntimeForRunId(runId);
      if (runtime && runtime.ownsRun(runId)) {
        return {
          success: true,
          state: runtime.getRuntimeState(runId),
          context: runtime.getCurrentContext(runId),
          safetyStop: runtime.getSafetyStop(runId),
        };
      }
      return { success: false, error: 'Run not found' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphRuntime:getActiveRun', async (_event: IpcMainInvokeEvent, projectId: string) => {
    try {
      const runtime = getRalphRuntime(projectId);
      return { success: true, run: runtime.getActiveRunForProject(projectId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
