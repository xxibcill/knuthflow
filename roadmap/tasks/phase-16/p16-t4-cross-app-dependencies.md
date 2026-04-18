# P16-T4 - Cross-App Dependency Resolution

## Phase

[Phase 16 - Multi-App Portfolio Orchestrator](../../phases/phase-16.md)

## Objective

Implement dependency resolution so when one app in the portfolio depends on artifacts from another, the scheduler respects build order and propagates artifact references.

## Deliverables

- Dependency graph storage in portfolio_projects.dependencyGraph
- Topological sort of project build order based on dependencies
- Artifact propagation: when Project A builds, its outputs are available to dependent Projects B, C
- Dependency-aware scheduling: Project B waits for Project A artifacts before starting relevant tasks
- Cycle detection with operator warning

## Dependencies

- P16-T1 complete (dependencyGraph field exists)
- P16-T2 complete (scheduling infrastructure)

## Acceptance Criteria

- Dependencies expressed in fix_plan.md are parsed and stored in portfolio_projects.dependencyGraph
- Scheduler respects dependency order (no Project B task starts until Project A artifacts available)
- Cycles detected and operator notified before scheduling begins
- Artifact paths from dependent projects accessible during Ralph iteration