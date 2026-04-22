# P22-T1 - Visible Brand Metadata

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Update visible product metadata so users see Ralph, not Knuthflow or generic wrapper language, in the app shell and package-facing surfaces.

## Deliverables

- Update the HTML title to Ralph-focused branding.
- Update `package.json` `productName` and description if the brand policy allows it.
- Update Forge package metadata and installer descriptions if the brand policy allows it.
- Update the about screen brand kicker, title, and description.
- Update release and packaging docs where they expose product name or description.
- Search for visible "Knuthflow" and "Desktop wrapper for Claude Code CLI" strings and classify each as replace, retain for compatibility, or defer.

## Dependencies

- Phase 21 product terminology is approved.
- P22-T2 brand migration decision is at least drafted for package identity impacts.

## Acceptance Criteria

- User-visible title and about copy present Ralph as the product.
- Any remaining visible Knuthflow references are intentionally documented.
- Package-facing metadata is consistent with the brand decision.
- No runtime behavior changes are required for this task.
