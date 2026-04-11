import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDatabase, AppSettings } from '../database';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_event: IpcMainInvokeEvent, key: string) => {
    const db = getDatabase();
    return db.getSetting(key as keyof AppSettings);
  });

  ipcMain.handle('settings:set', async (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
    const db = getDatabase();
    const validKeys: (keyof AppSettings)[] = [
      'cliPath', 'defaultArgs', 'launchOnStartup', 'restoreLastWorkspace',
      'defaultWorkspaceId', 'confirmBeforeExit', 'confirmBeforeKill', 'autoSaveSessions',
      'fontSize', 'fontFamily', 'cursorStyle', 'showTabBar', 'showStatusBar', 'theme'
    ];
    if (!validKeys.includes(key as keyof AppSettings)) {
      throw new Error(`Invalid settings key: ${key}`);
    }
    db.setSetting(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
  });

  ipcMain.handle('settings:getAll', async (_event: IpcMainInvokeEvent) => {
    const db = getDatabase();
    return db.getAllSettings();
  });

  ipcMain.handle('settings:setAll', async (_event: IpcMainInvokeEvent, settings: Partial<AppSettings>) => {
    const db = getDatabase();
    const validKeys: (keyof AppSettings)[] = [
      'cliPath', 'defaultArgs', 'launchOnStartup', 'restoreLastWorkspace',
      'defaultWorkspaceId', 'confirmBeforeExit', 'confirmBeforeKill', 'autoSaveSessions',
      'fontSize', 'fontFamily', 'cursorStyle', 'showTabBar', 'showStatusBar', 'theme'
    ];
    for (const [key, value] of Object.entries(settings)) {
      if (validKeys.includes(key as keyof AppSettings)) {
        db.setSetting(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
      }
    }
  });
}
