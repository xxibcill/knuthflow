import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getSupervisor } from '../supervisor';

export function registerSupervisorHandlers(): void {
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ipcMain.handle('supervisor:validateIntegrity', async (_event: IpcMainInvokeEvent) => {
    const supervisor = getSupervisor();
    return supervisor.validateSessionIntegrity();
  });

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ipcMain.handle('supervisor:cleanupOrphans', async (_event: IpcMainInvokeEvent) => {
    const supervisor = getSupervisor();
    supervisor.cleanupOrphanedSessions();
    return { success: true };
  });

  ipcMain.handle('supervisor:explainExit', async (_event: IpcMainInvokeEvent, exitCode: number | null, signal?: number) => {
    const supervisor = getSupervisor();
    return supervisor.explainExit(exitCode, signal ?? undefined);
  });
}
