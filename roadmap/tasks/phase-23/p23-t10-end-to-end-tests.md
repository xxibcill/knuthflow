# P23-T10 - End-To-End Tests

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Add e2e coverage for the Ralph-first project flow from intake or existing folder through readiness, run start, artifacts, and delivery reachability.

## Deliverables

- Add a new-project happy path test using fixture intake data.
- Add an existing workspace conversion or repair test.
- Add a run-start test with mocked or controlled Claude Code/PTY behavior where feasible.
- Add artifact display and plan panel reachability checks.
- Add delivery panel reachability check for a scaffolded or fixture project.
- Add recovery-path coverage for at least one blocked state.
- Keep tests deterministic and isolated with temporary user data and workspaces.

## Dependencies

- Phase 23 workflow tasks are implemented.
- Existing Playwright/Electron test harness is functional.
- Test helpers can create fixture workspaces.

## Acceptance Criteria

- Tests prove the primary Ralph path does not require manual terminal navigation.
- Tests cover both new project and existing project entry.
- Tests clean up temporary workspaces and user data.
- Any skipped test has a documented environment reason.
