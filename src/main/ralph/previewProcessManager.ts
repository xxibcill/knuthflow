import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import { PreviewCommand } from './previewCommandDetector';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PreviewProcess {
  id: string;
  command: PreviewCommand;
  process: ChildProcess | null;
  status: 'starting' | 'ready' | 'stopping' | 'stopped' | 'failed';
  port: number;
  pid: number | null;
  startupTimeMs: number | null;
  logs: string;
  error: string | null;
  readyPromise: Promise<string>;
}

export interface PreviewProcessOptions {
  startupTimeoutMs?: number;
  readinessCheckIntervalMs?: number;
  maxRetries?: number;
  env?: Record<string, string>;
}

export interface ReadinessResult {
  ready: boolean;
  url: string;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Process Manager
// ─────────────────────────────────────────────────────────────────────────────

export class PreviewProcessManager {
  private processes: Map<string, PreviewProcess> = new Map();
  private portAllocation: Map<number, string> = new Map();
  private basePort = 30000;
  private maxPort = 65535;

  constructor(private defaultOptions: PreviewProcessOptions = {}) {
    this.defaultOptions = {
      startupTimeoutMs: 60000,
      readinessCheckIntervalMs: 500,
      maxRetries: 120,
      ...defaultOptions,
    };
  }

  /**
   * Start a preview process
   */
  async startPreview(
    preview: PreviewCommand,
    options?: PreviewProcessOptions
  ): Promise<PreviewProcess> {
    const opts = { ...this.defaultOptions, ...options };
    const port = await this.allocatePort(preview.port);
    const processId = `preview-${Date.now()}-${port}`;

    // Create the preview process object
    const previewProcess: PreviewProcess = {
      id: processId,
      command: { ...preview, port },
      process: null,
      status: 'starting',
      port,
      pid: null,
      startupTimeMs: null,
      logs: '',
      error: null,
      readyPromise: Promise.resolve(''),
    };

    this.processes.set(processId, previewProcess);

    // Start the process asynchronously and expose the real readiness promise.
    previewProcess.readyPromise = this.startProcess(previewProcess, opts).catch((err) => {
      previewProcess.status = 'failed';
      previewProcess.error = err.message;
      throw err;
    });

    return previewProcess;
  }

  /**
   * Start the actual process
   */
  private async startProcess(
    previewProcess: PreviewProcess,
    options: PreviewProcessOptions
  ): Promise<string> {
    const { command, port } = previewProcess;
    const startTime = Date.now();

    // Set up environment with port
    const env = {
      ...process.env,
      ...options.env,
      PORT: String(port),
    };

    // Parse command into executable and args
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellFlag = isWindows ? '/c' : '-c';

    return new Promise((resolve, reject) => {
      // Spawn the process
      const child = spawn(shell, [shellFlag, command.command], {
        cwd: command.cwd,
        env,
        detached: false,
      });

      previewProcess.process = child;
      previewProcess.pid = child.pid ?? null;

      let output = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
        previewProcess.logs += data.toString();
      });

      child.stderr?.on('data', (data) => {
        output += data.toString();
        previewProcess.logs += data.toString();
      });

      child.on('error', (err) => {
        previewProcess.status = 'failed';
        previewProcess.error = err.message;
        reject(err);
      });

      // Wait for process to be ready
      this.waitForReady(previewProcess, options)
        .then((url) => {
          previewProcess.status = 'ready';
          previewProcess.startupTimeMs = Date.now() - startTime;
          resolve(url);
        })
        .catch((err) => {
          previewProcess.status = 'failed';
          previewProcess.error = err.message;
          reject(err);
        });
    });
  }

  /**
   * Wait for the preview server to be ready
   */
  private async waitForReady(
    previewProcess: PreviewProcess,
    options: PreviewProcessOptions
  ): Promise<string> {
    const timeout = options.startupTimeoutMs ?? 60000;
    const checkInterval = options.readinessCheckIntervalMs ?? 500;
    const maxRetries = options.maxRetries ?? 3;
    const { port } = previewProcess;
    const startTime = Date.now();

    let retries = 0;

    return new Promise((resolve, reject) => {
      const check = () => {
        if (previewProcess.status === 'stopped' || previewProcess.status === 'failed') {
          reject(new Error('Process stopped before readiness'));
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Startup timeout after ${timeout}ms`));
          return;
        }

        const url = `http://localhost:${port}`;

        this.checkHttpReadiness(url)
          .then((result) => {
            if (result.ready) {
              resolve(result.url);
            } else {
              retries++;
              if (retries >= maxRetries) {
                reject(new Error(`Failed to become ready after ${maxRetries} retries: ${result.reason}`));
              } else {
                setTimeout(check, checkInterval);
              }
            }
          })
          .catch((err) => {
            retries++;
            if (retries >= maxRetries) {
              reject(new Error(`Readiness check failed: ${err.message}`));
            } else {
              setTimeout(check, checkInterval);
            }
          });
      };

      // Start checking after a brief delay
      setTimeout(check, 1000);
    });
  }

  /**
   * Check HTTP readiness of a URL
   */
  private checkHttpReadiness(url: string): Promise<ReadinessResult> {
    return new Promise((resolve) => {
      const req = http.get(url, (res) => {
        resolve({
          ready: res.statusCode !== undefined && res.statusCode < 500,
          url,
          reason: `HTTP ${res.statusCode}`,
        });
      });

      req.on('error', (err) => {
        resolve({
          ready: false,
          url,
          reason: err.message,
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          ready: false,
          url,
          reason: 'Connection timeout',
        });
      });
    });
  }

  /**
   * Allocate a port, trying to use the preferred port first
   */
  private async allocatePort(preferredPort: number): Promise<number> {
    // Check if preferred port is available
    if (!(await this.isPortInUse(preferredPort))) {
      this.portAllocation.set(preferredPort, '');
      return preferredPort;
    }

    // Try sequential ports starting from preferred
    for (let port = preferredPort + 1; port <= this.maxPort; port++) {
      if (!(await this.isPortInUse(port)) && !this.portAllocation.has(port)) {
        this.portAllocation.set(port, '');
        return port;
      }
    }

    // Wrap around to base port range
    for (let port = this.basePort; port < preferredPort; port++) {
      if (!(await this.isPortInUse(port)) && !this.portAllocation.has(port)) {
        this.portAllocation.set(port, '');
        return port;
      }
    }

    // Fallback: use a random port
    const randomPort = Math.floor(Math.random() * (this.maxPort - this.basePort)) + this.basePort;
    this.portAllocation.set(randomPort, '');
    return randomPort;
  }

  /**
   * Check if a port is in use
   */
  private isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer();

      server.once('error', () => {
        resolve(true); // Port in use
      });

      server.once('listening', () => {
        server.close();
        resolve(false);
      });

      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Stop a preview process
   */
  async stopPreview(processId: string): Promise<void> {
    const previewProcess = this.processes.get(processId);
    if (!previewProcess) {
      return;
    }

    previewProcess.status = 'stopping';

    if (previewProcess.process) {
      // On Unix, try SIGTERM first, then SIGKILL
      if (process.platform !== 'win32') {
        previewProcess.process.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            if (previewProcess.process && !previewProcess.process.killed) {
              previewProcess.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
        });
      } else {
        // On Windows, kill directly
        previewProcess.process.kill('SIGTERM');
      }
    }

    // Release port allocation
    this.portAllocation.delete(previewProcess.port);

    previewProcess.status = 'stopped';
    this.processes.delete(processId);
  }

  /**
   * Stop all preview processes
   */
  async stopAll(): Promise<void> {
    const processIds = Array.from(this.processes.keys());
    await Promise.all(processIds.map((id) => this.stopPreview(id)));
  }

  /**
   * Get a preview process by ID
   */
  getProcess(processId: string): PreviewProcess | undefined {
    return this.processes.get(processId);
  }

  /**
   * Get all running preview processes
   */
  getRunningProcesses(): PreviewProcess[] {
    return Array.from(this.processes.values()).filter(
      (p) => p.status === 'ready' || p.status === 'starting'
    );
  }

  /**
   * Get process by port
   */
  getProcessByPort(port: number): PreviewProcess | undefined {
    return Array.from(this.processes.values()).find((p) => p.port === port);
  }

  /**
   * Check if a process is ready
   */
  isReady(processId: string): boolean {
    const process = this.processes.get(processId);
    return process?.status === 'ready';
  }

  /**
   * Get process URL
   */
  getProcessUrl(processId: string): string | null {
    const process = this.processes.get(processId);
    if (!process || process.status !== 'ready') {
      return null;
    }
    return `http://localhost:${process.port}`;
  }

  /**
   * Get process logs
   */
  getProcessLogs(processId: string): string | null {
    const process = this.processes.get(processId);
    return process?.logs ?? null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: PreviewProcessManager | null = null;

export function getPreviewProcessManager(): PreviewProcessManager {
  if (!instance) {
    instance = new PreviewProcessManager();
  }
  return instance;
}

export function resetPreviewProcessManager(): void {
  if (instance) {
    // Intentionally fire-and-forget: cleanup should not block reset
    void instance.stopAll();
    instance = null;
  }
}
