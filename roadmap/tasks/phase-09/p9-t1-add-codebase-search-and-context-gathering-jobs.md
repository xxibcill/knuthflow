# P9-T1 - Add Codebase Search and Context-Gathering Jobs

## Phase

[Phase 09 - Evidence and Plan Repair](../../phases/phase-09-evidence-and-plan-repair.md)

## Objective

Give Ralph a bounded research layer that searches code, tests, docs, and specs before it edits anything or assumes missing behavior.

## Deliverables

- A job model for read-only search, file summarization, and spec review work
- Parallel execution for bounded context-gathering jobs
- A distilled context pack that can be injected into the main Ralph iteration prompt
- Dedupe or caching rules for repeated identical searches across nearby iterations

## Dependencies

- [P7-T4](../phase-07/p7-t4-expose-ralph-project-apis-through-ipc.md)
- [P8-T1](../phase-08/p8-t1-build-ralph-loop-runtime-manager.md)

## Acceptance Criteria

- Ralph can search multiple sources of local context before acting on uncertain work
- Search output is summarized enough to fit into future prompts without transcript bloat
- Read-only research jobs cannot mutate workspace state
- Repeated loops do not rerun identical expensive searches without reason
