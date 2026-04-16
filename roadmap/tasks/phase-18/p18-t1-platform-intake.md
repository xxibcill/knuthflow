# P18-T1 - Platform Target Intake

## Phase

[Phase 18 - Cross-Platform Packaging Engine](../../phases/phase-18.md)

## Objective

Add platform target specification to the app intake flow, allowing users to target mobile (iOS/Android via Capacitor), web (PWA), and/or desktop from the same app build.

## Deliverables

- Platform target selector in intake UI: checkboxes for mobile, web, desktop with platform sub-options (iOS, Android, PWA, macOS, Windows, Linux)
- Platform target stored in app metadata and passed to RalphBootstrap
- Platform-specific specs directory structure created during bootstrap (e.g., specs/mobile-ux.md, specs/pwa-offline.md)
- Platform target visible in delivery dashboard

## Dependencies

- Phase 17 complete (for cross-platform pattern learning)

## Acceptance Criteria

- Intake accepts platform target specification with mobile/web/desktop options
- Platform target influences bootstrap file generation
- Delivery bundle shows artifacts per platform