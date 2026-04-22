# P36-T3 - Sync Provider Abstraction

## Phase

[Phase 36 - Optional Sync and Fleet Operations](../../phases/phase-36-optional-sync-fleet-operations.md)

## Objective

Define optional remote sync provider interface without making cloud sync mandatory.

## Deliverables

- Define provider capabilities for list, pull, push, health check, conflict metadata, and auth requirements.
- Keep local file/repository sync as the default provider.
- Integrate provider permissions with policy and connector governance.
- Add provider health and diagnostics.
- Define future extension point for provider implementations.

## Dependencies

- Local sync export/import exists.
- Connector and extension frameworks are available if provider integrations are externalized.

## Acceptance Criteria

- Sync provider interface supports local-first operation.
- Remote providers are optional.
- Provider failures are recoverable and do not block local Ralph use.
- Policy can disable remote sync providers.
