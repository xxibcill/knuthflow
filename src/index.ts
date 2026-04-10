import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

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
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open DevTools in development
  mainWindow.webContents.openDevTools();
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
});