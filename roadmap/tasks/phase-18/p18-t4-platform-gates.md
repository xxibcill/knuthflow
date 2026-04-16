# P18-T4 - Platform-Specific Validation Gates

## Phase

[Phase 18 - Cross-Platform Packaging Engine](../../phases/phase-18.md)

## Objective

Add platform-specific validation gates and per-platform handoff checklists to the delivery pipeline.

## Deliverables

- Mobile build verification: xcodebuild validation for iOS, lint and test for Android
- PWA Lighthouse audit gate: accessibility >= 90, performance >= 90, SEO >= 90
- Desktop smoke test gate: launch packaged app, verify no crashes on startup
- Per-platform handoff checklist: each platform has its own delivery checklist in the bundle
- Platform-specific artifact paths collected in delivery_summary.json

## Dependencies

- P18-T2 (Capacitor Pipeline) and P18-T3 (PWA Packaging) complete

## Acceptance Criteria

- Each platform target has corresponding validation gates
- Handoff checklist shows what passed/failed per platform
- Delivery bundle only includes platforms that passed validation (or operator override)