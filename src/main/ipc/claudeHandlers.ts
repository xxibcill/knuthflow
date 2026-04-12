import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { getPtyManager } from '../ptyManager';
import { detectClaudeCode } from '../utils/claudeDetection';

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

export function registerClaudeHandlers(mainWindowGetter: () => BrowserWindow | null): void {
  const ptyMgr = getPtyManager();
  let handlersAttached = false;

  ipcMain.handle('claude:detect', async () => {
    return detectClaudeCode();
  });

  ipcMain.handle('claude:launch', async (_event: IpcMainInvokeEvent, options?: { args?: string[]; cwd?: string } | string[]) => {
    const launchOptions = Array.isArray(options) ? { args: options } : (options ?? {});
    const args = launchOptions.args ?? [];

    // First detect Claude Code
    const detection = detectClaudeCode();
    if (!detection.installed || !detection.executablePath) {
      return { success: false, error: detection.error || 'Claude Code not installed' };
    }

    const runId = `run-${crypto.randomUUID()}`;
    const sessionId = ptyMgr.create({
      cwd: launchOptions.cwd || process.cwd(),
      cols: 80,
      rows: 24,
    });

    // Get the PTY session and spawn claude
    const session = ptyMgr.get(sessionId);
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
        ptyMgr.removeListener('data', shellReadyHandler);
        clearTimeout(fallbackTimer);
        ptyMgr.removeListener('exit', cleanupHandler);
        ptyMgr.removeListener('error', errorHandler);
        const cmd = `"${execPath}" ${args.join(' ')}\r`;
        ptyMgr.write(sessionId, cmd);
      }
    };
    ptyMgr.on('data', shellReadyHandler);

    // Fallback timeout if shell doesn't emit data within 5 seconds
    const fallbackTimer = setTimeout(() => {
      ptyMgr.removeListener('data', shellReadyHandler);
      ptyMgr.removeListener('exit', cleanupHandler);
      ptyMgr.removeListener('error', errorHandler);
      const cmd = `"${execPath}" ${args.join(' ')}\r`;
      ptyMgr.write(sessionId, cmd);
    }, 5000);

    // Clean up fallback timer when PTY exits
    const cleanupHandler = ({ sessionId: id }: { sessionId: string; exitCode: number; signal?: number }) => {
      if (id === sessionId) {
        clearTimeout(fallbackTimer);
        ptyMgr.removeListener('data', shellReadyHandler);
        ptyMgr.removeListener('exit', cleanupHandler);
        ptyMgr.removeListener('error', errorHandler);
      }
    };
    ptyMgr.on('exit', cleanupHandler);

    // Clean up handlers on PTY error
    const errorHandler = ({ sessionId: id }: { sessionId: string; error: Error }) => {
      if (id === sessionId) {
        clearTimeout(fallbackTimer);
        ptyMgr.removeListener('data', shellReadyHandler);
        ptyMgr.removeListener('exit', cleanupHandler);
        ptyMgr.removeListener('error', errorHandler);
      }
    };
    ptyMgr.on('error', errorHandler);

    return {
      success: true,
      runId,
      sessionId,
      executablePath: execPath,
      version: detection.version,
    };
  });

  ipcMain.handle('claude:kill', async (_event: IpcMainInvokeEvent, runId: string) => {
    const run = activeRuns.get(runId);
    if (!run) {
      console.warn(`[Claude] Kill failed: run ${runId} not found`);
      return { success: false, error: 'Run not found' };
    }

    // Send SIGTERM to the PTY
    ptyMgr.kill(run.sessionId, 'SIGTERM');
    run.state = 'exited';

    return { success: true };
  });

  ipcMain.handle('claude:getRunState', async (_event: IpcMainInvokeEvent, runId: string) => {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ipcMain.handle('claude:listRuns', async (_event: IpcMainInvokeEvent) => {
    return Array.from(activeRuns.entries()).map(([runId, run]) => ({
      runId,
      sessionId: run.sessionId,
      state: run.state,
      exitCode: run.exitCode,
      signal: run.signal,
    }));
  });

  // Attach PTY event handlers once (idempotent)
  if (!handlersAttached) {
    handlersAttached = true;

    // Update run state when PTY exits
    ptyMgr.on('exit', ({ sessionId, exitCode, signal }) => {
    for (const [runId, run] of activeRuns.entries()) {
      if (run.sessionId === sessionId) {
        run.state = exitCode === 0 ? 'exited' : 'failed';
        run.exitCode = exitCode;
        run.signal = signal;

        // Forward to renderer
        const mainWindow = mainWindowGetter();
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

  ptyMgr.on('error', ({ sessionId, error }) => {
    for (const [runId, run] of activeRuns.entries()) {
      if (run.sessionId === sessionId) {
        run.state = 'failed';
        run.error = error.message;

        const mainWindow = mainWindowGetter();
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
  }
}

export function getActiveRuns(): Map<string, ActiveRun> {
  return activeRuns;
}
