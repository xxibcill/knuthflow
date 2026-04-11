import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { spawn, ChildProcess } from 'child_process';

// Active processes tracked by PID
const activeProcesses: Map<number, ChildProcess> = new Map();

export function registerProcessHandlers(): void {
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
    if (proc && proc.stdin) {
      proc.stdin.write(input);
    }
  });

  ipcMain.handle('process:kill', async (_event: IpcMainInvokeEvent, pid: number) => {
    const proc = activeProcesses.get(pid);
    if (proc) {
      proc.kill();
      activeProcesses.delete(pid);
    }
  });

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
    proc.kill();
  }
  activeProcesses.clear();
}
