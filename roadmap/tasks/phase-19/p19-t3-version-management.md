# P19-T3 - Version Management

## Phase

[Phase 19 - Autonomous Post-Delivery Iteration](../../phases/phase-19.md)

## Objective

Add version management to track delivered app versions, release notes, and update history.

## Deliverables

- `app_versions` table: id, projectId, version, changelog, releasedAt, channel (internal/beta/stable), createdBy (operator/auto)
- Version bumping: semantic versioning (major.minor.patch) with operator-configurable auto-bump rules
- Release notes generation: auto-generate changelog from fix_plan.md completed tasks and commit messages
- Version history UI: timeline of all versions with diff view between versions
- Version promotion: internal → beta → stable with validation gates at each stage

## Dependencies

- P19-T1 (Monitoring Service) complete

## Acceptance Criteria

- Each delivery creates a version record
- Version history shows all releases with changelogs
- Operator can promote version across channels (internal → beta → stable)
- Auto-runs create patch-level versions by default