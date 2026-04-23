# P32-T5 - Review Bundle Import

## Phase

[Phase 32 - Collaboration and Review Handoff](../../phases/phase-32-collaboration-review-handoff.md)

## Objective

Allow Ralph to open review bundles for local inspection.

## Deliverables

- Add import/open action for review bundles.
- Validate bundle manifest version, required files, checksums if present, and compatibility.
- Render bundle summary without requiring the original workspace.
- Show role-targeted sections, artifacts, screenshots, decisions, and delivery summary.
- Prevent imported bundles from being treated as trusted executable project state.

## Dependencies

- Review bundle format and export exist.
- UI surface for review-only inspection is available.

## Acceptance Criteria

- Ralph can open a valid review bundle.
- Invalid or unsupported bundles produce clear errors.
- Imported bundles do not execute code or mutate workspaces.
- Review-only mode is visually distinct from an active Ralph project.
