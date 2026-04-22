# P30-T4 - Built-In Connectors

## Phase

[Phase 30 - Tool Connector Hub](../../phases/phase-30-tool-connector-hub.md)

## Objective

Add initial built-in connectors for repository, issue, design, registry, and monitoring workflows where feasible.

## Deliverables

- Add repository connector capability for branch/status or metadata operations.
- Add issue tracker connector capability for reading app requests or posting run summaries.
- Add design source connector capability for linking or importing design context.
- Add package registry connector capability for publishing or validating package targets where policy allows.
- Add monitoring connector capability for fetching delivered-app health signals.
- Provide mock or local stub connectors for tests when real services are unavailable.

## Dependencies

- Connector abstraction and settings UI are implemented.
- Policy-scoped connector permissions are defined or in progress.

## Acceptance Criteria

- At least one built-in connector can be configured and health checked.
- Connector operations create structured results or artifacts.
- Real external calls are optional in automated tests.
- Unsupported service-specific actions are clearly reported.
