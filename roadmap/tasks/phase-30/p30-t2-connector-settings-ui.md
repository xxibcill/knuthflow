# P30-T2 - Connector Settings UI

## Phase

[Phase 30 - Tool Connector Hub](../../phases/phase-30-tool-connector-hub.md)

## Objective

Build connector setup, health, scope, and configuration UI.

## Deliverables

- List available connectors with enabled/disabled/needs-auth/error states.
- Provide configuration forms based on connector schema.
- Show connector health check results and last checked time.
- Let operators scope connectors per project or globally where policy allows.
- Provide test connection and disconnect actions.
- Show permission requirements before enabling a connector.

## Dependencies

- P30-T1 connector registry exists.
- Secure storage integration is available for secret fields.

## Acceptance Criteria

- Operators can enable, configure, test, and disable connectors.
- Secret fields are never displayed after saving.
- Connector scope and permissions are clear before activation.
- Failed health checks show actionable errors.
