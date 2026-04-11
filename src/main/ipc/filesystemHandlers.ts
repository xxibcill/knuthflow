import { ipcMain, BrowserWindow, dialog, IpcMainInvokeEvent } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export function registerFilesystemHandlers(mainWindowGetter: () => BrowserWindow | null): void {
  ipcMain.handle('filesystem:readFile', async (_event: IpcMainInvokeEvent, filePath: string, encoding = 'utf-8') => {
    return fs.readFileSync(filePath, encoding as BufferEncoding);
  });

  ipcMain.handle('filesystem:writeFile', async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  });

  ipcMain.handle('filesystem:exists', async (_event: IpcMainInvokeEvent, filePath: string) => {
    return fs.existsSync(filePath);
  });

  ipcMain.handle('dialog:openFile', async (_event: IpcMainInvokeEvent, options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await dialog.showOpenDialog(mainWindowGetter()!, {
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Source Code', extensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'css', 'html'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, filePath: null };
    }

    return { canceled: false, filePath: result.filePaths[0] };
  });

  ipcMain.handle('dialog:openDirectory', async (_event: IpcMainInvokeEvent, options?: { defaultPath?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await dialog.showOpenDialog(mainWindowGetter()!, {
      defaultPath: options?.defaultPath,
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, directoryPath: null };
    }

    return { canceled: false, directoryPath: result.filePaths[0] };
  });

  ipcMain.handle('dialog:saveFile', async (_event: IpcMainInvokeEvent, options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await dialog.showSaveDialog(mainWindowGetter()!, {
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true, filePath: null };
    }

    return { canceled: false, filePath: result.filePath };
  });
}
