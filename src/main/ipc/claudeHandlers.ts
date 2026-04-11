import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ipcMain, BrowserWindow } from 'electron';
import { getPtyManager } from '../ptyManager';

export interface ClaudeCodeStatus {
  installed: boolean;
  executablePath: string | null;
  version: string | null;
  error: string | null;
}

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

export function detectClaudeCode(): ClaudeCodeStatus {
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
}

export function registerClaudeHandlers(mainWindowGetter: () => BrowserWindow | null): void {
  const ptyManager = getPtyManager();

  ipcMain.handle('claude:detect', async () => {
    return detectClaudeCode();
  });

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

  ptyManager.on('error', ({ sessionId, error }) => {
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

export function getActiveRuns(): Map<string, ActiveRun> {
  return activeRuns;
}
