# Phase 17 - Delivery Intelligence and Loop Learning

## Functional Feature Outcome

Ralph automatically learns from every delivered app, applying pattern-based improvements to future builds and surfacing actionable insights from historical runs.

## Why This Phase Exists

The MistakeTracker in ralphLoopLearner.ts already detects repeated error patterns across iterations, but this learning is not wired back into prompt assembly or task selection for future runs. This phase closes that loop by making learning operational: detected mistake patterns feed back into PROMPT.md generation, acceptance gate selection, and scheduler priority.

## Scope

- Wire LoopLearning records from MistakeTracker into RalphPromptBuilder to inject learned countermeasures into future iterations
- Add delivery metrics collection: build time, iteration count, validation pass rate, operator intervention frequency
- Implement success/failure classification for delivered apps, correlating patterns in intake parameters with delivery outcomes
- Generate "lessons learned" summaries from completed runs and store as operator-visible knowledge base
- Add automated prompt injection for repeated mistake patterns (e.g., "when you see TypeScript import cycle, prefer barrel re-exports")

## Tasks

| Task | Summary |
| --- | --- |
| [P17-T1](../tasks/phase-17/p17-t1-learning-pipeline.md) | Connect MistakeTracker pattern detection into RalphPromptBuilder |
| [P17-T2](../tasks/phase-17/p17-t2-delivery-metrics.md) | Add delivery metrics collection and persistence |
| [P17-T3](../tasks/phase-17/p17-t3-lessons-learned.md) | Generate and surface lessons learned summaries from completed runs |
| [P17-T4](../tasks/phase-17/p17-t4-prompt-injection.md) | Add automated prompt injection for repeated mistake patterns |

## Dependencies

- Phase 16 (Multi-App Portfolio Orchestrator) should be complete for cross-project pattern analysis

## Exit Criteria

- [Observable outcome 1] Mistake patterns from past runs influence prompt generation in new runs
- [Observable outcome 2] Operator can view delivery metrics and lessons learned in the desktop UI
- [Observable outcome 3] Repeated mistake patterns trigger automated PROMPT.md countermeasure injection