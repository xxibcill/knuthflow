# P30-T1 - Connector Abstraction

## Phase

[Phase 30 - Tool Connector Hub](../../phases/phase-30-tool-connector-hub.md)

## Objective

Define connector capability interfaces and registry so Ralph can integrate external tools without ad hoc coupling.

## Deliverables

- Define connector manifest fields: id, name, version, provider, capabilities, permission requirements, and configuration schema.
- Define capability interfaces for issues, repositories, design sources, registries, deployment targets, and monitoring signals.
- Add connector registry for built-in and future extension-provided connectors.
- Define health check and diagnostics contracts.
- Define error shape for auth failure, permission denied, rate limit, network failure, and unsupported capability.

## Dependencies

- Phase 29 policy model exists for connector permissions.
- Secure storage and diagnostics systems are available.

## Acceptance Criteria

- Connectors implement a stable capability interface.
- Unsupported capabilities fail predictably.
- Connector registry can list available connectors and their health state.
- The abstraction does not require any connector to be configured for local-only Ralph use.
