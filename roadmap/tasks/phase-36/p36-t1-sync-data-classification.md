# P36-T1 - Sync Data Classification

## Phase

[Phase 36 - Optional Sync and Fleet Operations](../../phases/phase-36-optional-sync-fleet-operations.md)

## Objective

Classify syncable, non-syncable, and opt-in-only data before adding any sync mechanism.

## Deliverables

- Classify settings, governance bundles, approved blueprints, extension manifests, review bundles, run summaries, lessons learned, and analytics reports as syncable candidates.
- Classify secrets, local workspace paths, raw logs, source files, terminal transcripts, and delivery artifacts as non-syncable or opt-in-only.
- Define redaction rules and metadata transformations.
- Document data ownership and privacy expectations.
- Add policy hooks for organizations to restrict sync classes.

## Dependencies

- Phase 21 privacy expectations and Phase 34 governance model are available.

## Acceptance Criteria

- Sync data classes are documented before implementation.
- Default sync excludes secrets and source files.
- Opt-in-only classes require explicit operator approval.
- Policy can disable specific sync classes.
