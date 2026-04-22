# P21-T1 - Product Definition

## Phase

[Phase 21 - Ralph Product Source of Truth](../../phases/phase-21-ralph-product-source-of-truth.md)

## Objective

Replace generic Knuthflow wrapper positioning with a clear Ralph product definition that explains what Ralph is, who it serves, and what outcome it owns.

## Deliverables

- Update the PRD title and product metadata to identify Ralph as the product.
- Write a one-line description for Ralph as a local operator desktop for app intake, managed build loops, validation evidence, delivery artifacts, and maintenance.
- Define the target outcome Ralph improves for operators.
- Define the primary domain as local autonomous app building and operator supervision.
- Identify the current product phase using real language instead of placeholders.
- Add a short product summary that distinguishes Ralph from the underlying Claude Code CLI and from a generic terminal wrapper.
- Preserve historical context that the desktop shell and PTY runtime are platform foundations, not discarded scope.

## Dependencies

- The team agrees that Ralph is the primary product surface for this roadmap track.
- Existing README, PRD, and roadmap files are available for editing.

## Acceptance Criteria

- `PRD.md` no longer uses placeholder product-definition text for the overview.
- The first page of the PRD clearly states Ralph's product purpose without requiring the reader to know Knuthflow history.
- Claude Code is described as the local execution engine Ralph controls, not as the product itself.
- The description is specific enough to guide UI, roadmap, packaging, and release-note language.
