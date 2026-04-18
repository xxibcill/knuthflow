# P17-T3 - Lessons Learned Summaries

## Phase

[Phase 17 - Delivery Intelligence and Loop Learning](../../phases/phase-17.md)

## Objective

Generate "lessons learned" summaries from completed runs and surface them as operator-visible knowledge base entries.

## Deliverables

- Lessons learned generator: runs through LoopLearning records + delivery_metrics and produces summary text
- Knowledge base storage: new `lessons_learned` table with id, projectId, runId, summary, createdAt
- Lessons surfaced in desktop UI: per-project lessons history, global lessons index
- Lessons linked to specific mistake patterns and which runs triggered them

## Dependencies

- P17-T1 (Learning Pipeline) and P17-T2 (Delivery Metrics) complete

## Acceptance Criteria

- Completed runs produce lessons_learned entries
- Operator can browse lessons by project or globally
- Lessons include actionable context: what went wrong, how it was addressed, outcome