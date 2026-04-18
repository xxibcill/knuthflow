# P16-T2 - RalphRuntime Multi-Run Support

## Phase

[Phase 16 - Multi-App Portfolio Orchestrator](../../phases/phase-16.md)

## Objective

Extend RalphRuntime to manage multiple concurrent runs across multiple projects within a portfolio, with run queueing and priority-based scheduling.

## Deliverables

- Extend `runtimeInstances` map to support portfolio-keyed instances
- Add run queue: when a project requests a new run and resources are constrained, queue the request
- Priority-based scheduling: higher-priority projects get scheduling preference
- Cross-project state coordination to prevent resource contention
- Active run tracking across portfolio (projectId → multiple runIds)

## Dependencies

- P16-T1 (Portfolio Database Schema) complete

## Acceptance Criteria

- RalphRuntime can manage runs from multiple projects simultaneously
- Run queue activates when concurrent run limit is reached
- Priority ordering respected in scheduling decisions
- Portfolio dashboard can query active runs across all projects