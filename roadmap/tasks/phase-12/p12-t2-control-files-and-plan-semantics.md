# P12-T2 - Control Files And Plan Semantics

## Phase

[Phase 12 - Ralph Flow Upgrade](../../phases/phase-12-ralph-flow-upgrade.md)

## Objective

Redesign the Ralph control stack so the loop prompt is deterministic, operator-authored, and compatible with one-item-per-loop execution.

## Deliverables

- Updated bootstrap templates for `PROMPT.md`, `AGENT.md`, `fix_plan.md`, and `specs/` that encode Ralph-specific loop behavior instead of generic placeholders.
- Stable task identifiers and richer parsed plan metadata so `fix_plan.md` can survive repeated parsing and mutation without losing item identity.
- Explicit acceptance-gate metadata or conventions that avoid relying only on task-title keyword heuristics.
- Prompt construction that includes the operator prompt, stable plan state, relevant specs, learnings, and search-before-change guidance.

## Dependencies

- The bootstrap and parser modules remain the source of truth for creating and reading Ralph control files.
- The loop controller from P12-T1 consumes the redesigned prompt stack and parsed plan data.

## Acceptance Criteria

- A freshly bootstrapped Ralph workspace contains control files that are immediately usable for a real autonomous loop.
- The same task in `fix_plan.md` keeps a stable machine identity across parsing, snapshots, completion, deferral, and replanning.
- Acceptance commands and operator instructions can be derived from plan/control-file data without hardcoded `npm` defaults for every repo.
