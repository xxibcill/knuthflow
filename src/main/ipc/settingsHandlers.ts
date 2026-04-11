import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDatabase, AppSettings } from '../database';

const VALID_SETTING_KEYS: (keyof AppSettings)[] = [
  'cliPath', 'defaultArgs', 'launchOnStartup', 'restoreLastWorkspace',
  'defaultWorkspaceId', 'confirmBeforeExit', 'confirmBeforeKill', 'autoSaveSessions',
  'fontSize', 'fontFamily', 'cursorStyle', 'showTabBar', 'showStatusBar', 'theme'
];

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_event: IpcMainInvokeEvent, key: string) => {
    const db = getDatabase();
    return db.getSetting(key as keyof AppSettings);
  });

  ipcMain.handle('settings:set', async (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
    const db = getDatabase();
    if (!VALID_SETTING_KEYS.includes(key as keyof AppSettings)) {
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
    for (const [key, value] of Object.entries(settings)) {
      if (VALID_SETTING_KEYS.includes(key as keyof AppSettings)) {
        db.setSetting(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
      }
    }
  });
}
