# Phase 18 - Cross-Platform Packaging Engine

## Functional Feature Outcome

Users can target mobile (iOS/Android via Capacitor), web (PWA), and desktop platforms from the same app build, with platform-specific validation and packaging handled by a unified pipeline.

## Why This Phase Exists

Phase 15 produces a desktop package as its primary output. Modern apps ship across mobile and web as well, requiring manual intervention after Ralph completes the desktop build. This phase adds first-class cross-platform support by extending the packaging workflow to handle Capacitor mobile builds, PWA web builds, and desktop targets from the same artifact stack.

## Scope

- Add platform target specification to app intake (mobile, web, desktop or combinations)
- Extend DeliveryHandlers to support Capacitor mobile build pipeline (ios/android via shell commands)
- Implement PWA packaging workflow (manifest generation, service worker, offline assets)
- Add platform-specific validation gates: mobile build verification, PWA Lighthouse audit, desktop smoke test
- Collect cross-platform artifacts in unified delivery bundle with per-platform handoff checklists
- Support platform-specific overrides in specs/ directory (e.g., specs/mobile-ux.md, specs/pwa-offline.md)

## Tasks

| Task | Summary |
| --- | --- |
| [P18-T1](../tasks/phase-18/p18-t1-platform-intake.md) | Add platform target specification to app intake flow |
| [P18-T2](../tasks/phase-18/p18-t2-capacitor-pipeline.md) | Implement Capacitor mobile build pipeline in DeliveryHandlers |
| [P18-T3](../tasks/phase-18/p18-t3-pwa-packaging.md) | Implement PWA packaging workflow (manifest, service worker, offline) |
| [P18-T4](../tasks/phase-18/p18-t4-platform-gates.md) | Add platform-specific validation gates and per-platform checklists |

## Dependencies

- Phase 17 (Delivery Intelligence and Loop Learning) should be complete for cross-platform pattern learning

## Exit Criteria

- [Observable outcome 1] App intake accepts mobile/web/desktop platform targets
- [Observable outcome 2] Capacitor builds produce valid ios/android build artifacts
- [Observable outcome 3] PWA packaging produces installable web app with offline support
- [Observable outcome 4] Delivery bundle contains per-platform artifacts with validation status