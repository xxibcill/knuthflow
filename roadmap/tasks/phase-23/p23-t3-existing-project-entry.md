# P23-T3 - Existing Project Entry

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Build the entry path for opening an existing Ralph project or converting an existing folder into a Ralph-ready workspace.

## Deliverables

- Add or refine "Open Ralph project" action.
- Detect whether the selected folder is already registered as a workspace.
- Detect whether the selected folder contains Ralph control files and `.ralph` metadata.
- For Ralph-enabled folders, load project, readiness, runs, artifacts, and delivery state.
- For non-enabled folders, offer conversion/bootstrap without overwriting operator-authored files.
- For partially enabled folders, offer repair actions based on readiness issues.
- Preserve recent project ordering and last-opened behavior.
- Provide clear errors for missing folders, inaccessible paths, and malformed project metadata.

## Dependencies

- Workspace selector and validation APIs exist.
- Ralph readiness, bootstrap, and project APIs exist.

## Acceptance Criteria

- Opening a valid Ralph folder lands on its project dashboard.
- Opening a non-Ralph folder offers conversion rather than generic terminal launch.
- Repair actions identify what will be created, updated, or preserved.
- Missing or inaccessible folders produce recovery messaging, not uncaught errors.
