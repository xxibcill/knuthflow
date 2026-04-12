# Phase 12 - Ralph Flow Upgrade

## Functional Feature Outcome

Knuthflow can run a real Ralph loop that follows the repo's one-item-at-a-time operator model with grounded prompts, targeted validation, and usable operator controls.

## Why This Phase Exists

The repository already contains substantial Ralph-related infrastructure, but the current flow is still fragmented across bootstrap, scheduler, runtime, validation, and console modules. This phase exists to turn those partial pieces into a coherent end-to-end Ralph loop that matches the product intent: deterministic control files, stable plan state, narrow backpressure, and an operator console that controls real runtime behavior instead of placeholders or incomplete IPC seams.

## Scope

- Build an end-to-end Ralph loop controller that owns scheduling, prompt assembly, execution, validation, analysis, and checkpointing.
- Replace placeholder Ralph control-file defaults with an operator-oriented prompt stack designed for one-item-per-loop execution.
- Make `fix_plan.md` state stable and machine-usable across selection, validation, artifacts, and replanning.
- Complete the operator/runtime wiring for replan, validation, and artifact inspection.
- Add automated coverage for the upgraded Ralph flow and recovery-critical paths.

## Tasks

| Task | Summary |
| --- | --- |
| [P12-T1](../tasks/phase-12/p12-t1-loop-controller-and-runtime.md) | Implement a real Ralph loop controller that connects runtime, scheduler, execution, validation, and checkpoints. |
| [P12-T2](../tasks/phase-12/p12-t2-control-files-and-plan-semantics.md) | Redesign Ralph control files and `fix_plan.md` semantics so prompts, task identity, and acceptance gates are deterministic. |
| [P12-T3](../tasks/phase-12/p12-t3-operator-console-and-verification.md) | Finish the operator-facing IPC surface and add tests for execution, replanning, validation, and recovery flows. |

## Dependencies

- Phase 07 through Phase 11 Ralph infrastructure exists in the codebase and remains the implementation base for this upgrade.
- PTY-backed Claude Code execution, workspace persistence, and local database state are already stable enough to support autonomous-loop work.
- The team agrees that Ralph remains a single-process, one-item-at-a-time loop rather than a multi-agent orchestration feature.

## Exit Criteria

- A Ralph run can move from readiness checks through task selection, prompt assembly, execution, validation, and checkpointing without manual glue code.
- `PROMPT.md`, `AGENT.md`, `fix_plan.md`, and `specs/` provide a deterministic operator stack that survives iteration-to-iteration context loss.
- The renderer controls for pause, resume, stop, replan, validate, and artifact inspection are backed by implemented IPC handlers and runtime behavior.
- Automated tests cover the main happy path plus validation failure, stale-plan replan, and recovery-related edge cases for Ralph mode.
