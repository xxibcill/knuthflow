# P19-T5 - Maintenance UI

## Phase

[Phase 19 - Autonomous Post-Delivery Iteration](../../phases/phase-19.md)

## Objective

Add maintenance run surfacing in desktop UI with clear visual distinction from fresh app builds.

## Deliverables

- Maintenance run indicator: visually distinct badge/icon for auto-triggered runs vs. operator-initiated runs
- Maintenance dashboard: shows all maintenance runs across delivered apps, their trigger reason, and outcome
- Maintenance run detail: shows regression that triggered run, tasks completed, final status
- Maintenance policy configuration: per-app settings for auto-run behavior, notification preferences
- Maintenance vs. fresh build filter: UI toggle to show only maintenance or only fresh builds

## Dependencies

- P19-T2 (Autonomous Scheduling) complete

## Acceptance Criteria

- Maintenance runs visually distinguished from fresh builds in all views
- Operator can see what triggered each maintenance run
- Maintenance policies configurable per app
- Maintenance run history filterable and searchable