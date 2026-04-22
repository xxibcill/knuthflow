# P24-T10 - Regression Suite

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Run regression checks focused on preload access, settings persistence, database open, workspace list, Ralph bootstrap, and portfolio APIs.

## Deliverables

- Run typecheck or build to verify API typings.
- Run targeted e2e tests for preload globals and representative APIs.
- Verify settings can be read and written through `window.ralph`.
- Verify database-backed workspace list works with existing data policy.
- Verify Ralph bootstrap APIs work through `window.ralph`.
- Verify portfolio and blueprint APIs work through `window.ralph`.
- Verify `window.knuthflow` compatibility test still passes if alias is retained.
- Record failures and classify them as blockers or follow-ups.

## Dependencies

- Phase 24 implementation tasks are complete.
- Test environment can launch the app or run packaged tests.

## Acceptance Criteria

- Regression results are recorded.
- New Ralph API and old compatibility alias pass the agreed tests.
- Data access works after any path or identity policy changes.
- No blocker remains for Phase 25 release readiness.
