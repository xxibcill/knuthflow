# P24-T2 - API Type Alias

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Add Ralph-named TypeScript API aliases and global window typing without breaking existing `KnuthflowAPI` imports.

## Deliverables

- Create `RalphDesktopAPI` or equivalent as an alias of the existing API interface.
- Keep `KnuthflowAPI` exported as a deprecated compatibility type.
- Update global window declaration to include both `ralph` and `knuthflow`.
- Add comments or docs identifying the preferred new API name.
- Ensure existing imports continue to typecheck.
- Prefer aliases over deep interface duplication.

## Dependencies

- P24-T1 adds runtime alias.
- TypeScript config and preload type declarations are available.

## Acceptance Criteria

- Renderer code can reference `window.ralph` with full type support.
- Existing `window.knuthflow` references still typecheck.
- There is only one source of truth for the API shape.
- Typecheck catches invalid calls through either alias.
