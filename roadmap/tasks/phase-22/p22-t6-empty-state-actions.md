# P22-T6 - Empty State Actions

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Replace generic workspace empty states with Ralph-first actions that start or resume a project workflow.

## Deliverables

- Design no-project empty state actions for create app brief, open Ralph project, convert existing folder, and resume recent run.
- Provide dependency-aware messaging when Claude Code is missing.
- Provide workspace-aware messaging when a selected folder is not Ralph-enabled.
- Ensure empty states avoid verbose instructional text and use direct action labels.
- Connect actions to existing intake, workspace picker, bootstrap, or console flows where possible.
- Update tests for the first visible primary action.

## Dependencies

- Phase 22 default route task is complete or in progress.
- Phase 23 project lifecycle model is drafted.

## Acceptance Criteria

- A new user sees a clear Ralph starting action without first understanding workspaces.
- Existing users can find recent or active Ralph work from the empty state.
- Empty states degrade gracefully when dependencies are missing.
- Empty state actions do not route users into a generic terminal as the primary path.
