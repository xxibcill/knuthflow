# P35-T6 - Resilience Test Harness

## Phase

[Phase 35 - Runtime Resilience and Self-Healing](../../phases/phase-35-runtime-resilience-self-healing.md)

## Objective

Add simulated failure tests for runtime recovery paths.

## Deliverables

- Simulate PTY exit, preview timeout, DB lock or integrity failure, connector timeout, extension failure, and scheduler stall where feasible.
- Verify health state updates.
- Verify recovery actions are offered.
- Verify safe recovery preserves run/project context.
- Verify risky recovery requests approval.
- Record test coverage gaps that cannot be automated locally.

## Dependencies

- Runtime health and recovery flows exist.
- Test harness can inject or simulate selected failures.

## Acceptance Criteria

- At least three major failure modes are covered by tests.
- Tests prove recovery behavior, not just error detection.
- Simulated failures are isolated and cleaned up.
- Remaining manual resilience checks are documented.
