# P25-T6 - Safety And Recovery E2E

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Add coverage for pause, resume, stop, stale run, failed validation, missing dependency, and failed bootstrap states.

## Deliverables

- Test pause, resume, and stop controls where runtime state can be simulated or exercised safely.
- Test stale run detection and recovery messaging.
- Test failed validation gate display and next action.
- Test missing Claude Code dependency messaging without causing app failure.
- Test failed bootstrap or file-write error messaging with a controlled fixture.
- Verify destructive or risky recovery actions require explicit operator intent.

## Dependencies

- Phase 23 recovery states are implemented.
- Test harness can mock or simulate selected runtime/dependency conditions.

## Acceptance Criteria

- Safety and recovery tests exercise user-visible behavior, not only service internals.
- Missing dependency state is distinct from project readiness failure.
- Failed validation does not appear as successful run completion.
- Recovery actions do not silently overwrite files.
