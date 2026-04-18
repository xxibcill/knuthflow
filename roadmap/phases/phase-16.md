# Phase 16 - Multi-App Portfolio Orchestrator

## Functional Feature Outcome

Ralph manages a pipeline of multiple concurrent app builds, tracking portfolio-level goals and allocating work across several simultaneous projects.

## Why This Phase Exists

Phase 15 delivers one app end-to-end. Real product teams ship many apps, and a single Ralph instance handling one app at a time leaves portfolio coordination as manual operator overhead. This phase evolves Ralph from a single-loop executor into a portfolio-level orchestrator that queues, prioritizes, and tracks multiple app builds in parallel.

## Scope

- Portfolio-level state in the database: `Portfolio`, `PortfolioProject` tables
- Extend RalphRuntime to support multiple concurrent runs per operator with run queueing and priority
- Portfolio-level milestone tracking across multiple apps in the same portfolio
- Cross-app dependency resolution when an app depends on artifacts from another
- Portfolio dashboard UI showing all active app builds, resource usage, and portfolio-level progress

## Tasks

| Task | Summary |
| --- | --- |
| [P16-T1](../tasks/phase-16/p16-t1-portfolio-db-schema.md) | Add Portfolio and PortfolioProject database schema and migrations |
| [P16-T2](../tasks/phase-16/p16-t2-ralph-runtime-multi-run.md) | Extend RalphRuntime to manage concurrent runs with queueing |
| [P16-T3](../tasks/phase-16/p16-t3-portfolio-ui-dashboard.md) | Build portfolio dashboard UI in the desktop renderer |
| [P16-T4](../tasks/phase-16/p16-t4-cross-app-dependencies.md) | Implement cross-app dependency resolution |

## Dependencies

- Phase 15 (Desktop One-Shot Delivery) must be complete
- Portfolio assumes existing Ralph projects can be promoted into portfolio tracking

## Exit Criteria

- [Observable outcome 1] Operator can create a portfolio and add multiple Ralph projects to it
- [Observable outcome 2] Portfolio dashboard shows all active runs across all projects with status
- [Observable outcome 3] Cross-app dependencies are expressed in fix_plan.md and respected during scheduling