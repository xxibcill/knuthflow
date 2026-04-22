# P27-T6 - Onboarding Tests

## Phase

[Phase 27 - Operator Onboarding and Guided First Run](../../phases/phase-27-operator-onboarding-guided-first-run.md)

## Objective

Add e2e coverage for first launch, dependency checks, guided sample brief, workspace selection, and transition into the normal Ralph dashboard.

## Deliverables

- Add a first-launch test using isolated user data.
- Verify onboarding appears only when completion state is absent.
- Verify dependency checklist renders and can recheck.
- Verify a sample brief can generate a blueprint or reach the mocked review state.
- Verify onboarding completion persists across restart.
- Verify replay onboarding from settings/help.

## Dependencies

- P27-T1 through P27-T5 are implemented.
- Existing Electron/Playwright harness can launch with isolated user data.

## Acceptance Criteria

- Tests prove first-time and returning-user paths differ correctly.
- Tests do not depend on real external services.
- Dependency failures are simulated or skipped with documented environment constraints.
- Temporary user data and workspaces are cleaned up.
