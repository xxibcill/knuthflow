# P9-T4 - Regenerate Fix Plans and Capture Loop Learning

## Phase

[Phase 09 - Evidence and Plan Repair](../../phases/phase-09-evidence-and-plan-repair.md)

## Objective

Repair stale `fix_plan.md` files from observed evidence and write back the rules, summaries, and follow-ups that future Ralph iterations should inherit.

## Deliverables

- A plan-regeneration flow that rewrites or reorders `fix_plan.md` from current repo evidence
- Snapshot history for plan revisions and recovery
- Capture of repeated mistakes as new prompt rules, operator signs, or follow-up items
- Operator-visible notes that explain why the plan was regenerated or reshaped

## Dependencies

- [P7-T2](../phase-07/p7-t2-bootstrap-ralph-control-stack.md)
- [P9-T1](./p9-t1-add-codebase-search-and-context-gathering-jobs.md)
- [P9-T3](./p9-t3-implement-output-analysis-and-continue-or-exit-decisions.md)

## Acceptance Criteria

- Ralph can regenerate a stale plan without losing the prior version
- Replanning decisions are grounded in search and validation artifacts
- New rules or follow-ups are captured as explicit files or state, not hidden in raw logs
- Operators can tell why the backlog changed between iterations
