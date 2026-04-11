# Phase 09 - Evidence and Plan Repair

## Functional Feature Outcome

Ralph can search the codebase before editing, feed validation artifacts back into the loop, and regenerate the fix plan from evidence when the current plan becomes stale.

## Why This Phase Exists

An autonomous loop is only useful if it stays grounded in the repo. This phase adds the search, validation, and replanning behavior that keeps Ralph from drifting into fake progress.

## Scope

- Search and context-gathering jobs
- Artifact capture and validation backpressure
- Output analysis and continue or exit decisions
- Fix plan regeneration and loop learning capture

## Tasks

| Task | Summary |
| --- | --- |
| [P9-T1](../tasks/phase-09/p9-t1-add-codebase-search-and-context-gathering-jobs.md) | Run bounded research jobs that gather code, test, and spec context before execution |
| [P9-T2](../tasks/phase-09/p9-t2-build-artifact-capture-and-validation-pipeline.md) | Capture compiler, test, and diff artifacts and apply focused validation after each iteration |
| [P9-T3](../tasks/phase-09/p9-t3-implement-output-analysis-and-continue-exit-decisions.md) | Analyze loop results and decide whether to continue, replan, fail, or exit complete |
| [P9-T4](../tasks/phase-09/p9-t4-regenerate-fix-plans-and-capture-loop-learning.md) | Repair stale plans and write back the learning that future loops should inherit |

## Dependencies

- Phase 08 complete
- The Ralph control stack remains the canonical description of desired behavior

## Exit Criteria

- Ralph searches the repo before acting on uncertain work
- Validation artifacts are stored and tied to the selected item that produced them
- Continue and exit decisions are driven by structured evidence rather than only free text
- `fix_plan.md` can be regenerated or reordered when the backlog no longer matches reality
