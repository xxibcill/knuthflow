import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { getPtyManager, PtyOptions } from '../ptyManager';

const ptyManager = getPtyManager();

export function registerPtyHandlers(mainWindowGetter: () => BrowserWindow | null): void {
  ipcMain.handle('pty:create', async (_event: IpcMainInvokeEvent, options?: PtyOptions) => {
    return ptyManager.create(options || {});
  });

  ipcMain.handle('pty:write', async (_event: IpcMainInvokeEvent, sessionId: string, data: string) => {
    return ptyManager.write(sessionId, data);
  });

  ipcMain.handle('pty:resize', async (_event: IpcMainInvokeEvent, sessionId: string, cols: number, rows: number) => {
    return ptyManager.resize(sessionId, cols, rows);
  });

  ipcMain.handle('pty:kill', async (_event: IpcMainInvokeEvent, sessionId: string, signal?: string) => {
    return ptyManager.kill(sessionId, signal);
  });

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ipcMain.handle('pty:list', async (_event: IpcMainInvokeEvent) => {
    return ptyManager.list().map(session => ({
      id: session.id,
      pid: session.pty.pid,
      createdAt: session.createdAt,
    }));
  });

  // Forward PTY data events to renderer
  ptyManager.on('data', ({ sessionId, data }: { sessionId: string; data: string }) => {
    const mainWindow = mainWindowGetter();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty:data', { sessionId, data });
    }
  });

  // Forward PTY exit events to renderer
  ptyManager.on('exit', ({ sessionId, exitCode, signal }: { sessionId: string; exitCode: number; signal?: number }) => {
    const mainWindow = mainWindowGetter();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty:exit', { sessionId, exitCode, signal });
    }
  });

  // Forward PTY errors to renderer
  ptyManager.on('error', ({ sessionId, error }: { sessionId: string; error: Error }) => {
    const mainWindow = mainWindowGetter();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty:error', { sessionId, error: error.message });
    }
  });
}

export { ptyManager };
