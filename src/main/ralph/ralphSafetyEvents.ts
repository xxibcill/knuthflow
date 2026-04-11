import type { RateLimitState, CircuitBreakerState, SafetyStop } from '../../shared/ralphTypes';

export interface RalphSafetyEvents {
  rateLimitHit: (state: RateLimitState) => void;
  circuitOpened: (state: CircuitBreakerState) => void;
  circuitClosed: () => void;
  timeoutHit: (type: 'idle' | 'iteration', elapsedMs: number) => void;
  safetyStopTriggered: (stop: SafetyStop) => void;
}

export type RalphSafetyEvent = keyof RalphSafetyEvents;
