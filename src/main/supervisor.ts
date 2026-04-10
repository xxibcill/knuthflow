import { EventEmitter } from 'events';
import { getDatabase } from './database';
import { getPtyManager } from './ptyManager';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionHealth {
  sessionId: string;
  status: 'healthy' | 'warning' | 'critical' | 'crashed' | 'unknown';
  lastChecked: number;
  pid?: number;
  exitCode?: number;
  signal?: number;
  error?: string;
}

export interface RecoveryAction {
  type: 'restart' | 'cleanup' | 'notify' | 'none';
  sessionId: string;
  reason: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionSupervisor
// ─────────────────────────────────────────────────────────────────────────────

export class SessionSupervisor extends EventEmitter {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_MS = 10000; // 10 seconds
  private readonly STALE_THRESHOLD_MS = 30000; // 30 seconds without activity = stale
  private readonly CRASH_EXIT_CODES = new Set([1, 127, 128, 137, 139, 143, 255]);

  constructor() {
    super();
  }

  /**
   * Start the supervision loop
   */
  start(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_MS);

    // Initial check
    this.performHealthCheck();
  }

  /**
   * Stop the supervision loop
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check health of all active sessions
   */
  private performHealthCheck(): void {
    const db = getDatabase();
    const ptyManager = getPtyManager();

    // Get all active sessions from database
    const activeSessions = db.listActiveSessions();

    for (const session of activeSessions) {
      if (!session.ptySessionId) continue;

      const ptySession = ptyManager.get(session.ptySessionId);

      if (!ptySession) {
        // PTY is gone but session is still marked active - this is a crash
        this.handleSessionCrash(session.id, session.ptySessionId, {
          error: 'PTY process terminated unexpectedly',
        });
      } else {
        // Check if PTY is actually responsive
        const health = this.checkPtyHealth(session.ptySessionId);
        if (health.status === 'crashed') {
          this.handleSessionCrash(session.id, session.ptySessionId, health);
        } else if (health.status === 'warning') {
          this.emit('healthWarning', { sessionId: session.id, ...health });
        }
      }
    }
  }

  /**
   * Check PTY health by attempting a no-op write
   */
  private checkPtyHealth(sessionId: string): Partial<SessionHealth> {
    const ptyManager = getPtyManager();
    const session = ptyManager.get(sessionId);

    if (!session) {
      return { status: 'crashed', error: 'Session not found' };
    }

    try {
      // Attempt a no-op resize to check if PTY is responsive
      // A healthy PTY will accept resize, a dead one will error
      session.pty.resize(session.pty.cols, session.pty.rows);
      return { status: 'healthy', pid: session.pty.pid };
    } catch {
      return { status: 'crashed', error: 'PTY not responsive' };
    }
  }

  /**
   * Handle a session crash
   */
  handleSessionCrash(
    sessionId: string,
    ptySessionId: string,
    health: Partial<SessionHealth>
  ): void {
    const db = getDatabase();
    const ptyManager = getPtyManager();

    // Determine exit code from health info
    const exitCode = health.exitCode ?? (health.error ? 1 : null);
    const signal = health.signal ?? null;

    // Mark session as failed in database
    db.updateSessionEnd(sessionId, 'failed', exitCode, signal);

    // Clean up PTY session if it still exists
    if (ptyManager.has(ptySessionId)) {
      ptyManager.kill(ptySessionId);
    }

    // Emit crash event for UI notification
    this.emit('sessionCrashed', {
      sessionId,
      ptySessionId,
      exitCode,
      signal,
      error: health.error,
      timestamp: Date.now(),
    });

    // Determine recovery action
    const action = this.determineRecoveryAction(sessionId);
    if (action.type !== 'none') {
      this.emit('recoveryNeeded', action);
    }
  }

  /**
   * Determine what recovery action to take for a session
   */
  private determineRecoveryAction(sessionId: string): RecoveryAction {
    const db = getDatabase();
    const session = db.getSession(sessionId);

    if (!session) {
      return { type: 'none', sessionId, reason: 'Session not found', timestamp: Date.now() };
    }

    // For now, we don't auto-restart - user intervention required
    // Future: could auto-restart if it was a short-lived unexpected crash
    return {
      type: 'notify',
      sessionId,
      reason: 'Session crashed unexpectedly. You can restart it from the History view.',
      timestamp: Date.now(),
    };
  }

  /**
   * Clean up orphaned sessions (active in DB but no PTY)
   */
  cleanupOrphanedSessions(): void {
    const db = getDatabase();
    const ptyManager = getPtyManager();

    const activeSessions = db.listActiveSessions();

    for (const session of activeSessions) {
      if (!session.ptySessionId) continue;

      if (!ptyManager.has(session.ptySessionId)) {
        // PTY is gone - clean up database entry
        console.log(`[Supervisor] Cleaning up orphaned session: ${session.id}`);
        db.updateSessionEnd(session.id, 'failed', null, null);
        this.emit('orphanCleaned', { sessionId: session.id });
      }
    }
  }

  /**
   * Validate session integrity on startup
   */
  validateSessionIntegrity(): { valid: boolean; cleaned: number; issues: string[] } {
    const issues: string[] = [];
    let cleaned = 0;

    const db = getDatabase();
    const ptyManager = getPtyManager();

    // Check for orphaned active sessions
    const activeSessions = db.listActiveSessions();

    for (const session of activeSessions) {
      if (!session.ptySessionId) {
        issues.push(`Session ${session.id} has no PTY session ID`);
        db.updateSessionEnd(session.id, 'failed', null, null);
        cleaned++;
        continue;
      }

      if (!ptyManager.has(session.ptySessionId)) {
        issues.push(`Session ${session.id} PTY ${session.ptySessionId} not found`);
        db.updateSessionEnd(session.id, 'failed', null, null);
        cleaned++;
      }
    }

    this.cleanupOrphanedSessions();

    return {
      valid: issues.length === 0,
      cleaned,
      issues,
    };
  }

  /**
   * Check if an exit code indicates a crash
   */
  isCrashExit(exitCode: number | null, signal?: number): boolean {
    if (signal !== undefined && signal !== null && signal !== 0) {
      return true; // Any signal termination is abnormal
    }
    if (exitCode === null) return true;
    return this.CRASH_EXIT_CODES.has(exitCode);
  }

  /**
   * Get human-readable explanation of exit code
   */
  explainExit(exitCode: number | null, signal?: number): string {
    if (signal !== undefined && signal !== null && signal !== 0) {
      const signalNames: Record<number, string> = {
        1: 'SIGHUP (hangup)',
        2: 'SIGINT (interrupt)',
        3: 'SIGQUIT (quit)',
        9: 'SIGKILL (killed)',
        15: 'SIGTERM (terminated)',
      };
      return `Process terminated by signal ${signal}${signalNames[signal] ? ` (${signalNames[signal]})` : ''}`;
    }

    if (exitCode === null) {
      return 'Process exited with unknown code';
    }

    const explanations: Record<number, string> = {
      0: 'Process completed successfully',
      1: 'Process exited with general error',
      2: 'Process exited with misuse of shell command',
      126: 'Command not executable',
      127: 'Command not found',
      128: 'Invalid exit argument',
      137: 'Process killed with SIGKILL (out of memory or forced kill)',
      139: 'Process terminated with SIGSEGV (segmentation fault)',
      143: 'Process terminated with SIGTERM',
      255: 'Process exited with error (out of range exit code)',
    };

    return explanations[exitCode] ?? `Process exited with code ${exitCode}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let supervisorInstance: SessionSupervisor | null = null;

export function getSupervisor(): SessionSupervisor {
  if (!supervisorInstance) {
    supervisorInstance = new SessionSupervisor();
  }
  return supervisorInstance;
}

export function resetSupervisor(): void {
  if (supervisorInstance) {
    supervisorInstance.stop();
    supervisorInstance = null;
  }
}
