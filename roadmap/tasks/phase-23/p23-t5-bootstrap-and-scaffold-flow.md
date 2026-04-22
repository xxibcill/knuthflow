# P23-T5 - Bootstrap And Scaffold Flow

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Connect blueprint approval to file writing, scaffold generation, Ralph bootstrap, readiness validation, and recovery handling.

## Deliverables

- Write approved blueprint files to the selected workspace.
- Generate or update `PROMPT.md`, `AGENT.md`, `fix_plan.md`, `specs/`, `.ralph`, and blueprint metadata as appropriate.
- Scaffold starter project files based on delivery format and target platform where supported.
- Preserve existing operator-authored control files unless repair/force behavior is explicitly chosen.
- Validate readiness immediately after bootstrap and show the result.
- Roll back or clearly report partial writes if a step fails.
- Record created, updated, skipped, and failed file operations for operator visibility.

## Dependencies

- Blueprint write API exists.
- Ralph bootstrap and workspace scaffolder APIs exist.
- Readiness validation API exists.

## Acceptance Criteria

- Approved blueprint can produce a Ralph-ready workspace through the UI.
- The operator can see which files were created, updated, or preserved.
- Readiness is checked after bootstrap and drives the next primary action.
- Failed bootstrap does not leave the user without recovery guidance.
