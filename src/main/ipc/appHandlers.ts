import { ipcMain, app } from 'electron';

export function registerAppHandlers(): void {
  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion();
  });
}
