# P30-T3 - Secure Connector Secrets

## Phase

[Phase 30 - Tool Connector Hub](../../phases/phase-30-tool-connector-hub.md)

## Objective

Store and rotate connector credentials through secure storage without leaking secrets to renderer logs or artifacts.

## Deliverables

- Store connector tokens, API keys, and credentials using existing secure storage.
- Keep renderer-facing connector config redacted.
- Add credential update and delete flows.
- Add health checks that use credentials only in the main process or another trusted boundary.
- Prevent connector secrets from being included in review bundles, logs, artifacts, or diagnostics exports.
- Add tests or manual checks for redaction behavior.

## Dependencies

- Secure storage service is available.
- Connector settings UI defines secret fields.

## Acceptance Criteria

- Connector secrets are not persisted in plaintext settings or renderer state.
- Redacted values are shown in UI.
- Deleting a connector removes associated credentials.
- Diagnostics and artifact exports exclude connector secrets.
