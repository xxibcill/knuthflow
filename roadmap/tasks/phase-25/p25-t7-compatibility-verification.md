# P25-T7 - Compatibility Verification

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Verify old local data, deprecated API alias, environment variable aliases, and package identity decisions behave as documented.

## Deliverables

- Create or load a fixture representing pre-Ralph-brand local data.
- Verify existing workspaces, sessions, settings, Ralph projects, runs, portfolios, and blueprints open after upgrade.
- Verify `window.ralph` works as the preferred API.
- Verify `window.knuthflow` works if retained as a deprecated alias.
- Verify old and new userData override environment variables according to policy.
- Verify database filename and path behavior according to policy.
- Record any incompatibility and decide whether it blocks release.

## Dependencies

- Phase 24 compatibility and data policy tasks are complete.
- Fixture data can be created without touching real user data.

## Acceptance Criteria

- Compatibility behavior matches documentation.
- Existing data is not lost or hidden.
- Deprecated alias behavior is tested intentionally.
- Any breaking change is explicitly documented and approved.
