# P3-T4 - Restore Recent Sessions and History

## Phase

[Phase 03 - Workspaces and Sessions](../../phases/phase-03-workspaces-and-sessions.md)

## Objective

Expose recent sessions and restore enough context that users can resume work without guessing what happened last.

## Deliverables

- Recent sessions list
- Session summary metadata such as workspace, start time, end time, and status
- Restore or reopen flow where technically possible
- Basic history view in the app chrome

## Dependencies

- [P3-T2](./p3-t2-create-session-database-schema.md)
- [P3-T3](./p3-t3-add-terminal-tabs-and-session-switching.md)

## Acceptance Criteria

- Users can see recent sessions across app launches
- Session summaries are useful enough to reorient quickly
- Restore behavior is clearly defined for active versus completed sessions
- History does not depend on manually reading logs

