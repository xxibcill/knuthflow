# P7-T4 - Expose Ralph Project APIs Through IPC

## Phase

[Phase 07 - Ralph Project Bootstrap](../../phases/phase-07-ralph-project-bootstrap.md)

## Objective

Expose Ralph bootstrap, readiness, and state inspection through secure IPC so the renderer can work with autonomous projects without gaining raw filesystem power.

## Deliverables

- Main-process services for Ralph project bootstrap, validation, and inspection
- Preload types and IPC channels for Ralph workspace operations
- Renderer-ready read models for control files, loop state, and last summary metadata
- Security boundaries that restrict Ralph file access to known workspaces

## Dependencies

- [P1-T2](../phase-01/p1-t2-define-process-boundaries-and-ipc.md)
- [P7-T1](./p7-t1-define-ralph-project-domain-model.md)
- [P7-T2](./p7-t2-bootstrap-ralph-control-stack.md)

## Acceptance Criteria

- Renderer code can bootstrap and inspect Ralph workspaces without direct Node access
- IPC contracts are typed and stable enough for later UI work
- Workspace-scoped file access is enforced in the main process
- Ralph-specific APIs do not weaken the existing Electron security boundary
