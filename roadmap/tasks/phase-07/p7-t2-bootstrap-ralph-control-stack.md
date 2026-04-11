# P7-T2 - Bootstrap Ralph Control Stack

## Phase

[Phase 07 - Ralph Project Bootstrap](../../phases/phase-07-ralph-project-bootstrap.md)

## Objective

Let users initialize or repair the Ralph control stack inside a workspace so autonomous runs start from explicit files instead of ad hoc conventions.

## Deliverables

- A bootstrap flow that creates `PROMPT.md`, `AGENT.md`, `fix_plan.md`, `specs/`, and `.ralph/`
- Default template contents aligned with Knuthflow's Ralph loop rules
- A non-destructive update strategy for workspaces that already contain some control files
- Snapshot or backup behavior when templates are regenerated

## Dependencies

- [P7-T1](./p7-t1-define-ralph-project-domain-model.md)

## Acceptance Criteria

- A new workspace can be made Ralph-ready with one explicit action
- Existing user-authored control files are not silently overwritten
- Regenerated templates preserve enough history to recover operator edits
- The bootstrap output is deterministic enough for docs and tests to rely on it
