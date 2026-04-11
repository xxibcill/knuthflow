# P9-T3 - Implement Output Analysis and Continue or Exit Decisions

## Phase

[Phase 09 - Evidence and Plan Repair](../../phases/phase-09-evidence-and-plan-repair.md)

## Objective

Analyze Ralph iteration results and turn them into a deterministic next action instead of relying on free-form "done" claims from the agent.

## Deliverables

- Structured output parsing with heuristic fallback for unstructured text
- Detection for completion, no progress, permission denials, and repeated failures
- A decision engine that returns continue, replan, pause, fail, or complete outcomes
- A concise loop-summary generator for the next iteration's pinned context

## Dependencies

- [P8-T4](../phase-08/p8-t4-enforce-rate-limiting-circuit-breaker-and-timeouts.md)
- [P9-T2](./p9-t2-build-artifact-capture-and-validation-pipeline.md)

## Acceptance Criteria

- Ralph decisions are explainable from recorded artifacts and analysis state
- False-positive completion signals are reduced through explicit policy checks
- Loop summaries stay short enough to be reused as context on the next iteration
- Continue, replan, and stop paths are represented explicitly in persisted run state
