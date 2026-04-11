import { ipcMain } from 'electron';
import { getSupervisor } from '../supervisor';

export function registerSupervisorHandlers(): void {
  ipcMain.handle('supervisor:validateIntegrity', async () => {
    const supervisor = getSupervisor();
    return supervisor.validateSessionIntegrity();
  });

  ipcMain.handle('supervisor:cleanupOrphans', async () => {
    const supervisor = getSupervisor();
    supervisor.cleanupOrphanedSessions();
    return { success: true };
  });

  ipcMain.handle('supervisor:explainExit', async (_event, exitCode: number | null, signal?: number) => {
    const supervisor = getSupervisor();
    return supervisor.explainExit(exitCode, signal ?? undefined);
  });
}
