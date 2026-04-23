# P35-T2 - Stuck Run Detection

## Phase

[Phase 35 - Runtime Resilience and Self-Healing](../../phases/phase-35-runtime-resilience-self-healing.md)

## Objective

Detect stuck runs using heartbeat, output, phase, and timeout signals.

## Deliverables

- Track run heartbeat and last meaningful output.
- Define phase-specific timeout thresholds.
- Detect validation timeout, preview timeout, no-output runtime stalls, and scheduler stalls.
- Show stuck-run state with recovery actions.
- Avoid false positives during legitimate long-running tasks by honoring configured max build time and phase expectations.

## Dependencies

- Ralph runtime state and scheduler state are observable.
- Run lifecycle model supports degraded/stuck states.

## Acceptance Criteria

- Stuck runs are detected before indefinite waiting.
- Operators see why a run is considered stuck.
- Long valid tasks are not interrupted without policy support.
- Stuck run detection is tested with simulated signals.
