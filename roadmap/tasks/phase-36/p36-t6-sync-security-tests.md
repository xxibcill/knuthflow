# P36-T6 - Sync Security Tests

## Phase

[Phase 36 - Optional Sync and Fleet Operations](../../phases/phase-36-optional-sync-fleet-operations.md)

## Objective

Add exclusion, encryption/signing, and sync compatibility tests.

## Deliverables

- Test that secrets, raw source files, terminal transcripts, and disallowed logs are excluded by default.
- Test opt-in-only data requires explicit approval.
- Test signed or checksummed bundle validation where implemented.
- Test conflict detection for settings, policy, and blueprint records.
- Test import rollback or failed-import safety.
- Add manual QA checklist for provider-specific behavior if remote providers are added later.

## Dependencies

- Sync export/import and conflict resolution exist.
- Data classification rules are implemented.

## Acceptance Criteria

- Security tests prove non-syncable data is excluded.
- Conflict tests prevent silent overwrite.
- Failed imports leave local data intact.
- Any unautomated sync security check is documented with risk.
