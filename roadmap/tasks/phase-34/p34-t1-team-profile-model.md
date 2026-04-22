# P34-T1 - Team Profile Model

## Phase

[Phase 34 - Enterprise Workspace Governance](../../phases/phase-34-enterprise-workspace-governance.md)

## Objective

Add team profile and governance bundle model for standardizing Ralph usage across workspaces.

## Deliverables

- Define team profile fields for name, id, source, version, policies, approved blueprints, required gates, connector rules, and environment requirements.
- Define governance bundle manifest and versioning.
- Support local import of governance bundles.
- Associate workspaces or portfolios with a team profile.
- Preserve solo-operator mode when no team profile is active.

## Dependencies

- Policy and blueprint systems are stable.
- Local persistence and import validation are available.

## Acceptance Criteria

- Ralph can load and display a team profile.
- Workspaces can resolve inherited team governance.
- Invalid governance bundles are rejected with clear errors.
- Solo users are not forced into team governance.
