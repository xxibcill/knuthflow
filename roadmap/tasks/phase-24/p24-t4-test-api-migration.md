# P24-T4 - Test API Migration

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Update e2e tests and helpers to prefer `window.ralph` while retaining focused coverage for the deprecated `window.knuthflow` alias.

## Deliverables

- Migrate Ralph, portfolio, blueprint, delivery, and app-flow test calls to `window.ralph`.
- Add or preserve one compatibility test that asserts `window.knuthflow` exists and supports a safe read-only call.
- Update TypeScript test typings if necessary.
- Avoid fallback helpers that silently use either alias, because that can hide preload regressions.
- Keep temporary user data and workspace test setup unchanged unless Phase 24 data policy requires updates.

## Dependencies

- Runtime and type aliases are implemented.
- Existing e2e harness can execute page-level API calls.

## Acceptance Criteria

- Tests exercise `window.ralph` as the preferred API.
- Compatibility alias is covered explicitly.
- Test failures clearly identify whether new alias or old alias broke.
- No test helper masks missing `window.ralph`.
