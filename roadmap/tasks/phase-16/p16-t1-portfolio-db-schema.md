# P16-T1 - Portfolio Database Schema

## Phase

[Phase 16 - Multi-App Portfolio Orchestrator](../../phases/phase-16.md)

## Objective

Add Portfolio and PortfolioProject database tables and migrations to support tracking multiple concurrent Ralph projects under a single portfolio.

## Deliverables

- `portfolios` table: id, name, description, createdAt, updatedAt
- `portfolio_projects` table: id, portfolioId, projectId, priority, status, dependencyGraph (JSON), createdAt
- Database migration for both tables
- RalphRuntime modifications to support multiple concurrent runs per portfolio
- IPC handlers for portfolio CRUD operations

## Dependencies

- Phase 15 complete (Desktop One-Shot Delivery)
- Existing RalphProject table structure understood

## Acceptance Criteria

- Portfolio and PortfolioProject tables created with proper indexes
- Operator can create portfolios and add existing Ralph projects to them
- Portfolio-level query returns all projects and their active runs
- Cross-app dependencies stored as JSON graph in portfolio_projects.dependencyGraph