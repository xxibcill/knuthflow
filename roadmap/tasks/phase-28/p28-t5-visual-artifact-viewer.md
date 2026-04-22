# P28-T5 - Visual Artifact Viewer

## Phase

[Phase 28 - Preview Evidence and Visual Validation](../../phases/phase-28-preview-evidence-visual-validation.md)

## Objective

Surface screenshots, browser logs, and visual validation results in the Ralph dashboard and delivery UI.

## Deliverables

- Add visual evidence section to the run dashboard or artifact viewer.
- Group screenshots by route, viewport, timestamp, and validation result.
- Show browser console and network evidence near the relevant screenshot.
- Add delivery panel summary of visual validation status.
- Provide open/export actions for screenshot evidence where appropriate.
- Handle missing, skipped, failed, and stale visual evidence states.

## Dependencies

- P28-T3 and P28-T4 produce visual artifacts.
- Existing Ralph artifact viewer can be extended.

## Acceptance Criteria

- Operators can inspect visual evidence without leaving Ralph.
- Failed visual checks are prominent in run and delivery review.
- Evidence is grouped clearly enough to compare viewport results.
- Missing screenshots do not break the artifact viewer.
