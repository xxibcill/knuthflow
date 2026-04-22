# P21-T7 - Terminology And Glossary

## Phase

[Phase 21 - Ralph Product Source of Truth](../../phases/phase-21-ralph-product-source-of-truth.md)

## Objective

Normalize Ralph terminology so docs, UI, tests, and code comments use the same product vocabulary.

## Deliverables

- Define "Ralph", "operator", "Ralph project", "app brief", "blueprint", "run", "loop", "milestone", "plan", "artifact", "evidence", "delivery bundle", "approval gate", "workspace", and "runtime terminal".
- Clarify when "workspace" is acceptable and when "Ralph project" should be used.
- Clarify that "Claude Code session" describes the underlying execution dependency, not the user-facing workflow.
- Document legacy terms such as Knuthflow and explain whether they remain only for compatibility.
- Add glossary entries to `PRD.md` and reference them from `README.md` where useful.
- Identify UI labels that should be changed in Phase 22 because they conflict with the glossary.

## Dependencies

- Product definition and goals are drafted.
- Phase 22 will use these terms for shell and navigation work.

## Acceptance Criteria

- `PRD.md` contains a Ralph glossary with no placeholder definitions.
- The glossary distinguishes product terms from implementation terms.
- The terms are specific enough to guide copy changes and tests.
- Any intentionally retained legacy term has a documented reason.
