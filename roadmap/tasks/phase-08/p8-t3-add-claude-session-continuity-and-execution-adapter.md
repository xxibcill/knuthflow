# P8-T3 - Add Claude Session Continuity and Execution Adapter

## Phase

[Phase 08 - Ralph Scheduler and Safety](../../phases/phase-08-ralph-scheduler-and-safety.md)

## Objective

Build the Claude execution layer that assembles pinned Ralph context, captures output artifacts, and reuses the prior session when continuation is still safe.

## Deliverables

- A command builder for Ralph loop prompts with pinned stack and last-loop summary
- Session reuse via stored session IDs with explicit expiration and fallback rules
- Output capture for terminal text, structured responses, and iteration logs
- Resume behavior when the stored session is missing, stale, or invalid

## Dependencies

- [P2-T4](../phase-02/p2-t4-launch-and-monitor-claude-code-runs.md)
- [P5-T1](../phase-05/p5-t1-add-process-supervision-and-recovery.md)
- [P8-T1](./p8-t1-build-ralph-loop-runtime-manager.md)

## Acceptance Criteria

- Successive Ralph iterations can continue the same Claude session when it is still valid
- Expired or broken session state falls back cleanly to a fresh execution path
- Every iteration stores enough prompt and output data for later analysis
- Command construction is deterministic enough to debug and reproduce
