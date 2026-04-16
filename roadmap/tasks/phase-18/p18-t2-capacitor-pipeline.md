# P18-T2 - Capacitor Mobile Pipeline

## Phase

[Phase 18 - Cross-Platform Packaging Engine](../../phases/phase-18.md)

## Objective

Implement Capacitor mobile build pipeline in DeliveryHandlers for iOS and Android packaging.

## Deliverables

- Capacitor initialization in bootstrap when mobile target selected
- ios/android shell commands via PTY: npx cap add ios, npx cap add android, npx cap sync
- Build artifact collection: .ipa for iOS, .apk for Android
- Mobile-specific validation: xcodebuild archive for iOS, gradle assembleDebug for Android
- Platform-specific acceptance gates checked during milestone validation

## Dependencies

- P18-T1 (Platform Target Intake) complete

## Acceptance Criteria

- Capacitor ios and android platforms added to project when mobile target selected
- ios build produces .ipa artifact
- android build produces .apk artifact
- Mobile build results visible in delivery bundle