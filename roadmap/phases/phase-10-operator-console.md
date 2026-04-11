# Phase 10 - Operator Console

## Functional Feature Outcome

Users can monitor Ralph runs live, inspect the current backlog and generated artifacts, and intervene safely without dropping into hidden runtime state.

## Why This Phase Exists

Autonomy without visibility becomes mistrust. The desktop app needs to show what Ralph is doing, why it chose that work, and how an operator can step in without corrupting the run.

## Scope

- Ralph run dashboard and status model
- Phase timeline and artifact inspection
- Fix plan, selected item, and loop history panels
- Operator controls, confirmations, and safety alerts

## Tasks

| Task | Summary |
| --- | --- |
| [P10-T1](../tasks/phase-10/p10-t1-add-ralph-run-dashboard-and-status-cards.md) | Surface active and historical Ralph runs in the renderer with clear health and progress state |
| [P10-T2](../tasks/phase-10/p10-t2-build-live-phase-timeline-and-artifact-viewer.md) | Show loop phase transitions and inspect prompts, outputs, logs, tests, and diffs |
| [P10-T3](../tasks/phase-10/p10-t3-expose-fix-plan-selected-item-and-loop-history-panels.md) | Expose the current plan frontier, selected item, and prior iteration summaries |
| [P10-T4](../tasks/phase-10/p10-t4-add-operator-controls-and-safety-alerts.md) | Let operators pause, resume, stop, or replan runs with explicit guardrails and alerts |

## Dependencies

- Phase 09 complete
- Optional IDE and diff components may be reused, but they are not required to begin this phase

## Exit Criteria

- Operators can see the active Ralph phase, selected item, and safety state at a glance
- Loop artifacts are inspectable without opening raw files on disk
- Plan changes and loop history are visible enough to explain Ralph's decisions
- Intervention controls are explicit, auditable, and guarded against accidental misuse
