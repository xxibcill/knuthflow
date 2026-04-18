import { EventEmitter } from 'events';
import { getPtyManager } from './ptyManager';
import { LoopIterationContext, RalphRuntimeConfig, DEFAULT_RALPH_RUNTIME_CONFIG } from '../shared/ralphTypes';

export type { RalphExecutionEvents, RalphExecutionEvent } from './ralph/ralphExecutionEvents';

export type { SessionState, SESSION_EXPIRATION_MS } from './ralph/ralphSessionState';
import { SESSION_EXPIRATION_MS } from './ralph/ralphSessionState';
import type { SessionState } from './ralph/ralphSessionState';

import { buildLoopPrompt, type LearningInjections } from './ralph/ralphPromptBuilder';
import { detectClaudeCode } from './ralph/claudeDetection';

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Execution Adapter
// ─────────────────────────────────────────────────────────────────────────────

export class RalphExecutionAdapter extends EventEmitter {
  private ptyManager = getPtyManager();

  private workspacePath: string;
  private config: Required<RalphRuntimeConfig>;
  private currentSession: SessionState | null = null;
  private outputBuffer = '';
  private responseBuffer = '';
  private sessionDataHandler: ((data: { sessionId: string; data: string }) => void) | null = null;
  private sessionExitHandler: ((exit: { sessionId: string; exitCode: number; signal?: number }) => void) | null = null;

  constructor(workspacePath: string, config: Partial<RalphRuntimeConfig> = {}) {
    super();
    this.workspacePath = workspacePath;
    this.config = { ...DEFAULT_RALPH_RUNTIME_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Session Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get or create a Claude session for Ralph execution
   */
  getOrCreateSession(previousSessionId?: string | null): SessionState {
    // Check if we can reuse the previous session
    if (previousSessionId) {
      const existingSession = this.getStoredSession(previousSessionId);
      if (existingSession && this.isSessionValid(existingSession)) {
        existingSession.lastUsedAt = Date.now();
        this.currentSession = existingSession;
        return existingSession;
      }
    }

    // Create new session
    return this.createNewSession();
  }

  /**
   * Create a new Claude session
   */
  private createNewSession(): SessionState {
    // Create PTY session
    const ptySessionId = this.ptyManager.create({
      cwd: this.workspacePath,
      cols: 120,
      rows: 40,
    });

    // Create a unique session ID with fallback for environments without crypto.randomUUID
    // Note: Math.random() fallback is not cryptographically secure, but session IDs
    // only need to be unique within the app, not globally secure
    const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const sessionId = `ralph-session-${randomPart}`;

    const session: SessionState = {
      sessionId,
      ptySessionId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRATION_MS,
      isValid: true,
    };

    this.currentSession = session;

    // Detect Claude Code and start it
    this.startClaudeInSession(session);

    return session;
  }

  /**
   * Get session state from storage
   * NOTE: This is a stub - session persistence is not yet implemented.
   * Sessions are only tracked in-memory and will not survive app restart.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getStoredSession(_sessionId: string): SessionState | null {
    // TODO (Phase 9): Implement persistent session storage
    // For now, we only track sessions in-memory and cannot resume across restarts
    return null;
  }

  /**
   * Check if a session is still valid
   */
  private isSessionValid(session: SessionState): boolean {
    if (!session.isValid) {
      return false;
    }

    if (Date.now() > session.expiresAt) {
      return false;
    }

    // Check if PTY session is still alive
    const ptySession = this.ptyManager.get(session.ptySessionId);
    if (!ptySession) {
      return false;
    }

    return true;
  }

  /**
   * Start Claude Code in a PTY session
   */
  private startClaudeInSession(session: SessionState): void {
    // Clean up any previous handlers first
    this.removeSessionHandlers();

    const detection = detectClaudeCode();
    if (!detection.installed || !detection.executablePath) {
      this.emit('error', 'Claude Code not installed');
      return;
    }

    // Use a Promise-based approach to wait for shell readiness
    // This avoids race conditions with the data handler
    const waitForShellReady = new Promise<void>((resolve) => {
      let settled = false;
      const cmd = `"${detection.executablePath}" --no-input\r`;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, this.config.shellReadyTimeoutMs);

      const checkPrompt = (data: string) => {
        if (settled) return;

        // Match common shell prompt patterns at end of line:
        // - $ or # at end (bash, zsh, fish with default prompts)
        // - > at end (csh, tcsh, or Windows-style)
        // - Prompt can have spaces before it like "my prompt $ "
        const promptPattern = /[$#>]\s*$/;
        if (promptPattern.test(data)) {
          settled = true;
          clearTimeout(timeout);
          this.ptyManager.write(session.ptySessionId, cmd);
          resolve();
        }
      };

      // Set up a one-time data handler to detect shell ready
      const handler = ({ sessionId, data }: { sessionId: string; data: string }) => {
        if (sessionId === session.ptySessionId) {
          checkPrompt(data);
        }
      };

      this.ptyManager.once('data', handler);
    });

    // Set up output handler before waiting
    this.sessionDataHandler = ({ sessionId, data }) => {
      if (sessionId === session.ptySessionId) {
        this.outputBuffer += data;
        this.emit('output', data);
      }
    };

    this.sessionExitHandler = ({ sessionId }) => {
      if (sessionId === session.ptySessionId) {
        // Clean up data handler when session exits to prevent memory leaks
        if (this.sessionDataHandler) {
          this.ptyManager.removeListener('data', this.sessionDataHandler);
          this.sessionDataHandler = null;
        }
        // TODO (Phase 9): Implement auto-recovery logic when session expires
        // e.g., create new session and resume the loop
        this.emit('sessionExpired');
      }
    };

    this.ptyManager.on('data', this.sessionDataHandler);
    this.ptyManager.on('exit', this.sessionExitHandler);

    // Handle prompt detection timeout - the Claude command is sent via the
    // fallback timer in waitForShellReady even if prompt detection fails.
    // This catch is intentionally empty since the timeout handles the case.
    void waitForShellReady.catch(() => {
      // No action needed - the fallback timer ensures Claude command is sent
    });
  }

  /**
   * Remove session event handlers
   */
  private removeSessionHandlers(): void {
    if (this.sessionDataHandler) {
      this.ptyManager.removeListener('data', this.sessionDataHandler);
      this.sessionDataHandler = null;
    }
    if (this.sessionExitHandler) {
      this.ptyManager.removeListener('exit', this.sessionExitHandler);
      this.sessionExitHandler = null;
    }
  }

  /**
   * Build the Ralph loop prompt with pinned context
   */
  buildLoopPrompt(
    context: LoopIterationContext,
    controlFiles: {
      promptMd: string;
      agentMd: string;
      fixPlanMd: string;
    },
    learningInjections?: LearningInjections
  ): string {
    return buildLoopPrompt(context, controlFiles, learningInjections);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Execution
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Execute a Ralph iteration
   */
  async executeIteration(
    context: LoopIterationContext,
    prompt: string,
    timeoutMs = 300000
  ): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.outputBuffer = '';
    this.responseBuffer = '';

    // Write the prompt to the PTY
    const fullPrompt = `${prompt}\n\n`;
    const writeSuccess = this.ptyManager.write(this.currentSession.ptySessionId, fullPrompt);
    if (!writeSuccess) {
      throw new Error('Failed to write prompt to PTY session');
    }

    // Wait for execution to complete
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.removeSessionHandlers();
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Execution timeout'));
      }, timeoutMs);

      // Use once for the exit handler so it auto-removes when PTY exits
      const onExit = ({ sessionId }: { sessionId: string; exitCode: number; signal?: number }) => {
        if (sessionId === this.currentSession?.ptySessionId) {
          cleanup();
          resolve(this.outputBuffer);
        }
      };

      try {
        this.ptyManager.once('exit', onExit);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  /**
   * Send a command directly to the session
   */
  writeCommand(command: string): boolean {
    if (!this.currentSession) {
      return false;
    }
    return this.ptyManager.write(this.currentSession.ptySessionId, `${command}\r`);
  }

  /**
   * Get accumulated output
   */
  getOutput(): string {
    return this.outputBuffer;
  }

  /**
   * Get last response (Claude's output)
   */
  getLastResponse(): string {
    return this.responseBuffer;
  }

  /**
   * Resize the PTY terminal
   */
  resize(cols: number, rows: number): boolean {
    if (!this.currentSession) {
      return false;
    }
    return this.ptyManager.resize(this.currentSession.ptySessionId, cols, rows);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Resume Behavior
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle resume when stored session is missing or stale
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleResumeFailure(_reason: 'missing' | 'stale' | 'invalid'): SessionState {
    this.emit('sessionExpired');

    // Clean up old session if exists
    if (this.currentSession) {
      this.ptyManager.kill(this.currentSession.ptySessionId);
      this.currentSession = null;
    }

    // Remove old event handlers
    this.removeSessionHandlers();

    // Create fresh session
    return this.createNewSession();
  }

  /**
   * Check if current session can resume
   */
  canResume(): boolean {
    if (!this.currentSession) {
      return false;
    }
    return this.isSessionValid(this.currentSession);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * End the current session
   */
  endSession(): void {
    if (this.currentSession) {
      this.ptyManager.kill(this.currentSession.ptySessionId);
      this.currentSession = null;
    }
    // Remove event handlers to prevent accumulation
    this.removeSessionHandlers();
    this.outputBuffer = '';
    this.responseBuffer = '';
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton management
// ─────────────────────────────────────────────────────────────────────────────

const executionInstances: Map<string, RalphExecutionAdapter> = new Map();

export function getRalphExecution(workspacePath: string): RalphExecutionAdapter {
  let execution = executionInstances.get(workspacePath);
  if (!execution) {
    execution = new RalphExecutionAdapter(workspacePath);
    executionInstances.set(workspacePath, execution);
  }
  return execution;
}

export function getAllRalphExecutions(): Map<string, RalphExecutionAdapter> {
  return executionInstances;
}

export function resetRalphExecution(workspacePath?: string): void {
  if (workspacePath) {
    const execution = executionInstances.get(workspacePath);
    if (execution) {
      execution.endSession();
    }
    executionInstances.delete(workspacePath);
  } else {
    for (const [, exec] of executionInstances) {
      exec.endSession();
    }
    executionInstances.clear();
  }
}
