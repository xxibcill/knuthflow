import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database';

export function registerSessionHandlers(): void {
  ipcMain.handle('session:create', async (_event: IpcMainInvokeEvent, name: string, workspaceId: string | null, runId: string | null, ptySessionId: string | null) => {
    const db = getDatabase();
    const id = `sess-${crypto.randomUUID()}`;
    const session = db.createSession({ id, name, workspaceId, runId, ptySessionId });
    return session;
  });

  ipcMain.handle('session:get', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.getSession(id);
  });

  ipcMain.handle('session:updateEnd', async (_event: IpcMainInvokeEvent, id: string, status: 'completed' | 'failed', exitCode: number | null, signal: number | null) => {
    const db = getDatabase();
    db.updateSessionEnd(id, status, exitCode, signal);
  });

  ipcMain.handle('session:list', async (_event: IpcMainInvokeEvent, limit = 50) => {
    const db = getDatabase();
    return db.listSessions(limit);
  });

  ipcMain.handle('session:listRecent', async (_event: IpcMainInvokeEvent, workspaceId: string | null, limit = 20) => {
    const db = getDatabase();
    return db.listRecentSessions(workspaceId, limit);
  });

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ipcMain.handle('session:listActive', async (_event: IpcMainInvokeEvent) => {
    const db = getDatabase();
    return db.listActiveSessions();
  });
}
