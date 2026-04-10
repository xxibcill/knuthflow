import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess, execSync } from 'child_process';
import { getPtyManager, PtyOptions } from './main/ptyManager';

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

ipcMain.handle('claude:launch', async (_event, args: string[] = []) => {
  // First detect Claude Code
  const detection = detectClaudeCode();
  if (!detection.installed || !detection.executablePath) {
    return { success: false, error: detection.error || 'Claude Code not installed' };
  }

  const runId = `run-${Date.now()}`;
  const sessionId = ptyManager.create({
    cwd: process.cwd(),
    cols: 80,
    rows: 24,
  });

  // Mark as starting
  activeRuns.set(runId, { sessionId, state: 'starting' });

  // Get the PTY session and spawn claude
  const session = ptyManager.get(sessionId);
  if (!session) {
    activeRuns.delete(runId);
    return { success: false, error: 'Failed to create PTY session' };
  }

  // Store the executable path for reference
  activeRuns.set(runId, { sessionId, state: 'running' });

  // Spawn claude in the PTY
  const execPath = detection.executablePath;

  // For PTY, we write directly to spawn - but node-pty doesn't expose spawn directly
  // Instead, we'll use the PTY's process to launch claude
  // Actually, node-pty spawns a shell, so we need to write the command to the PTY

  // Wait for shell to be ready, then write the claude command
  setTimeout(() => {
    const cmd = `"${execPath}" ${args.join(' ')}\r`;
    ptyManager.write(sessionId, cmd);
  }, 100);

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
// App Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

app.on('ready', createWindow);

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

  // Cleanup PTY manager
  ptyManager.dispose();
});