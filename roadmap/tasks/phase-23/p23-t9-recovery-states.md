# P23-T9 - Recovery States

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Add clear user-facing recovery states for failed bootstrap, stale runs, malformed metadata, missing folders, failed validation, and missing dependencies.

## Deliverables

- Define recovery messaging for each lifecycle error state.
- Add primary recovery actions such as repair files, recheck readiness, stop stale run, reopen folder, install/configure Claude Code, retry bootstrap, and inspect logs.
- Ensure recovery actions are scoped and do not overwrite user files without approval.
- Surface technical details where useful without overwhelming the primary message.
- Log or record recovery attempts where appropriate.
- Add tests for at least one bootstrap failure and one stale/missing dependency state.

## Dependencies

- Lifecycle model from P23-T1.
- Readiness and supervisor APIs provide enough issue detail.

## Acceptance Criteria

- Known failure states show actionable recovery guidance.
- Recovery actions preserve user-authored files by default.
- Missing dependencies are clearly distinguished from project errors.
- Error states do not leave the user stuck on a blank or generic terminal screen.
