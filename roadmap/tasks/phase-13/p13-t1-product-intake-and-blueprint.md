# P13-T1 - Product Intake And Blueprint

## Phase

[Phase 13 - Goal To App Bootstrap](../../phases/phase-13-goal-to-app-bootstrap.md)

## Objective

Turn a user’s plain-language app request into a structured Ralph blueprint with product intent, technical constraints, and execution-ready acceptance criteria.

## Deliverables

- A desktop intake flow for app brief, target platform, stack preferences, constraints, and success criteria.
- A blueprint generator that produces deterministic app-spec documents under `specs/` plus updated `PROMPT.md`, `AGENT.md`, and `fix_plan.md`.
- A normalized data model for app goals, milestones, risks, and acceptance gates that later phases can execute against.

## Dependencies

- Phase 12 provides deterministic control-file semantics and a real loop controller foundation.
- Workspace creation/editing flows already exist in the desktop app.

## Acceptance Criteria

- A user can submit an app brief and Knuthflow generates a reviewable Ralph blueprint without manual file authoring.
- The generated blueprint includes explicit milestones, acceptance gates, and stack constraints rather than only free-form prose.
- Re-running blueprint generation for the same brief updates the same control stack predictably instead of creating incompatible formats.
