# P35-T1 - Runtime Health Model

## Phase

[Phase 35 - Runtime Resilience and Self-Healing](../../phases/phase-35-runtime-resilience-self-healing.md)

## Objective

Define runtime health checks and service status model for Ralph core services.

## Deliverables

- Define health states for main process services, renderer subscriptions, PTY manager, Ralph runtime, scheduler, preview servers, database, secure storage, connectors, and extensions.
- Add health check intervals and severity levels.
- Surface degraded service state in diagnostics and project dashboard where relevant.
- Store recent health events for troubleshooting.
- Define which failures are auto-recoverable and which require operator approval.

## Dependencies

- Existing supervisor, logs, runtime, database, connector, and preview services expose status.

## Acceptance Criteria

- Ralph can report health for major runtime services.
- Degraded states are visible and actionable.
- Health checks do not materially degrade app performance.
- Recovery policy is defined per service type.
