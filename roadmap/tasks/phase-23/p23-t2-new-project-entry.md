# P23-T2 - New Project Entry

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Build the primary entry path for creating a new Ralph project from an app brief.

## Deliverables

- Add or refine a "Create app brief" entry point on the Ralph default screen.
- Let the operator choose or create a target workspace folder before files are written.
- Capture app name, app brief, target platforms, delivery format, success criteria, stack preferences, forbidden patterns, max build time, and browser targets.
- Validate required intake fields before blueprint generation.
- Preserve draft intake state if the user navigates away and returns during the same session.
- Surface dependency blockers such as missing Claude Code separately from intake validation.
- Route successful intake submission to blueprint review.

## Dependencies

- App intake form and validation APIs exist.
- Workspace creation/selection APIs exist.
- Phase 22 empty state actions route to this flow.

## Acceptance Criteria

- A first-time user can start a new Ralph project without first opening the terminal.
- Invalid intake drafts show actionable errors and do not write files.
- The target workspace is explicit before blueprint files are generated or written.
- The next step after successful intake is blueprint review, not immediate execution.
