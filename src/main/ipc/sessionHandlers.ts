import { ipcMain } from 'electron';
import { getDatabase } from '../database';

export function registerSessionHandlers(): void {
  ipcMain.handle('session:create', async (_event, name: string, workspaceId: string | null, runId: string | null, ptySessionId: string | null) => {
    const db = getDatabase();
    const id = `sess-${crypto.randomUUID()}`;
    const session = db.createSession({ id, name, workspaceId, runId, ptySessionId });
    return session;
  });

  ipcMain.handle('session:get', async (_event, id: string) => {
    const db = getDatabase();
    return db.getSession(id);
  });

  ipcMain.handle('session:updateEnd', async (_event, id: string, status: 'completed' | 'failed', exitCode: number | null, signal: number | null) => {
    const db = getDatabase();
    db.updateSessionEnd(id, status, exitCode, signal);
  });

  ipcMain.handle('session:list', async (_event, limit = 50) => {
    const db = getDatabase();
    return db.listSessions(limit);
  });

  ipcMain.handle('session:listRecent', async (_event, workspaceId: string | null, limit = 20) => {
    const db = getDatabase();
    return db.listRecentSessions(workspaceId, limit);
  });

  ipcMain.handle('session:listActive', async () => {
    const db = getDatabase();
    return db.listActiveSessions();
  });
}
