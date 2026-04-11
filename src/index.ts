import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess, execSync } from 'child_process';
import { getPtyManager, PtyOptions } from './main/ptyManager';
import { getDatabase, closeDatabase, Workspace, Session, AppSettings, LaunchProfile } from './main/database';
import { getSupervisor, resetSupervisor } from './main/supervisor';
import { registerUpdateHandlers } from './main/updateManager';
import { getSecureStorage } from './main/secureStorage';
import { getLogManager, LogLevel, LogEntry } from './main/logManager';
import { getRalphBootstrap, resetRalphBootstrap, RalphBootstrap } from './main/ralphBootstrap';
import { getRalphValidator, resetRalphValidator, RalphValidator } from './main/ralphValidator';

// Webpack magic constants
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Active processes tracked by PID
const activeProcesses: Map<number, ChildProcess> = new Map();

// Window reference for IPC
let mainWindow: BrowserWindow | null = null;

// Test isolation: allow overriding user data path via environment variable
const testUserDataPath = process.env.KNUTHFLOW_USER_DATA_DIR;
if (testUserDataPath) {
  fs.mkdirSync(testUserDataPath, { recursive: true });
  app.setPath('userData', testUserDataPath);
}

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation Constraints - Prevent renderer from navigating to untrusted origins
  // ─────────────────────────────────────────────────────────────────────────────

  // Block window.open calls from renderer
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Block renderer from navigating to arbitrary URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    // Only allow navigation within the app's origin
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Process Management
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('process:spawn', async (_event, args: string[], cwd?: string) => {
  const spawned = spawn('claude', args, {
    cwd: cwd || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeProcesses.set(spawned.pid!, spawned);

  // Clean up when process exits
  spawned.on('exit', () => {
    activeProcesses.delete(spawned.pid!);
  });

  return { pid: spawned.pid! };
});

ipcMain.handle('process:send', async (_event, pid: number, input: string) => {
  const proc = activeProcesses.get(pid);
  if (proc && proc.stdin) {
    proc.stdin.write(input);
  }
});

ipcMain.handle('process:kill', async (_event, pid: number) => {
  const proc = activeProcesses.get(pid);
  if (proc) {
    proc.kill();
    activeProcesses.delete(pid);
  }
});

ipcMain.handle('process:list', async () => {
  return Array.from(activeProcesses.entries()).map(([pid, proc]) => ({
    pid,
    status: proc.killed ? 'dead' : 'running',
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - PTY Management
// ─────────────────────────────────────────────────────────────────────────────

const ptyManager = getPtyManager();

ipcMain.handle('pty:create', async (_event, options?: PtyOptions) => {
  return ptyManager.create(options || {});
});

ipcMain.handle('pty:write', async (_event, sessionId: string, data: string) => {
  return ptyManager.write(sessionId, data);
});

ipcMain.handle('pty:resize', async (_event, sessionId: string, cols: number, rows: number) => {
  return ptyManager.resize(sessionId, cols, rows);
});

ipcMain.handle('pty:kill', async (_event, sessionId: string, signal?: string) => {
  return ptyManager.kill(sessionId, signal);
});

ipcMain.handle('pty:list', async () => {
  return ptyManager.list().map(session => ({
    id: session.id,
    pid: session.pty.pid,
    createdAt: session.createdAt,
  }));
});

// Forward PTY data events to renderer
ptyManager.on('data', ({ sessionId, data }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pty:data', { sessionId, data });
  }
});

// Forward PTY exit events to renderer
ptyManager.on('exit', ({ sessionId, exitCode, signal }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pty:exit', { sessionId, exitCode, signal });
  }
});

// Forward PTY errors to renderer
ptyManager.on('error', ({ sessionId, error }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pty:error', { sessionId, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Claude Code Launch
// ─────────────────────────────────────────────────────────────────────────────

export type ClaudeRunState = 'idle' | 'starting' | 'running' | 'exited' | 'failed';

interface ActiveRun {
  sessionId: string;
  state: ClaudeRunState;
  exitCode?: number;
  signal?: number;
  error?: string;
}

const activeRuns: Map<string, ActiveRun> = new Map();
const MAX_ACTIVE_RUNS = 100;

ipcMain.handle('claude:launch', async (_event, args: string[] = []) => {
  // First detect Claude Code
  const detection = detectClaudeCode();
  if (!detection.installed || !detection.executablePath) {
    return { success: false, error: detection.error || 'Claude Code not installed' };
  }

  const runId = `run-${crypto.randomUUID()}`;
  const sessionId = ptyManager.create({
    cwd: process.cwd(),
    cols: 80,
    rows: 24,
  });

  // Get the PTY session and spawn claude
  const session = ptyManager.get(sessionId);
  if (!session) {
    return { success: false, error: 'Failed to create PTY session' };
  }

  // Store the executable path for reference - set atomically
  activeRuns.set(runId, { sessionId, state: 'running' });

  // Spawn claude in the PTY
  const execPath = detection.executablePath;

  // Wait for first data from PTY (shell ready signal), then write the claude command
  const shellReadyHandler = ({ sessionId: id, data }: { sessionId: string; data: string }) => {
    if (id === sessionId && data) {
      ptyManager.removeListener('data', shellReadyHandler);
      clearTimeout(fallbackTimer);
      ptyManager.removeListener('exit', cleanupHandler);
      ptyManager.removeListener('error', errorHandler);
      const cmd = `"${execPath}" ${args.join(' ')}\r`;
      ptyManager.write(sessionId, cmd);
    }
  };
  ptyManager.on('data', shellReadyHandler);

  // Fallback timeout if shell doesn't emit data within 5 seconds
  const fallbackTimer = setTimeout(() => {
    ptyManager.removeListener('data', shellReadyHandler);
    ptyManager.removeListener('exit', cleanupHandler);
    ptyManager.removeListener('error', errorHandler);
    const cmd = `"${execPath}" ${args.join(' ')}\r`;
    ptyManager.write(sessionId, cmd);
  }, 5000);

  // Clean up fallback timer when PTY exits
  const cleanupHandler = ({ sessionId: id }: { sessionId: string; exitCode: number; signal?: number }) => {
    if (id === sessionId) {
      clearTimeout(fallbackTimer);
      ptyManager.removeListener('data', shellReadyHandler);
      ptyManager.removeListener('exit', cleanupHandler);
      ptyManager.removeListener('error', errorHandler);
    }
  };
  ptyManager.on('exit', cleanupHandler);

  // Clean up handlers on PTY error
  const errorHandler = ({ sessionId: id }: { sessionId: string; error: Error }) => {
    if (id === sessionId) {
      clearTimeout(fallbackTimer);
      ptyManager.removeListener('data', shellReadyHandler);
      ptyManager.removeListener('exit', cleanupHandler);
      ptyManager.removeListener('error', errorHandler);
    }
  };
  ptyManager.on('error', errorHandler);

  return {
    success: true,
    runId,
    sessionId,
    executablePath: execPath,
    version: detection.version,
  };
});

ipcMain.handle('claude:kill', async (_event, runId: string) => {
  const run = activeRuns.get(runId);
  if (!run) {
    return { success: false, error: 'Run not found' };
  }

  // Send SIGTERM to the PTY
  ptyManager.kill(run.sessionId, 'SIGTERM');
  run.state = 'exited';

  return { success: true };
});

ipcMain.handle('claude:getRunState', async (_event, runId: string) => {
  const run = activeRuns.get(runId);
  if (!run) {
    return { state: 'idle', sessionId: null };
  }

  return {
    state: run.state,
    sessionId: run.sessionId,
    exitCode: run.exitCode,
    signal: run.signal,
    error: run.error,
  };
});

ipcMain.handle('claude:listRuns', async () => {
  return Array.from(activeRuns.entries()).map(([runId, run]) => ({
    runId,
    sessionId: run.sessionId,
    state: run.state,
    exitCode: run.exitCode,
    signal: run.signal,
  }));
});

// Update run state when PTY exits
ptyManager.on('exit', ({ sessionId, exitCode, signal }) => {
  for (const [runId, run] of activeRuns.entries()) {
    if (run.sessionId === sessionId) {
      run.state = exitCode === 0 ? 'exited' : 'failed';
      run.exitCode = exitCode;
      run.signal = signal;

      // Forward to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('claude:runStateChanged', {
          runId,
          state: run.state,
          exitCode,
          signal,
        });
      }

      // Clean up old runs after a delay (keep for state visibility)
      if (run.state === 'exited' || run.state === 'failed') {
        setTimeout(() => {
          const currentRun = activeRuns.get(runId);
          if (currentRun && (currentRun.state === 'exited' || currentRun.state === 'failed')) {
            activeRuns.delete(runId);
          }
        }, 30000); // Clean up after 30 seconds
      }

      // Enforce max size cap - remove oldest completed/failed runs if over limit
      if (activeRuns.size > MAX_ACTIVE_RUNS) {
        const toRemove: string[] = [];
        for (const [id, r] of activeRuns.entries()) {
          if (r.state === 'exited' || r.state === 'failed') {
            toRemove.push(id);
            if (toRemove.length >= activeRuns.size - MAX_ACTIVE_RUNS + 1) break;
          }
        }
        for (const id of toRemove) {
          activeRuns.delete(id);
        }
      }
      break;
    }
  }
});

ptyManager.on('error', ({ sessionId, error }) => {
  for (const [runId, run] of activeRuns.entries()) {
    if (run.sessionId === sessionId) {
      run.state = 'failed';
      run.error = error.message;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('claude:runStateChanged', {
          runId,
          state: 'failed',
          error: error.message,
        });
      }
      break;
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Storage Operations
// ─────────────────────────────────────────────────────────────────────────────

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

ipcMain.handle('storage:get', async (_event, key: string) => {
  const storage = readStorage();
  return storage[key];
});

ipcMain.handle('storage:set', async (_event, key: string, value: unknown) => {
  const storage = readStorage();
  storage[key] = value;
  writeStorage(storage);
});

ipcMain.handle('storage:delete', async (_event, key: string) => {
  const storage = readStorage();
  delete storage[key];
  writeStorage(storage);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Filesystem Operations
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('filesystem:readFile', async (_event, filePath: string, encoding = 'utf-8') => {
  return fs.readFileSync(filePath, encoding as BufferEncoding);
});

ipcMain.handle('filesystem:writeFile', async (_event, filePath: string, content: string) => {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
});

ipcMain.handle('filesystem:exists', async (_event, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('dialog:openFile', async (_event, options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
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

ipcMain.handle('dialog:openDirectory', async (_event, options?: { defaultPath?: string }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    defaultPath: options?.defaultPath,
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, directoryPath: null };
  }

  return { canceled: false, directoryPath: result.filePaths[0] };
});

ipcMain.handle('dialog:saveFile', async (_event, options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
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

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - App Operations
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Claude Code Detection
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaudeCodeStatus {
  installed: boolean;
  executablePath: string | null;
  version: string | null;
  error: string | null;
}

const detectClaudeCode = (): ClaudeCodeStatus => {
  // Common installation paths for Claude Code CLI
  const possiblePaths = process.platform === 'darwin'
    ? ['/usr/local/bin/claude', '/opt/homebrew/bin/claude', '/usr/bin/claude']
    : ['/usr/local/bin/claude', '/usr/bin/claude'];

  // Try to find claude in PATH
  const pathEnv = process.env.PATH || '';
  const pathDirs = pathEnv.split(path.delimiter);

  const allPossiblePaths = [...new Set([...possiblePaths, ...pathDirs.map(p => path.join(p, 'claude'))])];

  for (const execPath of allPossiblePaths) {
    try {
      if (fs.existsSync(execPath)) {
        // Try to get version
        try {
          const versionOutput = execSync(`"${execPath}" --version`, {
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          // Parse version from output (e.g., "claude 1.0.4" or "Claude Code 1.0.4")
          const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : null;

          return {
            installed: true,
            executablePath: execPath,
            version,
            error: null,
          };
        } catch {
          // Executable exists but --version failed - might still be runnable
          return {
            installed: true,
            executablePath: execPath,
            version: null,
            error: 'Found executable but could not determine version. Claude Code may still be functional.',
          };
        }
      }
    } catch {
      // Skip paths we can't access
    }
  }

  return {
    installed: false,
    executablePath: null,
    version: null,
    error: 'Claude Code CLI not found. Please install Claude Code to use Knuthflow.',
  };
};

ipcMain.handle('claude:detect', async () => {
  return detectClaudeCode();
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Workspace Operations
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('workspace:create', async (_event, name: string, workspacePath: string) => {
  const db = getDatabase();
  const workspace = db.getWorkspaceByPath(workspacePath);
  if (workspace) {
    return { success: false, error: 'Workspace with this path already exists' };
  }
  const id = `ws-${crypto.randomUUID()}`;
  const created = db.createWorkspace({ id, name, path: workspacePath });
  return { success: true, workspace: created };
});

ipcMain.handle('workspace:get', async (_event, id: string) => {
  const db = getDatabase();
  return db.getWorkspace(id);
});

ipcMain.handle('workspace:list', async () => {
  const db = getDatabase();
  return db.listWorkspaces();
});

ipcMain.handle('workspace:listRecent', async (_event, limit = 10) => {
  const db = getDatabase();
  return db.listRecentWorkspaces(limit);
});

ipcMain.handle('workspace:updateLastOpened', async (_event, id: string) => {
  const db = getDatabase();
  db.updateWorkspaceLastOpened(id);
});

ipcMain.handle('workspace:delete', async (_event, id: string) => {
  const db = getDatabase();
  db.deleteWorkspace(id);
});

ipcMain.handle('workspace:validatePath', async (_event, workspacePath: string) => {
  try {
    const exists = fs.existsSync(workspacePath);
    if (!exists) {
      return { valid: false, error: 'Path does not exist' };
    }
    const stats = fs.statSync(workspacePath);
    if (!stats.isDirectory()) {
      return { valid: false, error: 'Path is not a directory' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Unable to access path' };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Session Operations
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('session:create', async (_event, name: string, workspaceId: string | null, runId: string | null, ptySessionId: string | null) => {
  const db = getDatabase();
  const id = `sess-${crypto.randomUUID()}`;
  const session = db.createSession({ id, name, workspaceId, runId, ptySessionId });
  return session;
});

ipcMain.handle('session:get', async (_event, id: string) => {
  const db = getDatabase();
  return db.getSession(id);
});

ipcMain.handle('session:updateEnd', async (_event, id: string, status: 'completed' | 'failed', exitCode: number | null, signal: number | null) => {
  const db = getDatabase();
  db.updateSessionEnd(id, status, exitCode, signal);
});

ipcMain.handle('session:list', async (_event, limit = 50) => {
  const db = getDatabase();
  return db.listSessions(limit);
});

ipcMain.handle('session:listRecent', async (_event, workspaceId: string | null, limit = 20) => {
  const db = getDatabase();
  return db.listRecentSessions(workspaceId, limit);
});

ipcMain.handle('session:listActive', async () => {
  const db = getDatabase();
  return db.listActiveSessions();
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Supervision and Recovery
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('supervisor:validateIntegrity', async () => {
  const supervisor = getSupervisor();
  return supervisor.validateSessionIntegrity();
});

ipcMain.handle('supervisor:cleanupOrphans', async () => {
  const supervisor = getSupervisor();
  supervisor.cleanupOrphanedSessions();
  return { success: true };
});

ipcMain.handle('supervisor:explainExit', async (_event, exitCode: number | null, signal?: number) => {
  const supervisor = getSupervisor();
  return supervisor.explainExit(exitCode, signal ?? undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Settings Operations
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', async (_event, key: string) => {
  const db = getDatabase();
  return db.getSetting(key as keyof AppSettings);
});

ipcMain.handle('settings:set', async (_event, key: string, value: unknown) => {
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

ipcMain.handle('settings:getAll', async () => {
  const db = getDatabase();
  return db.getAllSettings();
});

ipcMain.handle('settings:setAll', async (_event, settings: Partial<AppSettings>) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Launch Profile Operations
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('profile:create', async (_event, profile: Omit<LaunchProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
  const db = getDatabase();
  const id = `profile-${crypto.randomUUID()}`;
  return db.createProfile({ id, ...profile });
});

ipcMain.handle('profile:get', async (_event, id: string) => {
  const db = getDatabase();
  return db.getProfile(id);
});

ipcMain.handle('profile:getDefault', async () => {
  const db = getDatabase();
  return db.getDefaultProfile();
});

ipcMain.handle('profile:list', async () => {
  const db = getDatabase();
  return db.listProfiles();
});

ipcMain.handle('profile:update', async (_event, id: string, updates: Partial<Omit<LaunchProfile, 'id' | 'createdAt'>>) => {
  const db = getDatabase();
  return db.updateProfile(id, updates);
});

ipcMain.handle('profile:delete', async (_event, id: string) => {
  const db = getDatabase();
  return db.deleteProfile(id);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Secure Storage Operations
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Logs and Diagnostics
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Ralph Operations
// ─────────────────────────────────────────────────────────────────────────────

const ralphBootstrap = getRalphBootstrap();
const ralphValidator = getRalphValidator();

ipcMain.handle('ralph:bootstrap', async (_event, workspaceId: string, workspacePath: string, force?: boolean) => {
  return ralphBootstrap.bootstrap({ workspaceId, workspacePath, force: force ?? false });
});

ipcMain.handle('ralph:getReadinessReport', async (_event, workspaceId: string, workspacePath: string) => {
  return ralphValidator.generateReadinessReport(workspaceId, workspacePath);
});

ipcMain.handle('ralph:validateBeforeStart', async (_event, workspaceId: string, workspacePath: string) => {
  return ralphValidator.validateBeforeStart(workspaceId, workspacePath);
});

ipcMain.handle('ralph:validateBeforeResume', async (_event, workspaceId: string, workspacePath: string) => {
  return ralphValidator.validateBeforeResume(workspaceId, workspacePath);
});

ipcMain.handle('ralph:validateBeforeRepair', async (_event, workspacePath: string) => {
  return ralphValidator.validateBeforeRepair(workspacePath);
});

ipcMain.handle('ralph:isRalphEnabled', async (_event, workspacePath: string) => {
  return ralphBootstrap.isRalphEnabled(workspacePath);
});

ipcMain.handle('ralph:isFreshWorkspace', async (_event, workspaceId: string, workspacePath: string) => {
  return ralphValidator.isFreshWorkspace(workspaceId, workspacePath);
});

ipcMain.handle('ralph:readControlFiles', async (_event, workspacePath: string) => {
  // Security: validate workspace path is within allowed workspaces
  const db = getDatabase();
  const workspaces = db.listWorkspaces();
  const normalizedPath = path.normalize(workspacePath);
  const isAllowed = workspaces.some(ws => {
    const normalizedWsPath = path.normalize(ws.path);
    return normalizedPath === normalizedWsPath || normalizedPath.startsWith(normalizedWsPath + path.sep);
  });
  if (!isAllowed) {
    throw new Error('Access denied: workspace path is not registered');
  }
  return ralphBootstrap.readControlFiles(workspacePath);
});

ipcMain.handle('ralph:getProject', async (_event, workspaceId: string) => {
  const db = getDatabase();
  return db.getRalphProjectByWorkspaceId(workspaceId);
});

ipcMain.handle('ralph:getProjectRuns', async (_event, projectId: string, limit?: number) => {
  const db = getDatabase();
  return db.listLoopRuns(projectId, limit ?? 50);
});

ipcMain.handle('ralph:getActiveRuns', async (_event, projectId: string) => {
  const db = getDatabase();
  return db.listActiveLoopRuns(projectId);
});

ipcMain.handle('ralph:createRun', async (_event, projectId: string, name: string) => {
  const db = getDatabase();
  return db.createLoopRun(projectId, name);
});

ipcMain.handle('ralph:startRun', async (_event, runId: string, sessionId: string, ptySessionId: string) => {
  const db = getDatabase();
  db.startLoopRun(runId, sessionId, ptySessionId);
});

ipcMain.handle('ralph:endRun', async (_event, runId: string, status: 'completed' | 'failed' | 'cancelled', exitCode: number | null, signal: number | null, error: string | null) => {
  const db = getDatabase();
  db.endLoopRun(runId, status, exitCode, signal, error);
});

ipcMain.handle('ralph:incrementRunIteration', async (_event, runId: string) => {
  const db = getDatabase();
  db.incrementLoopRunIteration(runId);
});

ipcMain.handle('ralph:getRunSummaries', async (_event, runId: string) => {
  const db = getDatabase();
  return db.listLoopSummaries(runId);
});

ipcMain.handle('ralph:addRunSummary', async (_event, projectId: string, runId: string, iteration: number, prompt: string, response: string, selectedFiles: string[]) => {
  const db = getDatabase();
  return db.createLoopSummary(projectId, runId, iteration, prompt, response, selectedFiles);
});

ipcMain.handle('ralph:getRunSnapshots', async (_event, runId: string) => {
  const db = getDatabase();
  return db.listPlanSnapshots(runId);
});

ipcMain.handle('ralph:addRunSnapshot', async (_event, projectId: string, runId: string, iteration: number, planContent: string) => {
  const db = getDatabase();
  return db.createPlanSnapshot(projectId, runId, iteration, planContent);
});

ipcMain.handle('ralph:deleteProject', async (_event, projectId: string) => {
  const db = getDatabase();
  db.deleteRalphProject(projectId);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Ralph Runtime (Phase 8)
// ─────────────────────────────────────────────────────────────────────────────

import {
  RalphRuntime,
  RalphScheduler,
  RalphExecutionAdapter,
  RalphSafetyMonitor,
  getRalphRuntime,
  getAllRalphRuntimes,
  getRuntimeForRunId,
  getRalphScheduler,
  getRalphExecution,
  getRalphSafety,
  resetRalphRuntime,
  resetRalphScheduler,
  resetRalphExecution,
  resetRalphSafety,
} from './main/index';
import { StopReason, VALID_STOP_REASONS } from './shared/ralphTypes';

function isValidStopReason(reason: string): reason is StopReason {
  return VALID_STOP_REASONS.includes(reason as StopReason);
}

ipcMain.handle('ralphRuntime:start', async (_event, projectId: string, name: string, sessionId: string, ptySessionId: string) => {
  try {
    const runtime = getRalphRuntime(projectId);
    const run = runtime.start(projectId, name, sessionId, ptySessionId);
    return { success: true, run };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphRuntime:pause', async (_event, runId: string) => {
  try {
    const runtime = getRuntimeForRunId(runId);
    if (runtime && runtime.ownsRun(runId)) {
      runtime.pause(runId);
      return { success: true };
    }
    return { success: false, error: 'Run not found' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphRuntime:resume', async (_event, runId: string) => {
  try {
    const runtime = getRuntimeForRunId(runId);
    if (runtime && runtime.ownsRun(runId)) {
      runtime.resume(runId);
      return { success: true };
    }
    return { success: false, error: 'Run not found' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphRuntime:stop', async (_event, runId: string, reason: string, message: string, canResume?: boolean) => {
  try {
    if (!isValidStopReason(reason)) {
      return { success: false, error: `Invalid stop reason: ${reason}` };
    }
    const runtime = getRuntimeForRunId(runId);
    if (runtime && runtime.ownsRun(runId)) {
      runtime.stop(runId, reason, message, canResume ?? false);
      return { success: true };
    }
    return { success: false, error: 'Run not found' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphRuntime:getState', async (_event, runId: string) => {
  try {
    const runtime = getRuntimeForRunId(runId);
    if (runtime && runtime.ownsRun(runId)) {
      return {
        state: runtime.getRuntimeState(runId),
        context: runtime.getCurrentContext(runId),
        safetyStop: runtime.getSafetyStop(runId),
      };
    }
    return { state: null, context: null, safetyStop: null };
  } catch (error) {
    return { state: null, context: null, safetyStop: null, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphRuntime:getActiveRun', async (_event, projectId: string) => {
  try {
    const runtime = getRalphRuntime(projectId);
    return { success: true, run: runtime.getActiveRunForProject(projectId) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Ralph Scheduler (Phase 8)
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('ralphScheduler:parsePlan', async (_event, workspacePath: string) => {
  try {
    const scheduler = getRalphScheduler(workspacePath);
    const tasks = scheduler.parseFixPlan();
    return { success: true, tasks };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphScheduler:selectNextItem', async (_event, workspacePath: string) => {
  try {
    const scheduler = getRalphScheduler(workspacePath);
    const item = scheduler.selectNextItem();
    return { success: true, item };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphScheduler:getPendingItems', async (_event, workspacePath: string) => {
  try {
    const scheduler = getRalphScheduler(workspacePath);
    const items = scheduler.getPendingItems();
    return { success: true, items };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphScheduler:completeItem', async (_event, workspacePath: string, itemId: string) => {
  try {
    const scheduler = getRalphScheduler(workspacePath);
    const success = scheduler.completeItem(itemId);
    return { success };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphScheduler:deferItem', async (_event, workspacePath: string, itemId: string, reason?: string) => {
  try {
    const scheduler = getRalphScheduler(workspacePath);
    const success = scheduler.deferItem(itemId, reason);
    return { success };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphScheduler:determineAcceptanceGate', async (_event, workspacePath: string, itemId: string) => {
  try {
    const scheduler = getRalphScheduler(workspacePath);
    const pendingItems = scheduler.getPendingItems();
    const item = pendingItems.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    const gate = scheduler.determineAcceptanceGate(item);
    return { success: true, gate };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers - Ralph Safety (Phase 8)
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('ralphSafety:canExecute', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    return safety.canExecute(projectId);
  } catch (error) {
    return { allowed: false, reason: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:recordCall', async (_event, projectId: string, tokensUsed?: number) => {
  try {
    const safety = getRalphSafety(projectId);
    safety.recordCall(projectId, tokensUsed ?? 0);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:recordFailure', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    safety.recordFailure(projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:recordNoProgress', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    safety.recordNoProgress(projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:recordPermissionDenial', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    safety.recordPermissionDenial(projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:getRateLimitState', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    return { success: true, state: safety.getRateLimitState(projectId) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:getCircuitBreakerState', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    return { success: true, state: safety.getCircuitBreakerState(projectId) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:isCircuitOpen', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    return { success: true, isOpen: safety.isCircuitOpen(projectId) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:resetCircuit', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    safety.resetCircuit(projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('ralphSafety:getSafetyState', async (_event, projectId: string) => {
  try {
    const safety = getRalphSafety(projectId);
    return { success: true, state: safety.getSafetyState(projectId) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

app.on('ready', () => {
  // Initialize database first
  getDatabase();

  // Register update handlers
  registerUpdateHandlers();

  // Validate session integrity on startup and clean up orphaned sessions
  const supervisor = getSupervisor();
  const integrity = supervisor.validateSessionIntegrity();
  if (!integrity.valid) {
    console.log('[Supervisor] Session integrity issues found:', integrity.issues);
  }
  if (integrity.cleaned > 0) {
    console.log(`[Supervisor] Cleaned up ${integrity.cleaned} orphaned sessions`);
  }

  // Start the supervision loop
  supervisor.start();

  // Forward supervisor events to renderer
  supervisor.on('sessionCrashed', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('supervisor:sessionCrashed', data);
    }
  });

  supervisor.on('recoveryNeeded', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('supervisor:recoveryNeeded', data);
    }
  });

  supervisor.on('orphanCleaned', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('supervisor:orphanCleaned', data);
    }
  });

  // Create the main window
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup processes on quit
app.on('will-quit', () => {
  for (const [, proc] of activeProcesses) {
    proc.kill();
  }
  activeProcesses.clear();

  // Stop the supervisor
  resetSupervisor();

  // Reset Ralph singletons
  resetRalphBootstrap();
  resetRalphValidator();
  resetRalphRuntime();
  resetRalphScheduler();
  resetRalphExecution();
  resetRalphSafety();

  // Cleanup PTY manager
  ptyManager.dispose();

  // Cleanup database
  closeDatabase();
});
