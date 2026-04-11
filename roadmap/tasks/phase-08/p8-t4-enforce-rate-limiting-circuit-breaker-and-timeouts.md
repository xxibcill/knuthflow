# P8-T4 - Enforce Rate Limiting, Circuit Breaker, and Timeouts

## Phase

[Phase 08 - Ralph Scheduler and Safety](../../phases/phase-08-ralph-scheduler-and-safety.md)

## Objective

Implement the safety gates that stop Ralph from burning quota, looping without progress, or hanging forever on broken runs.

## Deliverables

- Call-count and token-count rate limiter state with configurable windows
- Circuit breaker logic for repeated failures, no-progress loops, and permission denials
- Iteration timeout handling that distinguishes productive from idle timeouts
- Persisted stop reasons and cooldown behavior for later inspection and resume logic

## Dependencies

- [P8-T1](./p8-t1-build-ralph-loop-runtime-manager.md)
- [P8-T3](./p8-t3-add-claude-session-continuity-and-execution-adapter.md)

## Acceptance Criteria

- Ralph stops or sleeps predictably when quota or failure thresholds are hit
- Circuit state is durable across app restarts
- Operators can tell whether a stop was caused by rate limits, no progress, timeout, or permissions
- Timeouts do not silently discard productive iterations that changed relevant files
