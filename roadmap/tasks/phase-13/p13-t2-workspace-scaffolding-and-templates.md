# P13-T2 - Workspace Scaffolding And Templates

## Phase

[Phase 13 - Goal To App Bootstrap](../../phases/phase-13-goal-to-app-bootstrap.md)

## Objective

Prepare a greenfield workspace Ralph can actually build in by applying supported starter templates, dependency baselines, and deterministic repo setup.

## Deliverables

- A supported template catalog for initial app targets such as web app, Electron app, or API-backed app.
- Workspace initialization logic that can create files, dependency manifests, and local project structure from the approved blueprint.
- Guardrails that record which template and scaffold decisions were applied so later loop steps can validate against them.

## Dependencies

- Product-intake blueprint output from `P13-T1`.
- Agreement on the first set of officially supported starter stacks.

## Acceptance Criteria

- The operator can choose a supported app template and Knuthflow initializes a working workspace from inside the desktop app.
- The initialized workspace includes enough structure for build, test, and preview commands to be discoverable by Ralph.
- Template application is deterministic and leaves audit-friendly metadata describing what was scaffolded.
