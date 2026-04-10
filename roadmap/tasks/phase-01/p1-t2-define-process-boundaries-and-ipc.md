# P1-T2 - Define Process Boundaries and IPC

## Phase

[Phase 01 - Foundation and Desktop Shell](../../phases/phase-01-foundation-and-desktop-shell.md)

## Objective

Define which responsibilities live in the main process, preload layer, and renderer before feature implementation creates accidental coupling.

## Deliverables

- IPC contract list for renderer-accessible actions
- Ownership rules for process control, storage, filesystem access, and UI state
- Naming conventions for channels or typed APIs
- Documentation for safe expansion of IPC surfaces

## Dependencies

- [P1-T1](./p1-t1-scaffold-electron-shell.md)

## Acceptance Criteria

- Main-process-only responsibilities are explicit
- Renderer-only responsibilities are explicit
- Preload only exposes a minimal, auditable API surface
- Future task docs can reference the IPC contract without ambiguity

## Status

Not Implemented

