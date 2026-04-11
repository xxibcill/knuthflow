import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDatabase, LaunchProfile } from '../database';

export function registerProfileHandlers(): void {
  ipcMain.handle('profile:create', async (_event: IpcMainInvokeEvent, profile: Omit<LaunchProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = getDatabase();
    const id = `profile-${crypto.randomUUID()}`;
    return db.createProfile({ id, ...profile });
  });

  ipcMain.handle('profile:get', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.getProfile(id);
  });

  ipcMain.handle('profile:getDefault', async (_event: IpcMainInvokeEvent) => {
    const db = getDatabase();
    return db.getDefaultProfile();
  });

  ipcMain.handle('profile:list', async (_event: IpcMainInvokeEvent) => {
    const db = getDatabase();
    return db.listProfiles();
  });

  ipcMain.handle('profile:update', async (_event: IpcMainInvokeEvent, id: string, updates: Partial<Omit<LaunchProfile, 'id' | 'createdAt'>>) => {
    const db = getDatabase();
    return db.updateProfile(id, updates);
  });

  ipcMain.handle('profile:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.deleteProfile(id);
  });
}
