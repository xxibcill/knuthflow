import { ipcMain } from 'electron';
import { getRalphSafety } from '../ralphSafety';

export function registerRalphSafetyHandlers(): void {
  ipcMain.handle('ralphSafety:canExecute', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      return safety.canExecute(projectId);
    } catch (error) {
      return { allowed: false, reason: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:recordCall', async (_event, projectId: string, tokensUsed?: number) => {
    try {
      const safety = getRalphSafety(projectId);
      safety.recordCall(projectId, tokensUsed ?? 0);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:recordFailure', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      safety.recordFailure(projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:recordNoProgress', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      safety.recordNoProgress(projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:recordPermissionDenial', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      safety.recordPermissionDenial(projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:getRateLimitState', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      return { success: true, state: safety.getRateLimitState(projectId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:getCircuitBreakerState', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      return { success: true, state: safety.getCircuitBreakerState(projectId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:isCircuitOpen', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      return { success: true, isOpen: safety.isCircuitOpen(projectId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:resetCircuit', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      safety.resetCircuit(projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphSafety:getSafetyState', async (_event, projectId: string) => {
    try {
      const safety = getRalphSafety(projectId);
      return { success: true, state: safety.getSafetyState(projectId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
