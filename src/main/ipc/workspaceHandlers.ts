import { ipcMain } from 'electron';
import * as fs from 'fs';
import { getDatabase } from '../database';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:create', async (_event, name: string, workspacePath: string) => {
    const db = getDatabase();
    const workspace = db.getWorkspaceByPath(workspacePath);
    if (workspace) {
      return { success: false, error: 'Workspace with this path already exists' };
    }
    const id = `ws-${crypto.randomUUID()}`;
    const created = db.createWorkspace({ id, name, path: workspacePath });
    return { success: true, workspace: created };
  });

  ipcMain.handle('workspace:get', async (_event, id: string) => {
    const db = getDatabase();
    return db.getWorkspace(id);
  });

  ipcMain.handle('workspace:list', async () => {
    const db = getDatabase();
    return db.listWorkspaces();
  });

  ipcMain.handle('workspace:listRecent', async (_event, limit = 10) => {
    const db = getDatabase();
    return db.listRecentWorkspaces(limit);
  });

  ipcMain.handle('workspace:updateLastOpened', async (_event, id: string) => {
    const db = getDatabase();
    db.updateWorkspaceLastOpened(id);
  });

  ipcMain.handle('workspace:delete', async (_event, id: string) => {
    const db = getDatabase();
    db.deleteWorkspace(id);
  });

  ipcMain.handle('workspace:validatePath', async (_event, workspacePath: string) => {
    try {
      const exists = fs.existsSync(workspacePath);
      if (!exists) {
        return { valid: false, error: 'Path does not exist' };
      }
      const stats = fs.statSync(workspacePath);
      if (!stats.isDirectory()) {
        return { valid: false, error: 'Path is not a directory' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'Unable to access path' };
    }
  });
}
