# P22-T10 - Visual Regression Pass

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Verify the Ralph-first shell changes do not introduce layout, overflow, navigation, or responsive regressions.

## Deliverables

- Run the app locally after shell and navigation changes.
- Inspect desktop and narrow viewport layouts for text overflow, clipped navigation, and broken button hierarchy.
- Verify first screen, settings, terminal, Ralph console, portfolio, blueprints, and about screen still render.
- Check that changed labels fit inside buttons and segmented controls.
- Capture screenshots if the workflow normally uses visual review artifacts.
- Log visual issues as follow-up tasks or fix them before the phase exits.

## Dependencies

- Visible brand, navigation, default route, and copy tasks are implemented.
- Local dev server or Electron start flow works.

## Acceptance Criteria

- Ralph-first shell is visually coherent on supported viewport sizes.
- No primary navigation label is clipped or unreadable.
- No text overlaps or obscures primary actions.
- All major top-level views remain reachable and render without obvious visual breakage.
