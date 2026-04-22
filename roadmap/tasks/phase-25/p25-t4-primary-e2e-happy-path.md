# P25-T4 - Primary E2E Happy Path

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Add or update an e2e happy path proving the Ralph-first workflow from intake through delivery reachability.

## Deliverables

- Launch the app into the Ralph-first shell.
- Fill or load fixture intake data.
- Generate and review a blueprint.
- Bootstrap or scaffold a temporary workspace.
- Verify readiness state.
- Start or simulate a Ralph run depending on test environment constraints.
- Verify run dashboard, plan/artifact areas, and delivery panel reachability.
- Avoid relying on manual terminal navigation.
- Clean up temporary workspaces and user data.

## Dependencies

- Phase 23 workflow is implemented.
- E2E harness can launch the app and use temporary workspace fixtures.

## Acceptance Criteria

- The test fails if the primary path routes through generic terminal as a required step.
- The test verifies the core screens and state transitions, not only that the app loads.
- Temporary files are isolated and cleaned up.
- Any mocked execution boundary is documented in the test.
