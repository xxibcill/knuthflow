import { EventEmitter } from 'events';
import { getDatabase } from './database';
import {
  RateLimitState,
  CircuitBreakerState,
  SafetyStop,
  StopReason,
  RalphRuntimeConfig,
  DEFAULT_RALPH_RUNTIME_CONFIG,
} from '../shared/ralphTypes';

export type { RalphSafetyEvents, RalphSafetyEvent } from './ralph/ralphSafetyEvents';

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Safety Monitor
// ─────────────────────────────────────────────────────────────────────────────

export class RalphSafetyMonitor extends EventEmitter {
  private db = getDatabase();
  private config: Required<RalphRuntimeConfig>;

  // Per-project safety state
  private safetyStates: Map<string, {
    rateLimit: RateLimitState;
    circuitBreaker: CircuitBreakerState;
    lastActivityAt: number;
  }> = new Map();

  constructor(config: Partial<RalphRuntimeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_RALPH_RUNTIME_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a call is allowed under rate limits
   */
  canMakeCall(projectId: string): boolean {
    const state = this.getRateLimitState(projectId);
    return state.callsRemaining > 0 && state.tokensRemaining > 0;
  }

  /**
   * Record a call and token usage
   */
  recordCall(projectId: string, tokensUsed = 0): void {
    const state = this.getRateLimitState(projectId);

    // Check if window has expired
    if (Date.now() - state.windowStartMs > this.config.rateLimitWindowMs) {
      // Reset window
      state.windowStartMs = Date.now();
      state.callCount = 0;
      state.tokenCount = 0;
      state.callsRemaining = this.config.maxCallCountPerWindow;
      state.tokensRemaining = this.config.maxTokenCountPerWindow;
    }

    state.callCount++;
    state.tokenCount += tokensUsed;
    state.callsRemaining = Math.max(0, this.config.maxCallCountPerWindow - state.callCount);
    state.tokensRemaining = Math.max(0, this.config.maxTokenCountPerWindow - state.tokenCount);

    this.persistRateLimitState(projectId, state);

    if (state.callsRemaining === 0 || state.tokensRemaining === 0) {
      this.emit('rateLimitHit', state);
    }
  }

  /**
   * Get rate limit state for a project
   */
  getRateLimitState(projectId: string): RateLimitState {
    const existing = this.safetyStates.get(projectId);
    if (existing) {
      return existing.rateLimit;
    }

    // Load from database or create fresh
    const stored = this.loadPersistedRateLimit(projectId);
    const state: RateLimitState = stored || {
      callCount: 0,
      tokenCount: 0,
      windowStartMs: Date.now(),
      callsRemaining: this.config.maxCallCountPerWindow,
      tokensRemaining: this.config.maxTokenCountPerWindow,
    };

    this.safetyStates.set(projectId, {
      rateLimit: state,
      circuitBreaker: this.getCircuitBreakerState(projectId),
      lastActivityAt: Date.now(),
    });

    return state;
  }

  /**
   * Persist rate limit state to database
   */
  private persistRateLimitState(projectId: string, state: RateLimitState): void {
    const existing = this.safetyStates.get(projectId);
    if (existing) {
      existing.rateLimit = state;
    }
    // Persist to database
    try {
      const circuitBreaker = existing?.circuitBreaker || this.getCircuitBreakerState(projectId);
      this.db.upsertSafetyState(projectId, state, circuitBreaker);
    } catch (err) {
      console.error('[RalphSafety] Failed to persist rate limit state:', err);
    }
  }

  /**
   * Load persisted rate limit state from database
   */
  private loadPersistedRateLimit(projectId: string): RateLimitState | null {
    try {
      const stored = this.db.getSafetyState(projectId);
      if (stored) {
        return stored.rateLimitState as RateLimitState;
      }
    } catch (err) {
      console.error('[RalphSafety] Failed to load persisted rate limit state:', err);
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Circuit Breaker
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if circuit is open (blocking execution)
   */
  isCircuitOpen(projectId: string): boolean {
    const state = this.getCircuitBreakerState(projectId);

    if (!state.isOpen) {
      return false;
    }

    // Check if cooldown has passed
    if (state.cooldownUntil && Date.now() >= state.cooldownUntil) {
      // Auto-reset after cooldown
      this.resetCircuit(projectId);
      return false;
    }

    return true;
  }

  /**
   * Record a failure
   */
  recordFailure(projectId: string): void {
    const state = this.getCircuitBreakerState(projectId);
    state.failureCount++;
    state.lastFailureAt = Date.now();

    if (state.failureCount >= this.config.circuitBreakerFailureThreshold) {
      this.openCircuit(projectId, state);
    }

    this.persistCircuitBreakerState(projectId, state);
  }

  /**
   * Record no progress (iteration completed but didn't advance)
   */
  recordNoProgress(projectId: string): void {
    const state = this.getCircuitBreakerState(projectId);
    state.noProgressCount++;
    state.lastNoProgressAt = Date.now();

    if (state.noProgressCount >= this.config.circuitBreakerNoProgressThreshold) {
      const stop: SafetyStop = {
        reason: 'no_progress',
        message: `No progress for ${state.noProgressCount} iterations`,
        triggeredAt: Date.now(),
        canResume: true,
        metadata: {
          noProgressCount: state.noProgressCount,
          lastNoProgressAt: state.lastNoProgressAt,
        },
      };
      this.emit('safetyStopTriggered', stop);
    }

    this.persistCircuitBreakerState(projectId, state);
  }

  /**
   * Record a permission denial
   */
  recordPermissionDenial(projectId: string): void {
    const state = this.getCircuitBreakerState(projectId);
    state.permissionDenialCount++;
    state.lastPermissionDenialAt = Date.now();

    // Permission denials are serious - open circuit immediately
    this.openCircuit(projectId, state);

    const stop: SafetyStop = {
      reason: 'permission_denied',
      message: 'Permission denial detected',
      triggeredAt: Date.now(),
      canResume: false,
      metadata: {
        permissionDenialCount: state.permissionDenialCount,
        lastPermissionDenialAt: state.lastPermissionDenialAt,
      },
    };

    this.emit('safetyStopTriggered', stop);
    this.persistCircuitBreakerState(projectId, state);
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(projectId: string, state: CircuitBreakerState): void {
    state.isOpen = true;
    state.openedAt = Date.now();
    state.cooldownUntil = Date.now() + this.config.circuitBreakerCooldownMs;

    this.emit('circuitOpened', state);

    const stop: SafetyStop = {
      reason: 'circuit_open',
      message: `Circuit opened after ${state.failureCount} failures`,
      triggeredAt: Date.now(),
      canResume: true,
      metadata: {
        failureCount: state.failureCount,
        cooldownUntil: state.cooldownUntil,
      },
    };

    this.emit('safetyStopTriggered', stop);
  }

  /**
   * Reset circuit breaker (after successful operation)
   */
  resetCircuit(projectId: string): void {
    const state = this.getCircuitBreakerState(projectId);
    state.failureCount = 0;
    state.noProgressCount = 0;
    state.permissionDenialCount = 0;
    state.isOpen = false;
    state.openedAt = null;
    state.cooldownUntil = null;

    this.persistCircuitBreakerState(projectId, state);
    this.emit('circuitClosed');
  }

  /**
   * Get circuit breaker state for a project
   */
  getCircuitBreakerState(projectId: string): CircuitBreakerState {
    const existing = this.safetyStates.get(projectId);
    if (existing) {
      return existing.circuitBreaker;
    }

    // Load from database or create fresh
    const stored = this.loadPersistedCircuitBreaker(projectId);
    const state: CircuitBreakerState = stored || {
      failureCount: 0,
      noProgressCount: 0,
      permissionDenialCount: 0,
      lastFailureAt: null,
      lastNoProgressAt: null,
      lastPermissionDenialAt: null,
      isOpen: false,
      openedAt: null,
      cooldownUntil: null,
    };

    this.safetyStates.set(projectId, {
      rateLimit: this.getRateLimitState(projectId),
      circuitBreaker: state,
      lastActivityAt: Date.now(),
    });

    return state;
  }

  /**
   * Persist circuit breaker state to database
   */
  private persistCircuitBreakerState(projectId: string, state: CircuitBreakerState): void {
    const existing = this.safetyStates.get(projectId);
    if (existing) {
      existing.circuitBreaker = state;
    }
    // Persist to database
    try {
      const rateLimit = existing?.rateLimit || this.getRateLimitState(projectId);
      this.db.upsertSafetyState(projectId, rateLimit, state);
    } catch (err) {
      console.error('[RalphSafety] Failed to persist circuit breaker state:', err);
    }
  }

  /**
   * Load persisted circuit breaker state from database
   */
  private loadPersistedCircuitBreaker(projectId: string): CircuitBreakerState | null {
    try {
      const stored = this.db.getSafetyState(projectId);
      if (stored) {
        return stored.circuitBreakerState as CircuitBreakerState;
      }
    } catch (err) {
      console.error('[RalphSafety] Failed to load persisted circuit breaker state:', err);
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Timeout Handling
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check for timeout conditions
   */
  checkTimeout(projectId: string, iterationStartTime: number | null): SafetyStop | null {
    if (!iterationStartTime) {
      return null;
    }

    const now = Date.now();
    const elapsedMs = now - iterationStartTime;

    // Check iteration timeout
    if (elapsedMs > this.config.iterationTimeoutMs) {
      // Distinguish productive vs idle timeout
      // If we have recent activity, it might be productive
      const state = this.safetyStates.get(projectId);
      const lastActivity = state?.lastActivityAt ?? 0;
      const isIdle = now - lastActivity > this.config.iterationTimeoutMs / 2;

      const reason: StopReason = isIdle ? 'timeout_idle' : 'timeout_iteration';

      const stop: SafetyStop = {
        reason,
        message: isIdle
          ? `Idle timeout after ${Math.floor(elapsedMs / 60000)} minutes`
          : `Iteration timeout after ${Math.floor(elapsedMs / 60000)} minutes`,
        triggeredAt: now,
        canResume: true,
        metadata: {
          elapsedMs,
          iterationTimeoutMs: this.config.iterationTimeoutMs,
          isIdle,
        },
      };

      this.emit('timeoutHit', isIdle ? 'idle' : 'iteration', elapsedMs);
      this.emit('safetyStopTriggered', stop);

      return stop;
    }

    // Check idle timeout
    if (elapsedMs > this.config.idleTimeoutMs) {
      const stop: SafetyStop = {
        reason: 'timeout_idle',
        message: `Idle timeout after ${Math.floor(elapsedMs / 60000)} minutes`,
        triggeredAt: now,
        canResume: true,
        metadata: {
          elapsedMs,
          idleTimeoutMs: this.config.idleTimeoutMs,
        },
      };

      this.emit('timeoutHit', 'idle', elapsedMs);
      this.emit('safetyStopTriggered', stop);

      return stop;
    }

    return null;
  }

  /**
   * Record activity (to distinguish productive vs idle)
   */
  recordActivity(projectId: string): void {
    const state = this.safetyStates.get(projectId);
    if (state) {
      state.lastActivityAt = Date.now();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Safety Evaluation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if execution is allowed (all safety gates pass)
   */
  canExecute(projectId: string): { allowed: boolean; reason?: SafetyStop } {
    // Check rate limits
    if (!this.canMakeCall(projectId)) {
      const rateLimit = this.getRateLimitState(projectId);
      return {
        allowed: false,
        reason: {
          reason: 'rate_limit',
          message: `Rate limit reached: ${rateLimit.callsRemaining} calls, ${rateLimit.tokensRemaining} tokens remaining`,
          triggeredAt: Date.now(),
          canResume: true,
          metadata: { rateLimit },
        },
      };
    }

    // Check circuit breaker
    if (this.isCircuitOpen(projectId)) {
      const state = this.getCircuitBreakerState(projectId);
      return {
        allowed: false,
        reason: {
          reason: 'circuit_open',
          message: 'Circuit breaker is open',
          triggeredAt: state.openedAt ?? Date.now(),
          canResume: true,
          metadata: {
            cooldownUntil: state.cooldownUntil,
            failureCount: state.failureCount,
          },
        },
      };
    }

    return { allowed: true };
  }

  /**
   * Get full safety state for a project
   */
  getSafetyState(projectId: string): {
    rateLimit: RateLimitState;
    circuitBreaker: CircuitBreakerState;
    lastActivityAt: number;
  } | null {
    // Periodically clean up stale entries to prevent unbounded memory growth
    // Clean if we have more than 50 entries and it's been a while
    if (this.safetyStates.size > 50) {
      this.cleanupStaleEntries();
    }
    return this.safetyStates.get(projectId) ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RalphRuntimeConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<RalphRuntimeConfig>> {
    return { ...this.config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Reset safety state for a project
   */
  resetProject(projectId: string): void {
    this.safetyStates.delete(projectId);
  }

  /**
   * Clean up stale safety states (entries with no recent activity)
   * Call periodically to prevent unbounded memory growth
   */
  cleanupStaleEntries(maxAgeMs = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [projectId, state] of this.safetyStates) {
      if (now - state.lastActivityAt > maxAgeMs) {
        this.safetyStates.delete(projectId);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Reset all safety state
   */
  resetAll(): void {
    this.safetyStates.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton management
// ─────────────────────────────────────────────────────────────────────────────

const safetyInstances: Map<string, RalphSafetyMonitor> = new Map();

export function getRalphSafety(projectId: string): RalphSafetyMonitor {
  let safety = safetyInstances.get(projectId);
  if (!safety) {
    safety = new RalphSafetyMonitor();
    safetyInstances.set(projectId, safety);
  }
  return safety;
}

export function getAllRalphSafety(): Map<string, RalphSafetyMonitor> {
  return safetyInstances;
}

export function resetRalphSafety(projectId?: string): void {
  if (projectId) {
    safetyInstances.delete(projectId);
  } else {
    safetyInstances.clear();
  }
}
