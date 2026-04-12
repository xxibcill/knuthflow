# P15-T1 - Review Packaging And Handoff UI

## Phase

[Phase 15 - Desktop One-Shot Delivery](../../phases/phase-15-desktop-one-shot-delivery.md)

## Objective

Create a desktop flow for reviewing the generated app, approving packaging, and collecting the final deliverables from within Knuthflow.

## Deliverables

- A review surface for generated app structure, milestones, validation evidence, and latest runnable preview.
- Packaging and export controls for supported app targets with explicit approval prompts.
- A handoff view listing final output paths, summaries, and evidence the operator can inspect before release.

## Dependencies

- Long-horizon app-building execution from Phase 14.
- Supported packaging/export commands for the chosen app templates.

## Acceptance Criteria

- The operator can inspect the generated app and trigger supported packaging flows without leaving the desktop app.
- Packaging actions require explicit confirmation when they are expensive, destructive, or release-significant.
- Final outputs are grouped into a clear handoff surface rather than scattered across logs and terminal history.
