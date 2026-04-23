# P35-T3 - Safe Service Restart

## Phase

[Phase 35 - Runtime Resilience and Self-Healing](../../phases/phase-35-runtime-resilience-self-healing.md)

## Objective

Add safe restart and reconcile paths for failed runtime services.

## Deliverables

- Restart failed preview servers when safe.
- Reconcile stale PTY sessions and orphaned run records.
- Recover scheduler stalls without duplicating active runs.
- Reconnect renderer subscriptions after service restart.
- Require operator approval before actions that may affect workspace files or commands.
- Record recovery attempts and outcomes.

## Dependencies

- Runtime health model and stuck-run detection exist.
- Policy rules govern risky recovery actions.

## Acceptance Criteria

- Safe service restarts preserve project context.
- Recovery does not create duplicate runs or orphaned sessions.
- Operators are prompted before risky recovery.
- Recovery attempts are auditable.
