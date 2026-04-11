import { app, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const getStoragePath = () => {
  return path.join(app.getPath('userData'), 'storage.json');
};

const readStorage = (): Record<string, unknown> => {
  const storagePath = getStoragePath();
  try {
    if (fs.existsSync(storagePath)) {
      const content = fs.readFileSync(storagePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Return empty object if file doesn't exist or is corrupted
  }
  return {};
};

const writeStorage = (data: Record<string, unknown>): void => {
  const storagePath = getStoragePath();
  fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf-8');
};

export function registerStorageHandlers(): void {
  ipcMain.handle('storage:get', async (_event: IpcMainInvokeEvent, key: string) => {
    const storage = readStorage();
    return storage[key];
  });

  ipcMain.handle('storage:set', async (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
    const storage = readStorage();
    storage[key] = value;
    writeStorage(storage);
  });

  ipcMain.handle('storage:delete', async (_event: IpcMainInvokeEvent, key: string) => {
    const storage = readStorage();
    delete storage[key];
    writeStorage(storage);
  });
}
