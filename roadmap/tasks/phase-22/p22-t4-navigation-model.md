# P22-T4 - Navigation Model

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Reorder and rename top-level navigation so Ralph workflow areas are primary and low-level runtime tools are secondary.

## Deliverables

- Rename `Console` to `Ralph` or `Ralph Console`.
- Rename `Workspaces` to `Projects` or `Ralph Projects` if terminology supports it.
- Evaluate whether `Delivery` should be top-level or embedded in the project dashboard.
- Keep `Terminal`, `History`, `Editor`, `Portfolio`, and `Blueprints` reachable.
- Reorder navigation around the primary workflow rather than implementation history.
- Ensure labels fit within the current responsive navigation layout.
- Update accessibility labels and tests for renamed buttons.

## Dependencies

- Phase 21 glossary defines final names.
- Phase 23 dashboard design may decide whether delivery remains top-level.

## Acceptance Criteria

- Navigation presents Ralph workflow areas before generic terminal tools.
- Each navigation label has a clear product meaning.
- Renamed controls remain accessible by role/name in tests.
- Responsive layout does not overflow with the new labels.
