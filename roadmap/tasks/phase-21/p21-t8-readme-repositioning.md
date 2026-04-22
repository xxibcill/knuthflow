# P21-T8 - README Repositioning

## Phase

[Phase 21 - Ralph Product Source of Truth](../../phases/phase-21-ralph-product-source-of-truth.md)

## Objective

Rewrite the README so new users and contributors understand Ralph as the product and the desktop runtime as supporting infrastructure.

## Deliverables

- Change the README opening from Knuthflow wrapper positioning to Ralph operator desktop positioning.
- Add a concise primary workflow section: brief, blueprint, bootstrap, run, evidence, delivery, maintenance.
- Preserve setup instructions, scripts, tech stack, packaging notes, local data details, and test guidance.
- Reframe Claude Code detection and PTY sessions as runtime dependencies for Ralph-managed work.
- Update repository layout descriptions so Ralph modules, console components, and shared types are prominent.
- Update roadmap links to point to Ralph-focused phases.
- Remove or rewrite language that says Ralph is only a foundation or longer-term future layer.

## Dependencies

- Product definition and terminology from P21-T1 and P21-T7.
- Roadmap README includes the new Ralph-focused phases.

## Acceptance Criteria

- The README's first screen tells readers what Ralph does.
- The README still gives enough developer setup detail to run the app locally.
- Ralph-specific workflows are described before terminal-wrapper internals.
- Existing links remain valid.
