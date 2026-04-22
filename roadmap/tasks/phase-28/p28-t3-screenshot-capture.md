# P28-T3 - Screenshot Capture

## Phase

[Phase 28 - Preview Evidence and Visual Validation](../../phases/phase-28-preview-evidence-visual-validation.md)

## Objective

Capture desktop and mobile screenshots plus browser console evidence from previewed apps.

## Deliverables

- Use browser automation to open configured preview routes.
- Capture screenshots for desktop and mobile viewport presets.
- Capture browser console errors and page errors.
- Capture failed network requests where useful.
- Store screenshots and evidence as Ralph artifacts linked to run, route, and viewport.
- Skip or mark unavailable when browser automation dependencies are missing.

## Dependencies

- Preview process manager can provide a reachable URL.
- Artifact storage supports binary or file-backed screenshot references.

## Acceptance Criteria

- Screenshots are captured for at least one route and two viewport sizes.
- Console/page errors are attached to the same validation evidence.
- Captured artifacts appear in the run dashboard or artifact list.
- Missing browser automation is reported as skipped, not as a silent pass.
