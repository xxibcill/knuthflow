import * as pty from 'node-pty';
import { EventEmitter } from 'events';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PtyOptions {
  cwd?: string;
  cols?: number;
  rows?: number;
  env?: Record<string, string | undefined>;
  name?: string;
}

export interface PtySession {
  id: string;
  pty: pty.IPty;
  createdAt: number;
  exitCode?: number;
  signal?: number;
}

export interface PtyData {
  sessionId: string;
  data: string;
}

export interface PtyExit {
  sessionId: string;
  exitCode: number;
  signal?: number;
}

export interface PtyError {
  sessionId: string;
  error: Error;
}

// ─────────────────────────────────────────────────────────────────────────────
// PtyManager
// ─────────────────────────────────────────────────────────────────────────────

export class PtyManager extends EventEmitter {
  private sessions: Map<string, PtySession> = new Map();
  private idCounter = 0;

  /**
   * Generates a unique session ID
   */
  private generateId(): string {
    return `pty-${Date.now()}-${++this.idCounter}`;
  }

  /**
   * Creates a new PTY session
   */
  create(options: PtyOptions = {}): string {
    const sessionId = this.generateId();
    const { cwd, cols = 80, rows = 24, env = {}, name = 'xterm-256color' } = options;

    // Merge environment variables with process environment
    const fullEnv = { ...process.env, ...env };

    let ptyProcess: pty.IPty;

    try {
      // Use login shell as default executable
      const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
      ptyProcess = pty.spawn(shell, [], {
        name,
        cols,
        rows,
        cwd: cwd || process.cwd(),
        env: fullEnv as { [key: string]: string },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { sessionId, error: err });
      throw err;
    }

    const session: PtySession = {
      id: sessionId,
      pty: ptyProcess,
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);

    // Set up data handler - forward PTY output to listeners
    const dataDisposable = ptyProcess.onData((data: string) => {
      this.emit('data', { sessionId, data });
    });

    // Set up exit handler
    const exitDisposable = ptyProcess.onExit(({ exitCode, signal }) => {
      session.exitCode = exitCode;
      session.signal = signal;

      // Clean up
      dataDisposable.dispose();
      exitDisposable.dispose();
      this.sessions.delete(sessionId);

      this.emit('exit', { sessionId, exitCode, signal });
    });

    return sessionId;
  }

  /**
   * Writes data to a PTY session
   */
  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      session.pty.write(data);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { sessionId, error: err });
      return false;
    }
  }

  /**
   * Resizes a PTY session
   */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      session.pty.resize(Math.max(1, cols), Math.max(1, rows));
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { sessionId, error: err });
      return false;
    }
  }

  /**
   * Kills a PTY session
   */
  kill(sessionId: string, signal?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      if (signal) {
        session.pty.kill(signal);
      } else {
        session.pty.kill();
      }
      // Session will be removed in the exit handler
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { sessionId, error: err });
      // Even on error, try to clean up the session
      this.sessions.delete(sessionId);
      return false;
    }
  }

  /**
   * Gets a session by ID
   */
  get(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Gets all active sessions
   */
  list(): PtySession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Gets session count
   */
  count(): number {
    return this.sessions.size;
  }

  /**
   * Checks if a session exists
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Kills all sessions and cleans up
   */
  dispose(): void {
    for (const [, session] of this.sessions) {
      try {
        session.pty.kill();
      } catch {
        // Ignore errors during disposal
      }
    }
    this.sessions.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let managerInstance: PtyManager | null = null;

export function getPtyManager(): PtyManager {
  if (!managerInstance) {
    managerInstance = new PtyManager();
  }
  return managerInstance;
}

export function resetPtyManager(): void {
  if (managerInstance) {
    managerInstance.dispose();
    managerInstance = null;
  }
}