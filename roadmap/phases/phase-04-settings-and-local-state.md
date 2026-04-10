# Phase 04 - Settings and Local State

## Functional Feature Outcome

Users can configure Knuthflow through a GUI, persist local preferences, manage profiles safely, and inspect diagnostics without leaving the app.

## Why This Phase Exists

This is where the wrapper becomes materially easier to operate than raw terminal use. It also addresses long-term maintainability through better local state and troubleshooting.

## Scope

- Settings persistence
- GUI settings surfaces
- Secure storage for sensitive values
- Logs and diagnostics

## Tasks

| Task | Summary |
| --- | --- |
| [P4-T1](../tasks/phase-04/p4-t1-persist-settings-and-profiles.md) | Create the local settings model and persistence rules |
| [P4-T2](../tasks/phase-04/p4-t2-build-settings-ui.md) | Expose CLI path, defaults, and safety-related settings in the app UI |
| [P4-T3](../tasks/phase-04/p4-t3-add-secure-storage.md) | Store secrets and sensitive profile values outside plaintext SQLite |
| [P4-T4](../tasks/phase-04/p4-t4-implement-logs-and-diagnostics.md) | Add diagnostics surfaces, log browsing, and export paths for support |

## Dependencies

- Phase 03 complete
- OS-backed secure storage is available on target platforms

## Exit Criteria

- Users can configure the app without hand-editing files
- Sensitive values are not stored in plaintext app data
- Supportable diagnostic information is available
- Settings changes take effect predictably

