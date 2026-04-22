# P28-T4 - Visual Smoke Checks

## Phase

[Phase 28 - Preview Evidence and Visual Validation](../../phases/phase-28-preview-evidence-visual-validation.md)

## Objective

Add visual smoke checks for blank screens, severe console errors, missing content, and obvious layout overflow.

## Deliverables

- Detect blank or near-blank pages using DOM and screenshot heuristics.
- Fail on severe browser console or page errors unless explicitly ignored by policy.
- Verify expected root content or configured selectors.
- Add basic viewport overflow checks for horizontal scroll and clipped primary content.
- Record each check result as structured validation evidence.
- Provide operator-readable explanations for failed visual checks.

## Dependencies

- P28-T3 screenshot and browser evidence capture is implemented.
- Route expectations can come from defaults, specs, or blueprint metadata.

## Acceptance Criteria

- Blank previews are blocked or flagged for review.
- Severe browser errors are visible in validation evidence.
- Visual smoke results are attached to run and delivery review.
- False positives can be configured without disabling all visual validation.
