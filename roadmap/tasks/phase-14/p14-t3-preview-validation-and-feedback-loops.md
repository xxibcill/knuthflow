# P14-T3 - Preview Validation And Feedback Loops

## Phase

[Phase 14 - Long-Horizon App Builder](../../phases/phase-14-long-horizon-app-builder.md)

## Objective

Feed previews, builds, tests, and other grounded evidence back into Ralph so it can correct app-construction mistakes before the end of the run.

## Deliverables

- Preview/build/test/lint runners that emit milestone-scoped evidence and artifacts.
- Feedback rules that can trigger targeted rework, milestone rollback, or replanning based on failed evidence.
- Operator-visible summaries of why Ralph accepted, rejected, or reworked a milestone.

## Dependencies

- Milestone-aware execution from `P14-T1`.
- Existing validation and artifact modules from Phases 09 through 12.

## Acceptance Criteria

- A failed preview or validation step can push Ralph back into corrective work without manual operator glue.
- Validation evidence is attached to the corresponding milestone and surfaced in the desktop UI.
- Milestone completion requires explicit grounded evidence rather than only model output claiming success.
