# P27-T4 - Onboarding Recovery

## Phase

[Phase 27 - Operator Onboarding and Guided First Run](../../phases/phase-27-operator-onboarding-guided-first-run.md)

## Objective

Add onboarding recovery states for missing dependencies, invalid workspaces, blocked permissions, failed bootstrap, and failed readiness validation.

## Deliverables

- Define recovery copy and actions for each onboarding blocker.
- Provide actions to recheck dependencies, choose a different workspace, retry bootstrap, inspect details, or open settings.
- Preserve intake draft and selected workspace while resolving recoverable issues.
- Avoid overwriting or deleting files during recovery unless the operator explicitly approves repair.
- Log onboarding failures for diagnostics.

## Dependencies

- P27-T2 dependency checklist exists.
- Phase 23 recovery states are available or can be reused.

## Acceptance Criteria

- Onboarding failures produce clear recovery actions.
- Recovering from a failure does not require re-entering the app brief unless necessary.
- File repair behavior is explicit and non-destructive by default.
- Recovery states are covered by tests or a manual QA checklist.
