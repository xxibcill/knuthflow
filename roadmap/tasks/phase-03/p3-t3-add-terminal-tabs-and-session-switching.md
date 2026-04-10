# P3-T3 - Add Terminal Tabs and Session Switching

## Phase

[Phase 03 - Workspaces and Sessions](../../phases/phase-03-workspaces-and-sessions.md)

## Objective

Support multiple active or recent session tabs so users can move between workstreams without losing their terminal context.

## Deliverables

- Tab model for active sessions
- UI for creating, naming, selecting, and closing tabs
- Active-session binding between tab state and terminal instance
- Rules for handling closed or failed tabs

## Dependencies

- [P2-T4](../phase-02/p2-t4-launch-and-monitor-claude-code-runs.md)
- [P3-T2](./p3-t2-create-session-database-schema.md)

## Acceptance Criteria

- Users can switch between multiple terminal-backed sessions
- The active tab matches the active terminal content
- Closing a tab does not corrupt other session state
- Tab state is ready for future restore logic

## Status

Not Implemented

