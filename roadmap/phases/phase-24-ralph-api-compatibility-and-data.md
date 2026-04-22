# Phase 24 - Ralph API Compatibility and Data

## Functional Feature Outcome

The renderer, tests, and future plugin surface can use `window.ralph` and Ralph-named types while existing `window.knuthflow` integrations, local data, and historical projects continue to work during a controlled compatibility window.

## Why This Phase Exists

The visible product can become Ralph before every internal name is changed. A full repo-wide rename of `knuthflow` to `ralph` would touch preload types, renderer calls, tests, package metadata, database filenames, user data paths, docs, and possibly external automation. Doing that in one step would create unnecessary risk. This phase introduces a compatibility layer that gives new code a Ralph-native API while keeping old names as aliases until migration is complete.

## Scope

- Add `window.ralph` as a secure preload alias for the existing API while preserving `window.knuthflow` as a deprecated compatibility alias.
- Rename or alias TypeScript API types so new code can import `RalphDesktopAPI` or equivalent without breaking `KnuthflowAPI`.
- Establish a deprecation policy for `window.knuthflow`, including test coverage, console warnings if appropriate, and a removal target.
- Migrate renderer code opportunistically from `window.knuthflow` to `window.ralph`, starting with Ralph console, portfolio, blueprint, delivery, maintenance, and monitoring components.
- Leave lower-level modules such as PTY, process, filesystem, settings, and diagnostics available under the Ralph API because they are still part of the operator desktop.
- Decide how to handle local database naming: keep `knuthflow.db`, rename to `ralph.db`, or support both with migration/copy-on-first-launch.
- Decide how to handle environment variables such as `KNUTHFLOW_USER_DATA_DIR`, likely by adding `RALPH_USER_DATA_DIR` while preserving the old variable for tests and developer workflows.
- Update e2e tests to prefer `window.ralph` while keeping targeted coverage that `window.knuthflow` remains available during the compatibility window.
- Update IPC contract docs so they describe the Ralph API, the deprecated alias, and the boundary between renderer and main process.
- Avoid broad internal file renames unless they reduce confusion and do not destabilize runtime behavior.
- Add migration safeguards for existing user data, session history, Ralph project state, secure storage, logs, and test user data directories.
- Document what is intentionally not renamed in this phase, such as historical migration names, old database columns, or package identifiers if retained.

## Tasks

| Task | Summary |
| --- | --- |
| [P24-T1](../tasks/phase-24/p24-t1-preload-ralph-alias.md) | Expose the secure preload API as `window.ralph` while preserving `window.knuthflow` as a compatibility alias. |
| [P24-T2](../tasks/phase-24/p24-t2-api-type-alias.md) | Add Ralph-named TypeScript API aliases and update global window typing without breaking existing imports. |
| [P24-T3](../tasks/phase-24/p24-t3-renderer-api-migration.md) | Migrate Ralph-facing renderer components from `window.knuthflow` to `window.ralph` in scoped batches. |
| [P24-T4](../tasks/phase-24/p24-t4-test-api-migration.md) | Update e2e tests and helpers to use `window.ralph`, while preserving compatibility tests for `window.knuthflow`. |
| [P24-T5](../tasks/phase-24/p24-t5-data-path-policy.md) | Decide and implement database, userData, log, secure storage, and test environment variable naming policy. |
| [P24-T6](../tasks/phase-24/p24-t6-data-migration-safeguards.md) | Add migration/copy/alias safeguards for existing local data if any data path or database name changes. |
| [P24-T7](../tasks/phase-24/p24-t7-ipc-contract-docs.md) | Update IPC contract documentation to describe Ralph API names, compatibility aliases, and secure bridge rules. |
| [P24-T8](../tasks/phase-24/p24-t8-deprecation-policy.md) | Document the compatibility window, warning strategy, removal criteria, and surfaces that remain intentionally legacy-named. |
| [P24-T9](../tasks/phase-24/p24-t9-package-identity-follow-through.md) | Apply the package identity decision from Phase 22 to executable names, bundle ids, installer names, update metadata, and tests if approved. |
| [P24-T10](../tasks/phase-24/p24-t10-regression-suite.md) | Run typecheck/build/e2e coverage focused on preload access, settings persistence, database open, workspace list, Ralph bootstrap, and portfolio APIs. |

## Dependencies

- Phase 22 must define the visible brand and package identity policy.
- Existing preload bridge and IPC contracts must remain secure and context-isolated.
- Any data path migration must be tested against a fixture or copied test userData directory before it is allowed for real user data.
- Renderer migration must be done in small batches to avoid losing type coverage across the large API surface.
- Tests must be updated in a way that does not mask real preload failures by falling back silently to the deprecated alias.

## Exit Criteria

- `window.ralph` exists, is typed, and supports the same secure API surface needed by the renderer.
- `window.knuthflow` still works as a documented deprecated alias during the compatibility window.
- Ralph-facing renderer components and new tests use `window.ralph` by default.
- Existing local data opens without loss after the change, including workspaces, sessions, settings, Ralph projects, runs, artifacts, portfolios, blueprints, logs, and secure storage.
- IPC contract docs describe the Ralph API and compatibility policy.
- Regression coverage verifies both new API access and old alias compatibility.
