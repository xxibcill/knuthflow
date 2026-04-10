# Phase 03 - Workspaces and Sessions

## Functional Feature Outcome

Users can manage project workspaces, switch between active terminal sessions, and revisit recent work without relying on ad hoc local memory.

## Why This Phase Exists

Once the terminal core works, the wrapper has to earn its keep through organization and continuity. This phase turns the app from a terminal container into a workflow tool.

## Scope

- Workspace management
- SQLite-backed session metadata
- Terminal tab model
- Session restore and history views

## Tasks

| Task | Summary |
| --- | --- |
| [P3-T1](../tasks/phase-03/p3-t1-build-workspace-management.md) | Let users add, remove, select, and reopen workspaces |
| [P3-T2](../tasks/phase-03/p3-t2-create-session-database-schema.md) | Create SQLite tables for workspaces, sessions, and related metadata |
| [P3-T3](../tasks/phase-03/p3-t3-add-terminal-tabs-and-session-switching.md) | Support multiple session tabs with clear active-state switching |
| [P3-T4](../tasks/phase-03/p3-t4-restore-recent-sessions-and-history.md) | Restore recent sessions and expose useful session history |

## Dependencies

- Phase 02 complete
- The product model still centers around local workspaces and local terminal sessions

## Exit Criteria

- Users can select a workspace before launching Claude Code
- Session metadata survives app restarts
- Multiple terminal sessions can be managed without confusion
- Recent history is visible enough to recover context

