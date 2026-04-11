# Phase 11 - Recovery and Release Readiness

## Functional Feature Outcome

Ralph runs can checkpoint validated progress, recover from interruption, and ship with a dry-run harness, operator docs, and a measurable release bar.

## Why This Phase Exists

Autonomous mode should not be treated as complete when it merely works on a happy path. It has to recover, test, and document itself well enough to survive real operator use.

## Scope

- Controlled commit and checkpoint workflow
- Crash recovery and stale-state cleanup
- Dry-run harness and loop test matrix
- Operator documentation and release checklist

## Tasks

| Task | Summary |
| --- | --- |
| [P11-T1](../tasks/phase-11/p11-t1-add-controlled-commit-and-checkpoint-workflow.md) | Add a safe git checkpoint flow tied to validated Ralph iterations |
| [P11-T2](../tasks/phase-11/p11-t2-recover-interrupted-ralph-runs-and-stale-state.md) | Recover interrupted runs and clean up stale Ralph state on startup or resume |
| [P11-T3](../tasks/phase-11/p11-t3-build-dry-run-harness-and-loop-test-matrix.md) | Build repeatable tests and simulation fixtures for core Ralph state transitions |
| [P11-T4](../tasks/phase-11/p11-t4-publish-operator-docs-and-release-checklist.md) | Publish the docs, templates, and release checklist needed to dogfood autonomous mode |

## Dependencies

- Phase 10 complete
- Git safety rules remain intentionally narrower than a full local shell

## Exit Criteria

- Ralph can checkpoint validated work without sweeping unrelated user changes into the checkpoint
- Interrupted or stale autonomous runs can be resumed or failed cleanly
- Core Ralph loop paths are covered by dry-run or automated tests
- Operators have enough documentation to bootstrap, monitor, and release autonomous mode responsibly
