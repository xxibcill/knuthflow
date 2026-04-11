# Phase 07 - Ralph Project Bootstrap

## Functional Feature Outcome

Users can turn a supported workspace into a Ralph-ready project with control files, persistent loop state, and readiness validation before autonomous execution starts.

## Why This Phase Exists

Ralph needs an explicit contract between the workspace, the prompt stack, and the persisted runtime state. Without bootstrap and integrity checks, the loop would be running against guesswork and stale files.

## Scope

- Ralph project model and storage layout
- Bootstrap flow for `PROMPT.md`, `AGENT.md`, `fix_plan.md`, `specs/`, and `.ralph/`
- Loop state persistence and plan snapshots
- Workspace readiness and integrity validation

## Tasks

| Task | Summary |
| --- | --- |
| [P7-T1](../tasks/phase-07/p7-t1-define-ralph-project-domain-model.md) | Define the Ralph project, loop state, and snapshot model that later phases will share |
| [P7-T2](../tasks/phase-07/p7-t2-bootstrap-ralph-control-stack.md) | Create and repair the Ralph control files inside a workspace without destructive overwrites |
| [P7-T3](../tasks/phase-07/p7-t3-add-workspace-readiness-and-integrity-validation.md) | Validate that a workspace is safe and complete enough to start or resume a Ralph run |
| [P7-T4](../tasks/phase-07/p7-t4-expose-ralph-project-apis-through-ipc.md) | Expose Ralph bootstrap, readiness, and status data through secure IPC contracts |

## Dependencies

- Phase 05 complete
- Existing workspace and session persistence remains the source of truth for app-owned state

## Exit Criteria

- A workspace can be initialized into a Ralph-ready project with one explicit action
- Ralph control files and `.ralph/` runtime state persist predictably between app restarts
- Missing or malformed Ralph files are detected before a run starts
- Renderer code can inspect Ralph project readiness without direct filesystem access
