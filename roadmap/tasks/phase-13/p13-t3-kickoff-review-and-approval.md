# P13-T3 - Kickoff Review And Approval

## Phase

[Phase 13 - Goal To App Bootstrap](../../phases/phase-13-goal-to-app-bootstrap.md)

## Objective

Give the operator a clear review step to inspect and approve the generated app blueprint before autonomous build execution begins.

## Deliverables

- A kickoff review surface in the Ralph console showing generated specs, milestones, scaffold choices, and acceptance gates.
- Editing affordances for correcting key blueprint artifacts before the first autonomous run.
- An approval action that records the reviewed blueprint version and starts the app-building run against that version.

## Dependencies

- Blueprint generation from `P13-T1`.
- Workspace scaffolding and template application from `P13-T2`.

## Acceptance Criteria

- The operator can review the generated app plan in the desktop UI before Ralph starts building.
- Starting the build requires an explicit approval step tied to the reviewed blueprint version.
- If the operator edits the blueprint, the approval state is invalidated until the revised plan is reviewed again.
