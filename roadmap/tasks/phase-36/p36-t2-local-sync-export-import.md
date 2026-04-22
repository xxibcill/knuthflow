# P36-T2 - Local Sync Export Import

## Phase

[Phase 36 - Optional Sync and Fleet Operations](../../phases/phase-36-optional-sync-fleet-operations.md)

## Objective

Implement local file or repository export-import sync for approved data classes.

## Deliverables

- Export selected syncable data to a versioned sync bundle.
- Import sync bundles with preview and validation.
- Support local folder or git-backed repository as a sync target.
- Preserve local-only machine data.
- Record sync history and source.
- Provide rollback guidance for failed import.

## Dependencies

- P36-T1 data classification is complete.
- Review bundle and governance bundle export concepts exist.

## Acceptance Criteria

- Operators can export and import approved sync data locally.
- Import previews changes before applying.
- Non-syncable data is excluded by default.
- Failed imports do not corrupt local state.
