# P22-T9 - UI Smoke Tests

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Update smoke tests so they verify Ralph branding, default screen behavior, primary actions, and secondary terminal access.

## Deliverables

- Update title assertions from Knuthflow to Ralph if the brand decision changes the title.
- Assert that the app shell renders with Ralph-first default content.
- Assert that the primary Ralph action is visible on first launch.
- Assert that terminal access remains reachable from navigation.
- Update role/name selectors after navigation label changes.
- Keep skip behavior for environments where Electron UI tests cannot run.

## Dependencies

- Default route and navigation changes are implemented.
- The app can be launched in the existing Playwright/Electron harness.

## Acceptance Criteria

- Smoke tests fail if the app launches into the old workspace-first shell.
- Smoke tests fail if visible branding regresses to Knuthflow unexpectedly.
- Smoke tests still prove the shell is visible and terminal access exists.
- Test selectors are stable and not coupled to incidental layout markup.
