# P36-T4 - Conflict Resolution

## Phase

[Phase 36 - Optional Sync and Fleet Operations](../../phases/phase-36-optional-sync-fleet-operations.md)

## Objective

Add conflict detection and resolution for settings, policies, blueprints, and governance bundles.

## Deliverables

- Detect version and timestamp conflicts during import/pull.
- Show conflicting records with local, incoming, and base metadata where available.
- Support keep local, accept incoming, duplicate, or manual merge where feasible.
- Prevent silent overwrite of policy, governance, or approved blueprint changes.
- Record conflict decisions in sync history.

## Dependencies

- Sync bundle import can compare local and incoming data.
- Version metadata exists for policies and blueprints.

## Acceptance Criteria

- Conflicts are detected before data is overwritten.
- Operators can choose a resolution per conflict or batch where safe.
- Governance and policy conflicts require explicit decision.
- Conflict outcomes are auditable.
