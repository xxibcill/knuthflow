# P10-T2 - Build Live Phase Timeline and Artifact Viewer

## Phase

[Phase 10 - Operator Console](../../phases/phase-10-operator-console.md)

## Objective

Show what Ralph is doing over time and let operators inspect the prompts, outputs, logs, tests, and diffs that justify each phase transition.

## Deliverables

- A live phase timeline for each iteration and major Ralph state transition
- An artifact viewer for prompts, agent output, compiler logs, test results, and summaries
- Structured rendering for changed files and diffs when those artifacts exist
- Truncation and retention UI rules for large outputs

## Dependencies

- [P9-T2](../phase-09/p9-t2-build-artifact-capture-and-validation-pipeline.md)
- [P9-T3](../phase-09/p9-t3-implement-output-analysis-and-continue-or-exit-decisions.md)

## Acceptance Criteria

- Operators can inspect the evidence behind a Ralph decision without leaving the app
- Timeline ordering matches persisted loop state and is not inferred from timestamps alone
- Large artifacts remain readable without freezing the UI
- File and diff views reuse existing renderer patterns where appropriate
