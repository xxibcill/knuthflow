import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getPtyManager } from './ptyManager';
import { LoopIterationContext, ScheduledItem, AcceptanceGate, RalphRuntimeConfig, DEFAULT_RALPH_RUNTIME_CONFIG } from '../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Execution Events
// ─────────────────────────────────────────────────────────────────────────────

export interface RalphExecutionEvents {
  output: (data: string) => void;
  error: (error: string) => void;
  sessionExpired: () => void;
  completed: (response: string) => void;
}

export type RalphExecutionEvent = keyof RalphExecutionEvents;

// ─────────────────────────────────────────────────────────────────────────────
// Claude Session State
// ─────────────────────────────────────────────────────────────────────────────

interface SessionState {
  sessionId: string;
  ptySessionId: string;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
  isValid: boolean;
}

// Session expiration time (24 hours)
// TODO: Make configurable via RalphRuntimeConfig
const SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000;

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
  private getStoredSession(sessionId: string): SessionState | null {
    // TODO: Implement persistent session storage
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

    const detection = this.detectClaudeCode();
    if (!detection.installed || !detection.executablePath) {
      this.emit('error', 'Claude Code not installed');
      return;
    }

    // Wait for shell to be ready, then send Claude command
    let shellReady = false;
    const timeout = setTimeout(() => {
      if (!shellReady) {
        shellReady = true;
        const cmd = `"${detection.executablePath}" --no-input\r`;
        this.ptyManager.write(session.ptySessionId, cmd);
      }
    }, this.config.shellReadyTimeoutMs);

    this.sessionDataHandler = ({ sessionId, data }) => {
      if (sessionId === session.ptySessionId && !shellReady) {
        // Check for shell prompt indicators (covers most common shells and custom prompts)
        // Includes: $, #, > (for some shells), and common prompt markers
        if (data.includes('$') || data.includes('#') || data.includes('>')) {
          shellReady = true;
          clearTimeout(timeout);
          const cmd = `"${detection.executablePath}" --no-input\r`;
          this.ptyManager.write(session.ptySessionId, cmd);
        }
      }

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
        // TODO: Implement auto-recovery logic when session expires
        // e.g., create new session and resume the loop
        this.emit('sessionExpired');
      }
    };

    this.ptyManager.on('data', this.sessionDataHandler);
    this.ptyManager.on('exit', this.sessionExitHandler);
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
   * Detect Claude Code installation
   */
  private detectClaudeCode(): { installed: boolean; executablePath: string | null; version: string | null } {
    const possiblePaths = process.platform === 'darwin'
      ? ['/usr/local/bin/claude', '/opt/homebrew/bin/claude', '/usr/bin/claude']
      : ['/usr/local/bin/claude', '/usr/bin/claude'];

    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);
    const allPaths = [...new Set([...possiblePaths, ...pathDirs.map(p => path.join(p, 'claude'))])];

    for (const execPath of allPaths) {
      try {
        if (fs.existsSync(execPath)) {
          const versionOutput = execSync(`"${execPath}" --version`, {
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : null;

          return { installed: true, executablePath: execPath, version };
        }
      } catch (err) {
        // Continue searching - log debug info if needed
        console.debug(`[RalphExecution] Claude Code detection failed for ${execPath}:`, err instanceof Error ? err.message : String(err));
      }
    }

    return { installed: false, executablePath: null, version: null };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompt Construction
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Build the Ralph loop prompt with pinned context
   */
  buildLoopPrompt(context: LoopIterationContext, controlFiles: {
    promptMd: string;
    agentMd: string;
    fixPlanMd: string;
  }): string {
    const parts: string[] = [];

    // Stack summary header
    parts.push('=== RALPH LOOP CONTEXT ===');
    parts.push(`Iteration: ${context.iteration}`);
    parts.push(`Started: ${new Date(context.startedAt).toISOString()}`);

    // Selected item
    if (context.selectedItem) {
      parts.push('');
      parts.push('=== CURRENT TASK ===');
      parts.push(`Item: ${context.selectedItem.title}`);
      parts.push(`Status: ${context.selectedItem.status}`);
      if (context.acceptanceGate) {
        parts.push(`Acceptance Gate: ${context.acceptanceGate.type} - ${context.acceptanceGate.description}`);
      }
    }

    // Control file content
    parts.push('');
    parts.push('=== OPERATOR PROMPT ===');
    parts.push(controlFiles.promptMd);

    // Agent configuration
    parts.push('');
    parts.push('=== AGENT CONFIG ===');
    parts.push(controlFiles.agentMd);

    // Current fix plan excerpt (relevant section)
    parts.push('');
    parts.push('=== FIX PLAN ===');
    parts.push(this.extractRelevantPlanSection(controlFiles.fixPlanMd, context.selectedItem));

    // Previous loop summary if available
    if (context.iteration > 1) {
      parts.push('');
      parts.push('=== PREVIOUS ITERATION ===');
      parts.push('Review the terminal output from the previous iteration.');
    }

    parts.push('');
    parts.push('=== INSTRUCTIONS ===');
    parts.push('1. Focus ONLY on the current task item');
    parts.push('2. Make minimal, targeted changes');
    parts.push('3. Run acceptance gate verification when complete');
    parts.push('4. Report progress and any blockers');
    parts.push('5. Exit cleanly when done');

    return parts.join('\n');
  }

  /**
   * Extract the relevant section of fix_plan.md for the selected item
   */
  private extractRelevantPlanSection(fixPlanMd: string, selectedItem: ScheduledItem | null): string {
    if (!selectedItem) {
      // Return first 50 lines of plan
      return fixPlanMd.split('\n').slice(0, 50).join('\n');
    }

    const lines = fixPlanMd.split('\n');
    const selectedTitle = selectedItem.title;

    // Find the line with the selected item
    let startLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(selectedTitle)) {
        startLine = i;
        break;
      }
    }

    if (startLine === -1) {
      return fixPlanMd;
    }

    // Extract context around the selected item (20 lines before and after)
    const start = Math.max(0, startLine - 20);
    const end = Math.min(lines.length, startLine + 40);
    return lines.slice(start, end).join('\n');
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
