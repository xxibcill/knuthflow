# Phase 14 - Long-Horizon App Builder

## Functional Feature Outcome

Ralph can autonomously build a multi-screen or multi-module application over many iterations with milestone-aware planning, context compression, and grounded preview and validation feedback.

## Why This Phase Exists

Generating an entire app is not just a bigger version of a one-item fix loop. It requires long-horizon planning, repeated reprioritization, stable context handoff, milestone tracking, and the ability to validate work across UI, backend, and packaging surfaces without drifting off the original goal. This phase exists to evolve Ralph from a narrow task loop into an app-construction system that can stay coherent over a much larger body of work.

## Scope

- Extend the Ralph controller to manage app-level milestones, task dependencies, and cross-iteration progress accounting.
- Add context compression, evidence distillation, and milestone snapshots so long runs do not lose the product intent.
- Integrate preview, test, lint, build, and artifact feedback into milestone-level loop decisions.
- Give the operator milestone visibility and bounded intervention points instead of per-iteration babysitting.

## Tasks

| Task | Summary |
| --- | --- |
| [P14-T1](../tasks/phase-14/p14-t1-milestone-controller-and-task-graph.md) | Upgrade Ralph from one-item execution into milestone-aware app construction with explicit task graph state and progress accounting. |
| [P14-T2](../tasks/phase-14/p14-t2-context-compression-and-resumability.md) | Preserve long-horizon app context through summaries, milestone snapshots, and resumable compressed state. |
| [P14-T3](../tasks/phase-14/p14-t3-preview-validation-and-feedback-loops.md) | Feed app previews, validation results, and evidence back into the loop so Ralph can correct course while building. |

## Dependencies

- Phase 13 provides deterministic app blueprints and supported starter workspaces.
- Ralph already has working validation, artifact, recovery, and operator-console primitives from earlier phases.
- The supported app targets expose repeatable preview/build/test commands that Knuthflow can run locally.

## Exit Criteria

- Ralph can execute an app build across multiple milestones without losing task identity or original delivery intent.
- Milestone summaries and compressed context let a paused or recovered run continue without rebuilding the full plan manually.
- Validation and preview evidence can trigger targeted rework or replanning during app construction rather than only at the end.
