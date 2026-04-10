# P5-T1 - Add Process Supervision and Recovery

## Phase

[Phase 05 - Reliability and Distribution](../../phases/phase-05-reliability-and-distribution.md)

## Objective

Harden Knuthflow against broken PTYs, unexpected process exits, and app restarts that would otherwise leave the user in a confusing state.

## Deliverables

- Recovery rules for crashed or disconnected sessions
- Cleanup behavior for orphaned runtime state
- Restart behavior for recent sessions where appropriate
- Clear failure messaging when recovery is not possible

## Dependencies

- [P2-T4](../phase-02/p2-t4-launch-and-monitor-claude-code-runs.md)
- [P3-T4](../phase-03/p3-t4-restore-recent-sessions-and-history.md)

## Acceptance Criteria

- App restarts do not silently strand stale session state
- Broken PTYs are detected and handled predictably
- Recovery paths are visible to the user
- Failure cleanup reduces the chance of repeated corruption

## Status

Not Implemented

