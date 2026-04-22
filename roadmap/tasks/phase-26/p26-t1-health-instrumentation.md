# P26-T1 - Health Instrumentation

## Phase

[Phase 26 - Post-Release Stability and Iteration Foundation](../../phases/phase-26-post-release-stability-and-iteration-foundation.md)

## Objective

Add lightweight launch-time, project-creation, run-start, and delivery-completion instrumentation.

## Deliverables

- Add event emission on app launch (first launch, cold start, warm resume).
- Add event emission on Ralph project creation or bootstrap completion.
- Add event emission on Ralph run start.
- Add event emission on delivery handoff completion.
- Store events in a lightweight local event log (no external phone-home required).
- Ensure events do not include sensitive operator data, file contents, or run artifacts.
- Make event schema extensible so future event types can be added without schema migrations.

## Dependencies

- Phase 25 packaging and launch verification are complete.
- Local SQLite is available for event storage.
- No external telemetry service is required for this task.

## Acceptance Criteria

- App launch event fires on cold start and warm resume.
- Project creation and bootstrap completion events fire with project metadata.
- Run start event fires when a Ralph loop begins execution.
- Delivery completion event fires when an app is handed off.
- Events are stored locally and queryable.
- No sensitive file paths, contents, or operator-identifying data are captured.
