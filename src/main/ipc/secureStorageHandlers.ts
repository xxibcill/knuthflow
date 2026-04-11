import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getSecureStorage } from '../secureStorage';

export function registerSecureStorageHandlers(): void {
  ipcMain.handle('secureStorage:get', async (_event: IpcMainInvokeEvent, key: string) => {
    const storage = getSecureStorage();
    return storage.get(key);
  });

  ipcMain.handle('secureStorage:set', async (_event: IpcMainInvokeEvent, key: string, value: string) => {
    const storage = getSecureStorage();
    return storage.set(key, value);
  });

  ipcMain.handle('secureStorage:delete', async (_event: IpcMainInvokeEvent, key: string) => {
    const storage = getSecureStorage();
    return storage.delete(key);
  });

  ipcMain.handle('secureStorage:isUsingFallback', async (_event: IpcMainInvokeEvent) => {
    const storage = getSecureStorage();
    return storage.isUsingFallback();
  });
}
