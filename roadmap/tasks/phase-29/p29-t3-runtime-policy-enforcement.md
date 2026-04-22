# P29-T3 - Runtime Policy Enforcement

## Phase

[Phase 29 - Policy, Permissions, and Change Governance](../../phases/phase-29-policy-permissions-change-governance.md)

## Objective

Enforce workspace policy during Ralph execution, validation, packaging, and delivery.

## Deliverables

- Check policy before command execution, file write, dependency update, connector call, packaging, and release confirmation.
- Block protected file modifications unless an approved override exists.
- Block forbidden commands before execution.
- Record policy violations as safety artifacts.
- Return actionable errors to the dashboard and runtime.
- Add tests for at least command, file path, and delivery policy enforcement.

## Dependencies

- P29-T1 policy model is implemented.
- Ralph runtime, execution adapter, filesystem writes, and delivery services expose enforcement points.

## Acceptance Criteria

- Policy violations are blocked before risky action occurs.
- Operators see what rule blocked the action and what can be done next.
- Enforcement applies consistently across runtime and delivery surfaces.
- Tests prove blocked commands and protected files cannot proceed silently.
