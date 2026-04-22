# P26-T2 - Operator Feedback Channels

## Phase

[Phase 26 - Post-Release Stability and Iteration Foundation](../../phases/phase-26-post-release-stability-and-iteration-foundation.md)

## Objective

Build in-app feedback submission, run quality rating, and error reporting mechanism.

## Deliverables

- Create a feedback submission UI panel accessible from the operator console or settings area.
- Allow operators to submit free-text feedback with optional category tagging (bug, suggestion, praise, confusion).
- Add a run quality rating mechanism (1-5 stars or equivalent) that can be attached to completed runs.
- Add an error-reporting shortcut that captures the last error context without leaking session contents.
- Store feedback submissions locally with timestamps and run references where applicable.
- Provide a way for operators to review their own submitted feedback history.
- Ensure no sensitive project code, file contents, or operator identity are captured in feedback.

## Dependencies

- Phase 23 run dashboard and Phase 25 release checklist are complete.
- Local SQLite is available for feedback storage.
- No external feedback service is required for this task.

## Acceptance Criteria

- Operators can submit feedback from within the app without using external tools.
- Run quality rating is accessible from the run dashboard or delivery panel.
- Error reporting captures last-error metadata without exfiltrating project contents.
- Feedback is stored locally and accessible in-app for review.
- No PII, file contents, or session data are captured in feedback submissions.
