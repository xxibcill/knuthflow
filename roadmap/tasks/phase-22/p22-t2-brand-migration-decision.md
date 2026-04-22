# P22-T2 - Brand Migration Decision

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Decide how far the Ralph rename goes in this release across visible branding, package identity, executable names, bundle identifiers, data paths, and compatibility aliases.

## Deliverables

- Create a decision table for product name, npm package name, executable name, macOS bundle id, Windows installer name, Linux package name, database filename, userData path, environment variables, and preload API names.
- Identify migration risk for each identity surface.
- Recommend whether each surface changes now, changes later, or stays as a compatibility alias.
- Document data-loss risks and rollback considerations.
- Record the decision in the PRD decision log.
- Feed implementation choices into Phase 24 data/API work and Phase 25 packaging verification.

## Dependencies

- Phase 21 decision-log task is available.
- Current package and database naming is known.

## Acceptance Criteria

- There is a written brand migration policy with explicit decisions per identity surface.
- The policy distinguishes visible brand changes from internal compatibility changes.
- Phase 24 can implement API/data compatibility without guessing.
- Phase 25 can verify packaging against the documented decision.
