# P12-T1 - Loop Controller And Runtime

## Phase

[Phase 12 - Ralph Flow Upgrade](../../phases/phase-12-ralph-flow-upgrade.md)

## Objective

Implement a single orchestration layer that runs the Ralph loop end to end instead of relying on disconnected scheduler, runtime, and execution helpers.

## Deliverables

- A `RalphLoopController` or equivalent module that owns readiness checks, item selection, context gathering, prompt construction, execution, validation, output analysis, and checkpointing.
- Clear run-state transitions between planning, executing, validating, replanning, pausing, and stopping.
- Runtime/session handling that supports deterministic iteration boundaries and resumable state where the product claims continuity.
- Persisted loop summaries, plan snapshots, and artifacts emitted from the real controller path rather than ad hoc UI plumbing.

## Dependencies

- Existing Ralph runtime, scheduler, execution adapter, validation runner, artifact store, and checkpoint logic remain available as integration points.
- PTY-backed Claude Code sessions continue to be the execution substrate for Ralph mode.

## Acceptance Criteria

- Starting a Ralph run from the app exercises one controller path from selection through validation.
- Loop state in the database and runtime memory stays consistent when pausing, resuming, stopping, timing out, or failing validation.
- The controller can trigger replanning and continue with the next item without operator-side manual repair steps.
