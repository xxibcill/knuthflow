# P17-T1 - Learning Pipeline

## Phase

[Phase 17 - Delivery Intelligence and Loop Learning](../../phases/phase-17.md)

## Objective

Connect MistakeTracker pattern detection from ralphLoopLearner.ts into RalphPromptBuilder so learned countermeasures are injected into future iterations.

## Deliverables

- Read LoopLearning records from database at iteration start
- Inject mistake countermeasures into RalphPromptBuilder (e.g., "Avoid this pattern: [specific mistake]")
- Priority-based injection: most-repeated mistakes get most prominent placement
- Learning records scoped by projectId and workspacePath
- Countermeasure effectiveness tracking: do injected prompts reduce repeated mistakes?

## Dependencies

- Phase 16 complete (RalphRuntime multi-run for cross-project pattern analysis)
- RalphPromptBuilder existing structure understood

## Acceptance Criteria

- LoopLearning records influence prompt content in subsequent runs
- Mistake patterns from past runs appear as countermeasures in new iteration prompts
- Operator can view which patterns were injected and why