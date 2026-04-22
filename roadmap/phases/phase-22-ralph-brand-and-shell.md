# Phase 22 - Ralph Brand and Shell

## Functional Feature Outcome

The installed app, browser title, about screen, navigation, and first screen present Ralph as the primary product and guide users into Ralph project workflows before exposing generic terminal or workspace tools.

## Why This Phase Exists

After the product definition is corrected, the application shell must make the same promise. Today the app title, package metadata, about screen, smoke tests, top-level route labels, and default view still frame the product as Knuthflow or as a generic operator workspace with terminal-first controls. This phase converts the visible product shell to Ralph while preserving access to the lower-level tools that Ralph depends on. It is intentionally focused on product surface and navigation, not deep runtime rewrites.

## Scope

- Change visible app branding from Knuthflow to Ralph across package metadata, app title, about screen, release metadata, and UI text that describes the product.
- Decide whether the internal package name and bundle identifier are changed in this phase or left stable with a documented migration path.
- Rework top-level navigation so Ralph Console is the first and default destination, with terminal, editor, session history, settings, portfolio, and blueprints presented as supporting areas.
- Replace generic labels such as "Console", "Workspaces", and "New Session" where they confuse Ralph's primary workflow.
- Make the selected workspace indicator read as Ralph project context when the workspace is Ralph-enabled.
- Update the empty/default state so users see Ralph project actions first: create app brief, open Ralph project, bootstrap current workspace, resume active run, or inspect delivery.
- Keep direct terminal access available for debugging and advanced operator intervention, but make it secondary to Ralph run controls.
- Update the status area to distinguish Ralph run state from raw Claude Code session state.
- Replace generic "Claude Code missing" warnings with Ralph-oriented dependency language that explains Claude Code is required for local execution.
- Update smoke tests and title assertions to expect Ralph-first branding and default screen behavior.
- Audit settings, diagnostics, and about copy so they explain runtime dependencies without reverting to wrapper-centric messaging.
- Preserve user trust by avoiding a cosmetic-only rename: every changed label should map to an actual Ralph workflow or supporting runtime capability.

## Tasks

| Task | Summary |
| --- | --- |
| [P22-T1](../tasks/phase-22/p22-t1-visible-brand-metadata.md) | Update app title, package product name, Forge product metadata, about screen, release descriptions, and installer-facing text to Ralph-focused language. |
| [P22-T2](../tasks/phase-22/p22-t2-brand-migration-decision.md) | Decide and document whether package name, executable name, bundle id, database name, and userData paths change now or remain compatible aliases. |
| [P22-T3](../tasks/phase-22/p22-t3-default-route.md) | Change the default renderer view from workspace selection to the Ralph console or Ralph project start screen. |
| [P22-T4](../tasks/phase-22/p22-t4-navigation-model.md) | Reorder and rename top-level navigation around Ralph workflow areas, keeping terminal and editor as secondary runtime tools. |
| [P22-T5](../tasks/phase-22/p22-t5-header-and-status-copy.md) | Update header, badges, dependency warnings, active workspace labels, and run summaries so they report Ralph state before raw terminal state. |
| [P22-T6](../tasks/phase-22/p22-t6-empty-state-actions.md) | Replace the generic workspace hero with Ralph-first actions for creating, opening, bootstrapping, resuming, and delivering projects. |
| [P22-T7](../tasks/phase-22/p22-t7-terminal-secondary-position.md) | Keep direct terminal access available but adjust CTA hierarchy so "New Session" does not compete with "Start Ralph Run". |
| [P22-T8](../tasks/phase-22/p22-t8-settings-about-copy.md) | Update settings and diagnostics copy to reflect Ralph product language while preserving technical details for support. |
| [P22-T9](../tasks/phase-22/p22-t9-ui-smoke-tests.md) | Update Playwright smoke coverage for Ralph title, default view, primary CTA, navigation, and secondary terminal access. |
| [P22-T10](../tasks/phase-22/p22-t10-visual-regression-pass.md) | Run the app and verify the Ralph-first shell does not introduce layout, overflow, navigation, or title regressions. |

## Dependencies

- Phase 21 must define approved Ralph terminology and brand policy.
- The renderer must keep current Ralph console, workspace selector, terminal, settings, portfolio, and blueprint components available.
- Packaging metadata changes must account for platform-specific effects on macOS bundle identity, Windows installer identity, Linux package names, updater feeds, and existing user data.
- Smoke tests must be runnable in the local Electron/Playwright setup or have an explicit documented skip path.

## Exit Criteria

- Launching the app shows a Ralph-first screen, not a generic terminal or workspace-first screen.
- The app title, about screen, visible product metadata, and primary navigation all use Ralph-focused language consistently.
- Users can still reach terminal sessions, editor, session history, settings, portfolio, and blueprints, but these are framed as supporting Ralph operations.
- Missing Claude Code dependency messaging explains the impact on Ralph execution instead of presenting Claude Code as the whole product.
- Updated smoke tests assert Ralph branding, default screen, primary Ralph action, and secondary terminal access.
- The brand migration decision is documented so later phases know whether internal names should be renamed or aliased.
