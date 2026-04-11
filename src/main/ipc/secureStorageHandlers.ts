import { ipcMain } from 'electron';
import { getSecureStorage } from '../secureStorage';

export function registerSecureStorageHandlers(): void {
  ipcMain.handle('secureStorage:get', async (_event, key: string) => {
    const storage = getSecureStorage();
    return storage.get(key);
  });

  ipcMain.handle('secureStorage:set', async (_event, key: string, value: string) => {
    const storage = getSecureStorage();
    return storage.set(key, value);
  });

  ipcMain.handle('secureStorage:delete', async (_event, key: string) => {
    const storage = getSecureStorage();
    return storage.delete(key);
  });

  ipcMain.handle('secureStorage:isUsingFallback', async () => {
    const storage = getSecureStorage();
    return storage.isUsingFallback();
  });
}
