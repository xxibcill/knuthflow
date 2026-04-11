# Phase 12: Refactor Main Process Entry

## Status

**Phase:** Planned
**Created:** 2026-04-11

## Overview

Refactor `src/index.ts` (1325 lines) from the monolithic main process entry point into logical, focused modules. This is the last oversized file remaining after Phase 8's refactoring effort.

## Motivation

The `src/index.ts` file is the main process entry point that:
- Wires all IPC handlers together
- Shares mutable state (`mainWindow`, `ptyManager`, `activeRuns`, etc.)
- Handles app lifecycle (createWindow, app.on events)

While functional, it's difficult to maintain, test, and review due to its size and the tight coupling of concerns.

## Challenges

1. **Shared mutable state** — `mainWindow`, `activeProcesses`, `activeRuns`, `ptyManager` are referenced by many handlers
2. **Central wiring hub** — IPC handlers are closure-based and capture this shared state
3. **Lifecycle dependencies** — App lifecycle handlers depend on all subsystems being initialized

## Proposed Approach

### Option A: Module-based Extraction

Extract groups of related IPC handlers into separate modules while maintaining shared state in a central location:

```
src/main/
  index.ts                    # Entry point, wires everything together
  ipc/
    processHandlers.ts       # process:spawn, process:send, process:kill, process:list
    ptyHandlers.ts           # pty:create, pty:write, pty:resize, pty:kill, pty:list
    claudeHandlers.ts        # claude:detect, claude:launch, claude:kill, etc.
    workspaceHandlers.ts     # workspace:*
    sessionHandlers.ts       # session:*
    settingsHandlers.ts      # settings:*
    ralphHandlers.ts          # ralph:*, ralphRuntime:*, ralphScheduler:*, ralphSafety:*
```

### Option B: Service-based Architecture

Introduce service classes that own their state and expose methods for IPC handlers:

```
src/main/
  index.ts                    # Entry point, creates services, wires IPC
  services/
    ProcessManager.ts         # Manages activeProcesses
    PtyService.ts            # Manages PTY sessions, wraps ptyManager
    RunManager.ts            # Manages activeRuns
    ClaudeService.ts         # Claude Code detection and launch
    AppLifecycle.ts          # App lifecycle management
```

## Tasks

- [ ] Analyze `src/index.ts` structure and identify extraction boundaries
- [ ] Design IPC handler group modules or service classes
- [ ] Implement extracted modules
- [ ] Update `src/index.ts` to use extracted modules
- [ ] Verify all functionality works (IPC, lifecycle, PTY, etc.)
- [ ] Type check and lint pass

## Files to Refactor

- `src/index.ts` (1325 lines) → Extract IPC handler groups or refactor to service architecture

## Success Criteria

- [ ] `src/index.ts` reduced to ~500 lines or less
- [ ] All IPC handlers functional (tested via renderer)
- [ ] App launches correctly
- [ ] Type check passes
- [ ] No new lint warnings introduced
