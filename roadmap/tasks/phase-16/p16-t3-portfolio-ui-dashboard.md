# P16-T3 - Portfolio Dashboard UI

## Phase

[Phase 16 - Multi-App Portfolio Orchestrator](../../phases/phase-16.md)

## Objective

Build portfolio dashboard UI in the desktop renderer showing all active app builds across the portfolio with status, progress, and resource usage.

## Deliverables

- Portfolio overview page listing all projects in the portfolio with status indicators
- Active run cards showing: project name, current milestone, iteration count, runtime state
- Portfolio-level progress bar showing overall completion
- Cross-project dependency visualization
- Quick actions: pause/resume/stop runs, add new project to portfolio

## Dependencies

- P16-T1 and P16-T2 complete
- IPC handlers for portfolio data exposed via preload bridge

## Acceptance Criteria

- Portfolio dashboard shows all projects with their current status
- Active runs display real-time state from RalphRuntime
- Operator can manage runs (pause/resume/stop) from dashboard
- Cross-app dependencies visualized in the UI