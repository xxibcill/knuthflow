# Phase 28 - Preview Evidence and Visual Validation

## Functional Feature Outcome

Ralph can launch app previews, capture screenshots, detect visible regressions, and attach visual evidence to run artifacts and delivery review.

## Why This Phase Exists

Ralph can collect textual artifacts, run build/test/lint checks, and package delivery bundles, but many app failures are visual or interactive: blank screens, broken layouts, overlapping text, unusable mobile breakpoints, missing assets, and incorrect navigation. Operators need evidence that a delivered app actually renders and behaves at key viewports. This phase adds preview-driven evidence and visual validation so Ralph's delivery confidence is based on observable app behavior, not only command success.

## Scope

- Detect project preview commands and launch local preview servers safely.
- Add preview lifecycle management with port allocation, timeout handling, process cleanup, and logs.
- Integrate Playwright or equivalent browser automation for screenshot capture.
- Capture desktop and mobile viewport screenshots for key app routes.
- Add visual smoke checks for blank pages, severe console errors, missing root content, and obvious layout overflow.
- Attach screenshots, console logs, and network errors as Ralph artifacts.
- Surface visual evidence in the run dashboard and delivery panel.
- Add operator approval gates for visual review before release confirmation.
- Support manual route configuration in specs or blueprint metadata when auto-discovery is insufficient.
- Keep preview execution bounded and local, with clear recovery when commands fail.

## Tasks

| Task | Summary |
| --- | --- |
| [P28-T1](../tasks/phase-28/p28-t1-preview-command-detection.md) | Detect and configure local preview commands for scaffolded apps |
| [P28-T2](../tasks/phase-28/p28-t2-preview-process-manager.md) | Manage preview server lifecycle, ports, timeouts, cleanup, and logs |
| [P28-T3](../tasks/phase-28/p28-t3-screenshot-capture.md) | Capture desktop/mobile screenshots and browser console evidence |
| [P28-T4](../tasks/phase-28/p28-t4-visual-smoke-checks.md) | Add blank-screen, console-error, missing-content, and overflow checks |
| [P28-T5](../tasks/phase-28/p28-t5-visual-artifact-viewer.md) | Surface screenshots and visual evidence in Ralph dashboard and delivery UI |
| [P28-T6](../tasks/phase-28/p28-t6-visual-review-gates.md) | Add visual approval gates before release confirmation |

## Dependencies

- Phase 25 release workflow and delivery panel must be stable.
- Milestone validation and delivery services must support attaching artifacts.
- Preview command detection from existing validation logic should be reused where possible.
- Playwright or browser automation must be available in the local environment or gracefully skipped.

## Exit Criteria

- Ralph can launch a supported app preview and clean it up after validation.
- Ralph captures screenshots for configured routes and viewports.
- Visual evidence appears as run artifacts and delivery review material.
- Blank preview, severe browser console failure, or missing root content blocks release until reviewed.
- Operators can approve or reject delivery using visual evidence.
