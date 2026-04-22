# P22-T3 - Default Route

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Make the first screen Ralph-focused by defaulting the renderer to the Ralph console or Ralph project start screen.

## Deliverables

- Change the initial view mode from generic workspace selection to the Ralph console or Ralph start screen.
- Ensure restored active sessions still route to the right place without hiding active Ralph runs.
- Decide how direct terminal session restoration should appear in a Ralph-first shell.
- Ensure the no-workspace state still gives the user a clear Ralph starting action.
- Update smoke tests that assume the workspace page is the first screen.

## Dependencies

- Ralph console can render without a selected workspace.
- Phase 21 terminology defines the correct first-screen language.

## Acceptance Criteria

- Launching the app without active sessions shows a Ralph-first screen.
- Launching with active Ralph run state surfaces that run before generic terminal state.
- Launching with only a generic restored terminal session still gives access without displacing Ralph navigation.
- Updated tests assert the new default route.
