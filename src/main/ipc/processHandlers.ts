import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { spawn, ChildProcess } from 'child_process';

// Active processes tracked by PID
const activeProcesses: Map<number, ChildProcess> = new Map();
let handlersRegistered = false;

export function registerProcessHandlers(): void {
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;
  ipcMain.handle('process:spawn', async (_event: IpcMainInvokeEvent, args: string[], cwd?: string) => {
    const spawned = spawn('claude', args, {
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    activeProcesses.set(spawned.pid!, spawned);

    // Clean up when process exits
    spawned.on('exit', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      activeProcesses.delete(spawned.pid!);
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { pid: spawned.pid! };
  });

  ipcMain.handle('process:send', async (_event: IpcMainInvokeEvent, pid: number, input: string) => {
    const proc = activeProcesses.get(pid);
    if (!proc) {
      return { success: false, error: 'Process not found' };
    }
    if (!proc.stdin) {
      return { success: false, error: 'Process stdin not available' };
    }
    proc.stdin.write(input);
    return { success: true };
  });

  ipcMain.handle('process:kill', async (_event: IpcMainInvokeEvent, pid: number) => {
    const proc = activeProcesses.get(pid);
    if (proc) {
      proc.kill();
      activeProcesses.delete(pid);
    }
  });

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ipcMain.handle('process:list', async (_event: IpcMainInvokeEvent) => {
    return Array.from(activeProcesses.entries()).map(([pid, proc]) => ({
      pid,
      status: proc.killed ? 'dead' : 'running',
    }));
  });
}

export function getActiveProcesses(): Map<number, ChildProcess> {
  return activeProcesses;
}

export function cleanupProcesses(): void {
  for (const [, proc] of activeProcesses) {
    try {
      proc.kill();
    } catch {
      // Process may have already exited
    }
  }
  activeProcesses.clear();
  handlersRegistered = false;
}
