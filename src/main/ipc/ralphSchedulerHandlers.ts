import { ipcMain } from 'electron';
import { getRalphScheduler } from '../ralphScheduler';

export function registerRalphSchedulerHandlers(): void {
  ipcMain.handle('ralphScheduler:parsePlan', async (_event, workspacePath: string) => {
    try {
      const scheduler = getRalphScheduler(workspacePath);
      const tasks = scheduler.parseFixPlan();
      return { success: true, tasks };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphScheduler:selectNextItem', async (_event, workspacePath: string) => {
    try {
      const scheduler = getRalphScheduler(workspacePath);
      const item = scheduler.selectNextItem();
      return { success: true, item };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphScheduler:getPendingItems', async (_event, workspacePath: string) => {
    try {
      const scheduler = getRalphScheduler(workspacePath);
      const items = scheduler.getPendingItems();
      return { success: true, items };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphScheduler:completeItem', async (_event, workspacePath: string, itemId: string) => {
    try {
      // Validate inputs
      if (!itemId || typeof itemId !== 'string' || itemId.length > 200) {
        return { success: false, error: 'Invalid itemId' };
      }
      const scheduler = getRalphScheduler(workspacePath);
      const success = scheduler.completeItem(itemId);
      return { success };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphScheduler:deferItem', async (_event, workspacePath: string, itemId: string, reason?: string) => {
    try {
      // Validate inputs
      if (!itemId || typeof itemId !== 'string' || itemId.length > 200) {
        return { success: false, error: 'Invalid itemId' };
      }
      const scheduler = getRalphScheduler(workspacePath);
      const success = scheduler.deferItem(itemId, reason);
      return { success };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('ralphScheduler:determineAcceptanceGate', async (_event, workspacePath: string, itemId: string) => {
    try {
      // Validate inputs
      if (!itemId || typeof itemId !== 'string' || itemId.length > 200) {
        return { success: false, error: 'Invalid itemId' };
      }
      const scheduler = getRalphScheduler(workspacePath);
      const pendingItems = scheduler.getPendingItems();
      const item = pendingItems.find(i => i.id === itemId);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }
      const gate = scheduler.determineAcceptanceGate(item);
      return { success: true, gate };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
