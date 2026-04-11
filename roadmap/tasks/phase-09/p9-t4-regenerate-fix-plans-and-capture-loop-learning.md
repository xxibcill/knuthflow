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

## Deferred from PR #8 Review

The following infrastructure items from Phase 08 were identified during code review and should be addressed as part of Phase 09:

### High Priority

- **Add unit tests for RalphRuntime state transitions** — Test state machine validity, timeout handling, and concurrency guards. The `@TODO(Phase 10)` comment at line 29 of `ralphRuntime.ts` should be addressed in coordination with P10-T1 (Ralph run dashboard).

- **Set max listeners on EventEmitter** — RalphRuntime extends EventEmitter but doesn't call `setMaxListeners()`. With many runs created, listener accumulation could trigger warnings.

- **Call cleanupRun for all active runs on reset** — `resetRalphRuntime()` clears the `runtimeInstances` Map without calling `cleanupRun` for each active run. This leaves stale entries in `runIdToRuntime`.

### Medium Priority

- **Make path normalization explicit in RalphScheduler** — The singleton cache in `RalphScheduler` (line 207-216 of `ralphScheduler.ts`) uses raw workspace paths as keys. Add internal normalization on every access, or document the contract explicitly.

- **Persist rate limit and circuit breaker state to database** — Currently only in-memory; state will not survive app restart. Multiple TODO comments in `ralphSafety.ts` reference Phase 09 for this implementation.
