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

  constructor(config: Partial<RalphRuntimeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_RALPH_RUNTIME_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Run Lifecycle Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start a new Ralph loop run for a workspace
   */
  start(projectId: string, name: string, sessionId: string, ptySessionId: string): LoopRun {
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
    // Register in global reverse index for O(1) IPC handler lookups
    runIdToRuntime.set(run.id, this);

    this.emit('stateChanged', 'starting');
    return run;
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
  stop(runId: string, reason: StopReason, message: string, canResume: boolean = false, metadata?: Record<string, unknown>): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      throw new Error(`No active run found: ${runId}`);
    }

    const safetyStop: SafetyStop = {
      reason,
      message,
      triggeredAt: Date.now(),
      canResume,
      metadata,
    };

    activeRun.safetyStop = safetyStop;
    activeRun.state = reason === 'error' ? 'failed' : 'completed';

    // Update database
    const status = reason === 'error' ? 'failed' : 'completed';
    this.db.endLoopRun(runId, status, null, null, message);

    this.emit('stateChanged', activeRun.state);
    this.emit('stopped', safetyStop);
  }

  /**
   * Force stop without safety record (emergency)
   */
  forceStop(runId: string): void {
    const activeRun = this.activeRuns.get(runId);
    if (!activeRun) {
      return; // Already cleaned up
    }

    this.db.endLoopRun(runId, 'cancelled', null, null, 'Force stopped');
    activeRun.state = 'failed';
    activeRun.safetyStop = {
      reason: 'user_stopped',
      message: 'Force stopped by operator',
      triggeredAt: Date.now(),
      canResume: false,
    };

    this.emit('stateChanged', 'failed');
    this.emit('stopped', activeRun.safetyStop);
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
      starting: ['planning', 'executing', 'paused', 'failed', 'completed'],
      planning: ['executing', 'paused', 'failed', 'completed'],
      executing: ['validating', 'paused', 'failed', 'completed'],
      validating: ['planning', 'executing', 'paused', 'failed', 'completed'],
      paused: ['executing', 'failed', 'completed'],
      failed: [],
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
   * Get active run for a project
   */
  getActiveRunForProject(projectId: string): { run: LoopRun; state: LoopState } | null {
    for (const [, activeRun] of this.activeRuns) {
      if (activeRun.run.projectId === projectId) {
        return { run: activeRun.run, state: activeRun.state };
      }
    }
    return null;
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
    this.activeRuns.delete(runId);
    this.runIdToProjectId.delete(runId);
    runIdToRuntime.delete(runId);
  }

  /**
   * Find runtime by runId using reverse index
   */
  findRuntimeByRunId(runId: string): RalphRuntime | null {
    const projectId = this.runIdToProjectId.get(runId);
    if (!projectId) {
      return null;
    }
    // Return 'this' since all runtimes are managed via singleton pattern
    // and we use the reverse index to check if this runtime owns the run
    return this.activeRuns.has(runId) ? this : null;
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance management
// ─────────────────────────────────────────────────────────────────────────────

let runtimeInstances: Map<string, RalphRuntime> = new Map();
// Global reverse index: runId -> RalphRuntime for O(1) lookups
let runIdToRuntime: Map<string, RalphRuntime> = new Map();

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

/**
 * Register a runId with its owning runtime
 */
export function registerRunId(runId: string, runtime: RalphRuntime): void {
  runIdToRuntime.set(runId, runtime);
}

export function resetRalphRuntime(projectId?: string): void {
  if (projectId) {
    const runtime = runtimeInstances.get(projectId);
    if (runtime) {
      // Clean up all active runs for this runtime
      for (const runId of runtime.getActiveRunIds(projectId)) {
        runtime.cleanupRun(runId);
        runIdToRuntime.delete(runId);
      }
    }
    runtimeInstances.delete(projectId);
  } else {
    runtimeInstances.clear();
    runIdToRuntime.clear();
  }
}
