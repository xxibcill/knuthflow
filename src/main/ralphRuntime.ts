import { EventEmitter } from 'events';
import { getDatabase, LoopRun } from './database';
import {
  LoopState,
  StopReason,
  SafetyStop,
  LoopIterationContext,
  RalphRuntimeConfig,
  DEFAULT_RALPH_RUNTIME_CONFIG,
} from '../shared/ralphTypes';
import { performStartupRecovery, validateRuntimeState, type RecoveryReport } from './ralph/ralphRecovery';

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Runtime Events
// ─────────────────────────────────────────────────────────────────────────────

export interface RalphRuntimeEvents {
  stateChanged: (state: LoopState) => void;
  iterationStarted: (context: LoopIterationContext) => void;
  iterationCompleted: (context: LoopIterationContext, success: boolean) => void;
  stopped: (stop: SafetyStop) => void;
  paused: () => void;
  resumed: () => void;
}

export type RalphRuntimeEvent = keyof RalphRuntimeEvents;

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Runtime
// @TODO(Phase 10): Add unit tests for state transitions, timeout handling, and concurrency
// ─────────────────────────────────────────────────────────────────────────────

export class RalphRuntime extends EventEmitter {
  private db = getDatabase();
  private config: Required<RalphRuntimeConfig>;

  // Active run state per workspace
  private activeRuns: Map<string, {
    run: LoopRun;
    state: LoopState;
    currentContext: LoopIterationContext | null;
    safetyStop: SafetyStop | null;
    iterationStartTime: number | null;
  }> = new Map();

  // Reverse index: runId -> projectId for fast lookups
  private runIdToProjectId: Map<string, string> = new Map();

  // Project ID -> runId index for O(1) getActiveRunForProject lookups
  private projectIdToRunId: Map<string, string> = new Map();

  constructor(config: Partial<RalphRuntimeConfig> = {}) {
    super();
    // Set max listeners to prevent warning with many concurrent runs
    this.setMaxListeners(100);
    this.config = { ...DEFAULT_RALPH_RUNTIME_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Run Lifecycle Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start a new Ralph loop run for a workspace
   */
  start(projectId: string, name: string, sessionId: string, ptySessionId: string): LoopRun {
    // Check if a start is already in progress for this project (race condition prevention)
    if (projectsStarting.has(projectId)) {
      throw new Error(`Start already in progress for project ${projectId}`);
    }

    // Mark start as in progress
    projectsStarting.add(projectId);
    try {
      // Check for existing active run in this workspace
      const existingRun = this.getActiveRunForProject(projectId);
      if (existingRun) {
        throw new Error(`Active run already exists for project ${projectId}: ${existingRun.run.name}`);
      }

      // Create new loop run in database
      const run = this.db.createLoopRun(projectId, name);
      this.db.startLoopRun(run.id, sessionId, ptySessionId);

      // Initialize runtime state
      this.activeRuns.set(run.id, {
        run: { ...run, status: 'running' },
        state: 'starting',
        currentContext: null,
        safetyStop: null,
        iterationStartTime: null,
      });

      // Update reverse index
      this.runIdToProjectId.set(run.id, projectId);
      this.projectIdToRunId.set(projectId, run.id);
      // Register in global reverse index for O(1) IPC handler lookups
      runIdToRuntime.set(run.id, this);

      // Periodically clean up stale entries to prevent unbounded memory growth
      this.enforceActiveRunsLimit();

      this.emit('stateChanged', 'starting');
      return run;
    } finally {
      projectsStarting.delete(projectId);
    }
  }

  /**
   * Pause the current run
   */
  pause(runId: string): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error(`No active run found: ${runId}`);
    }

    if (activeRun.state === 'paused') {
      return; // Already paused
    }

    if (!['starting', 'planning', 'executing', 'validating'].includes(activeRun.state)) {
      throw new Error(`Cannot pause run in state: ${activeRun.state}`);
    }

    activeRun.state = 'paused';
    this.emit('stateChanged', 'paused');
    this.emit('paused');
  }

  /**
   * Resume a paused run
   */
  resume(runId: string): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error(`No active run found: ${runId}`);
    }

    if (activeRun.state !== 'paused') {
      throw new Error(`Cannot resume run in state: ${activeRun.state}`);
    }

    // Resume to executing state (loop continues)
    activeRun.state = 'executing';
    this.emit('stateChanged', 'executing');
    this.emit('resumed');
  }

  /**
   * Stop a run with a reason
   */
  stop(runId: string, reason: StopReason, message: string, canResume = false, metadata?: Record<string, unknown>): void {
    const safetyStop: SafetyStop = {
      reason,
      message,
      triggeredAt: Date.now(),
      canResume,
      metadata,
    };

    const status = reason === 'error'
      ? 'failed'
      : reason === 'user_stopped'
        ? 'cancelled'
        : 'completed';
    this.finishRun(runId, status, message, safetyStop);
  }

  /**
   * Force stop without safety record (emergency)
   */
  forceStop(runId: string): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      console.warn(`[RalphRuntime] forceStop called on non-existent run: ${runId}`);
      return;
    }

    const safetyStop: SafetyStop = {
      reason: 'user_stopped',
      message: 'Force stopped by operator',
      triggeredAt: Date.now(),
      canResume: false,
    };
    this.finishRun(runId, 'cancelled', 'Force stopped', safetyStop);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // State Transitions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Transition to planning state
   */
  transitionToPlanning(runId: string): void {
    this.transitionState(runId, 'planning');
  }

  /**
   * Transition to executing state
   */
  transitionToExecuting(runId: string): void {
    this.transitionState(runId, 'executing');
  }

  /**
   * Transition to validating state
   */
  transitionToValidating(runId: string): void {
    this.transitionState(runId, 'validating');
  }

  /**
   * Complete current iteration and check for more work
   */
  completeIteration(runId: string, iteration: number, nextPrompt: string): boolean {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error(`No active run found: ${runId}`);
    }

    // Increment iteration count in database
    this.db.incrementLoopRunIteration(runId);

    // Check if we've hit max iterations
    if (iteration >= this.config.maxIterations) {
      this.stop(runId, 'no_progress', `Reached maximum iterations (${this.config.maxIterations})`, false);
      return false;
    }

    // Update current context for next iteration
    if (activeRun.currentContext) {
      activeRun.currentContext = {
        ...activeRun.currentContext,
        iteration: iteration + 1,
        prompt: nextPrompt,
        startedAt: Date.now(),
      };
    } else {
      // Initialize new context if none exists
      activeRun.currentContext = {
        iteration: iteration + 1,
        selectedItem: null,
        acceptanceGate: null,
        prompt: nextPrompt,
        sessionId: null,
        startedAt: Date.now(),
      };
    }

    this.emit('iterationCompleted', activeRun.currentContext, true);
    return true;
  }

  /**
   * Record iteration start
   */
  recordIterationStart(runId: string, context: LoopIterationContext): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error(`No active run found: ${runId}`);
    }

    activeRun.currentContext = context;
    activeRun.iterationStartTime = Date.now();
    this.emit('iterationStarted', context);
  }

  private transitionState(runId: string, newState: LoopState): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error(`No active run found: ${runId}`);
    }

    const validTransitions: Record<LoopState, LoopState[]> = {
      idle: ['starting'],
      starting: ['planning', 'executing', 'paused', 'failed', 'cancelled', 'completed'],
      planning: ['executing', 'paused', 'failed', 'cancelled', 'completed'],
      executing: ['validating', 'paused', 'failed', 'cancelled', 'completed'],
      validating: ['planning', 'executing', 'paused', 'failed', 'cancelled', 'completed'],
      paused: ['executing', 'failed', 'cancelled', 'completed'],
      failed: [],
      cancelled: [],
      completed: [],
    };

    if (!validTransitions[activeRun.state].includes(newState)) {
      throw new Error(`Invalid state transition: ${activeRun.state} -> ${newState}`);
    }

    activeRun.state = newState;
    this.emit('stateChanged', newState);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Query Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get active run for a project (O(1) lookup)
   */
  getActiveRunForProject(projectId: string): { run: LoopRun; state: LoopState } | null {
    const runId = this.projectIdToRunId.get(projectId);
    if (!runId) {
      return null;
    }
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      return null;
    }
    return { run: activeRun.run, state: activeRun.state };
  }

  /**
   * Get runtime state for a run
   */
  getRuntimeState(runId: string): LoopState | null {
    const activeRun = this.activeRuns.get(runId);
    return activeRun?.state ?? null;
  }

  /**
   * Get current iteration context
   */
  getCurrentContext(runId: string): LoopIterationContext | null {
    const activeRun = this.activeRuns.get(runId);
    return activeRun?.currentContext ?? null;
  }

  /**
   * Get safety stop for a run
   */
  getSafetyStop(runId: string): SafetyStop | null {
    const activeRun = this.activeRuns.get(runId);
    return activeRun?.safetyStop ?? null;
  }

  /**
   * Check if a run is active
   */
  isRunActive(runId: string): boolean {
    return this.activeRuns.has(runId);
  }

  /**
   * Get all active run IDs for a project
   */
  getActiveRunIds(projectId: string): string[] {
    const ids: string[] = [];
    for (const [runId, activeRun] of this.activeRuns) {
      if (activeRun.run.projectId === projectId) {
        ids.push(runId);
      }
    }
    return ids;
  }

  /**
   * Check if iteration timeout has been exceeded
   */
  isIterationTimedOut(runId: string): boolean {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun?.iterationStartTime) {
      return false;
    }
    return Date.now() - activeRun.iterationStartTime > this.config.iterationTimeoutMs;
  }

  /**
   * Check if idle timeout has been exceeded
   */
  isIdleTimedOut(runId: string): boolean {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun?.iterationStartTime) {
      return false;
    }
    return Date.now() - activeRun.iterationStartTime > this.config.idleTimeoutMs;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Clean up a run from active memory
   */
  cleanupRun(runId: string): void {
    const projectId = this.runIdToProjectId.get(runId);
    if (projectId) {
      this.projectIdToRunId.delete(projectId);
    }
    this.activeRuns.delete(runId);
    this.runIdToProjectId.delete(runId);
    runIdToRuntime.delete(runId);
  }

  /**
   * Get the number of active runs
   */
  getActiveRunCount(): number {
    return this.activeRuns.size;
  }

  /**
   * Clean up stale entries from active memory
   * Call periodically to prevent unbounded memory growth
   */
  cleanupStaleEntries(maxAgeMs = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [runId, activeRun] of this.activeRuns) {
      // Clean up runs that are in terminal states and older than maxAgeMs
      if (activeRun.state === 'failed' || activeRun.state === 'cancelled' || activeRun.state === 'completed') {
        const lastActivity = activeRun.iterationStartTime ?? activeRun.run.createdAt;
        if (now - lastActivity > maxAgeMs) {
          this.cleanupRun(runId);
          cleaned++;
        }
      }
    }
    return cleaned;
  }

  /**
   * Periodically clean up stale entries to prevent unbounded memory growth
   * Called internally when activeRuns size exceeds threshold
   */
  private enforceActiveRunsLimit(): void {
    // Clean if we have more than 50 entries and it's been a while
    if (this.activeRuns.size > 50) {
      this.cleanupStaleEntries();
    }
  }

  private finishRun(runId: string, status: 'completed' | 'failed' | 'cancelled', error: string, safetyStop: SafetyStop): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error(`No active run found: ${runId}`);
    }

    activeRun.run = { ...activeRun.run, status, endTime: Date.now(), error };
    activeRun.safetyStop = safetyStop;
    activeRun.state = status;

    this.db.endLoopRun(runId, status, null, null, error);

    this.emit('stateChanged', activeRun.state);
    this.emit('stopped', safetyStop);
    this.cleanupRun(runId);
  }

  /**
   * Find runtime by runId using the module-level reverse index
   */
  findRuntimeByRunId(runId: string): RalphRuntime | null {
    return getRuntimeForRunId(runId);
  }

  /**
   * Check if this runtime owns a specific run
   */
  ownsRun(runId: string): boolean {
    return this.activeRuns.has(runId);
  }

  /**
   * Get runtime configuration
   */
  getConfig(): Readonly<Required<RalphRuntimeConfig>> {
    return { ...this.config };
  }

  /**
   * Update runtime configuration
   */
  updateConfig(updates: Partial<RalphRuntimeConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Recovery Operations (Phase 11)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Perform startup recovery for all stale runs in this runtime's projects.
   * Called when runtime is first initialized.
   */
  async performRecovery(projectId: string, workspacePath: string, activePtySessionIds: Set<string>): Promise<RecoveryReport> {
    return performStartupRecovery(projectId, workspacePath, activePtySessionIds);
  }

  /**
   * Validate runtime state consistency and clean up orphaned entries.
   */
  validateAndCleanup(projectId: string): { consistent: boolean; issues: string[] } {
    return validateRuntimeState(projectId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance management
// ─────────────────────────────────────────────────────────────────────────────

const runtimeInstances: Map<string, RalphRuntime> = new Map();
const runIdToRuntime: Map<string, RalphRuntime> = new Map();
// Projects currently executing start() - prevents race conditions
const projectsStarting: Set<string> = new Set();

export function getRalphRuntime(projectId: string): RalphRuntime {
  let runtime = runtimeInstances.get(projectId);
  if (!runtime) {
    runtime = new RalphRuntime();
    runtimeInstances.set(projectId, runtime);
  }
  return runtime;
}

export function getAllRalphRuntimes(): Map<string, RalphRuntime> {
  return runtimeInstances;
}

/**
 * Get runtime that owns a specific runId (O(1) lookup)
 */
export function getRuntimeForRunId(runId: string): RalphRuntime | null {
  return runIdToRuntime.get(runId) ?? null;
}

export function resetRalphRuntime(projectId?: string): void {
  if (projectId) {
    const runtime = runtimeInstances.get(projectId);
    if (runtime) {
      // Clean up all active runs for this runtime by calling cleanupRun
      for (const runId of runtime.getActiveRunIds(projectId)) {
        runtime.cleanupRun(runId);
      }
      // Clear the starting flag if set
      projectsStarting.delete(projectId);
    }
    runtimeInstances.delete(projectId);
  } else {
    // Clean up ALL active runs across ALL runtimes before clearing
    for (const [rtProjectId, runtime] of runtimeInstances) {
      for (const runId of runtime.getActiveRunIds(rtProjectId)) {
        runtime.cleanupRun(runId);
      }
    }
    runtimeInstances.clear();
    runIdToRuntime.clear();
    projectsStarting.clear();
  }
}
