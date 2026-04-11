# P7-T3 - Add Workspace Readiness and Integrity Validation

## Phase

[Phase 07 - Ralph Project Bootstrap](../../phases/phase-07-ralph-project-bootstrap.md)

## Objective

Validate that a Ralph workspace has the required control files, sane SQLite-backed runtime state, and recoverable metadata before autonomous execution begins.

## Deliverables

- Integrity checks for required Ralph files and directories
- Validation rules for missing control files, malformed persisted metadata, stale session IDs, and conflicting locks
- A readiness report with actionable recovery messages
- Hooks that run validation before start, resume, and bootstrap repair actions

## Dependencies

- [P7-T1](./p7-t1-define-ralph-project-domain-model.md)
- [P7-T2](./p7-t2-bootstrap-ralph-control-stack.md)

## Acceptance Criteria

- Missing or malformed Ralph control data or runtime records block a run before Claude is launched
- The readiness report explains what is broken and how to recover
- Validation can distinguish a fresh workspace from a corrupted one
- Resume paths reuse the same readiness checks as cold starts
