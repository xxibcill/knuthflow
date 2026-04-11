import { app, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const existsAsync = promisify(fs.existsSync);

const getStoragePath = () => {
  return path.join(app.getPath('userData'), 'storage.json');
};

const readStorage = async (): Promise<Record<string, unknown>> => {
  const storagePath = getStoragePath();
  try {
    const exists = await existsAsync(storagePath);
    if (exists) {
      const content = await readFileAsync(storagePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Return empty object if file doesn't exist or is corrupted
  }
  return {};
};

const writeStorage = async (data: Record<string, unknown>): Promise<void> => {
  const storagePath = getStoragePath();
  await writeFileAsync(storagePath, JSON.stringify(data, null, 2), 'utf-8');
};

export function registerStorageHandlers(): void {
  ipcMain.handle('storage:get', async (_event: IpcMainInvokeEvent, key: string) => {
    const storage = await readStorage();
    return storage[key];
  });

  ipcMain.handle('storage:set', async (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
    const storage = await readStorage();
    storage[key] = value;
    await writeStorage(storage);
  });

  ipcMain.handle('storage:delete', async (_event: IpcMainInvokeEvent, key: string) => {
    const storage = await readStorage();
    delete storage[key];
    await writeStorage(storage);
  });
}
