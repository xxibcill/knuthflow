# P34-T6 - Governance Import Update

## Phase

[Phase 34 - Enterprise Workspace Governance](../../phases/phase-34-enterprise-workspace-governance.md)

## Objective

Import and update governance bundles safely.

## Deliverables

- Add import flow for governance bundle files or configured connector source.
- Validate bundle signature or checksum if provided.
- Show changes before applying an update.
- Preserve previous bundle version for rollback.
- Warn when an update changes required gates, allowed connectors, or approved blueprints.
- Record governance update history.

## Dependencies

- Team profile and policy pack models exist.
- Connector hub may provide remote bundle sources.

## Acceptance Criteria

- Operators can import or update a governance bundle.
- Risky governance changes are previewed before applying.
- Rollback to previous bundle is possible where data remains compatible.
- Invalid bundles do not modify active governance.
