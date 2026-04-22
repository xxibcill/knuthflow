# P30-T5 - Policy-Scoped Connectors

## Phase

[Phase 30 - Tool Connector Hub](../../phases/phase-30-tool-connector-hub.md)

## Objective

Enforce connector permissions through workspace policy.

## Deliverables

- Add connector permission fields to effective policy.
- Check policy before connector reads, writes, publishing, deployment, status posting, or monitoring ingestion.
- Block connector actions outside the configured project scope.
- Add override workflow for connector actions if allowed by policy.
- Record policy-blocked connector attempts as safety artifacts.

## Dependencies

- Phase 29 policy enforcement exists.
- Connector capability interfaces expose operation type and target scope.

## Acceptance Criteria

- Connector actions are blocked when policy denies them.
- Operators see which policy rule blocked the connector action.
- Connector permissions can be scoped per project.
- Tests cover at least one allowed and one blocked connector action.
