import { ipcMain, app } from 'electron';
import { getLogManager, LogLevel } from '../logManager';
import { getSecureStorage } from '../secureStorage';
import { getDatabase } from '../database';
import { detectClaudeCode } from '../utils/claudeDetection';

export function registerLogsHandlers(): void {
  ipcMain.handle('logs:get', async (_event, limit?: number, level?: string) => {
    const logManager = getLogManager();
    if (level && Object.values(LogLevel).includes(level as LogLevel)) {
      return logManager.getLogs(limit, level as LogLevel);
    }
    return logManager.getLogs(limit);
  });

  ipcMain.handle('logs:getByCategory', async (_event, category: string, limit?: number) => {
    const logManager = getLogManager();
    return logManager.getLogsByCategory(category, limit);
  });

  ipcMain.handle('logs:export', async (_event, format?: 'json' | 'text') => {
    const logManager = getLogManager();
    return logManager.exportLogs(format || 'json');
  });

  ipcMain.handle('logs:getFilePaths', async () => {
    const logManager = getLogManager();
    return logManager.getLogFilePaths();
  });

  ipcMain.handle('logs:clear', async () => {
    const logManager = getLogManager();
    logManager.clearLogs();
    return true;
  });

  ipcMain.handle('diagnostics:getSystemInfo', async () => {
    const logManager = getLogManager();

    // Get Claude Code detection info
    const claudeDetection = detectClaudeCode();

    // Get app info
    const appInfo = {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
    };

    // Get storage backend info
    const storage = getSecureStorage();
    const usingFallback = storage.isUsingFallback();

    // Get database size
    const db = getDatabase();
    const workspaces = db.listWorkspaces();
    const sessions = db.listSessions(10);

    logManager.info('diagnostics', 'System info requested', {
      claudeInstalled: claudeDetection.installed,
      appVersion: appInfo.version,
    });

    return {
      app: appInfo,
      claude: {
        installed: claudeDetection.installed,
        path: claudeDetection.executablePath,
        version: claudeDetection.version,
        error: claudeDetection.error,
      },
      storage: {
        usingFallback,
        backend: process.platform === 'darwin' ? 'Keychain' : 'Encrypted File',
      },
      database: {
        workspaceCount: workspaces.length,
        recentSessionCount: sessions.length,
      },
      logFiles: logManager.getLogFilePaths(),
    };
  });
}
