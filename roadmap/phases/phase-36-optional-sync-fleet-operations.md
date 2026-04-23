# Phase 36 - Optional Sync and Fleet Operations

## Functional Feature Outcome

Operators can optionally sync Ralph configuration, governance bundles, blueprints, review bundles, and run summaries across machines or a small team fleet without making cloud sync mandatory.

## Why This Phase Exists

Ralph is local-first, but mature usage may span multiple machines: a desktop operator, a laptop, a CI-adjacent workstation, or a small team with shared blueprints and governance. The product should support optional synchronization for configuration and knowledge artifacts while keeping source workspaces, secrets, and local execution under explicit operator control. This phase introduces sync carefully, after policy, governance, review bundles, and resilience exist.

## Scope

- Define syncable data classes: settings, governance bundles, approved blueprints, extension manifests, review bundles, run summaries, lessons learned, and analytics reports.
- Define non-syncable or opt-in-only data classes: secrets, local workspace paths, raw logs, proprietary source files, terminal transcripts, and delivery artifacts.
- Add local export/import sync mode using files or repositories as the first implementation.
- Add optional remote sync provider abstraction for future services.
- Add conflict detection and resolution for blueprints, policies, and settings.
- Add encryption/signing requirements for sensitive sync bundles where needed.
- Add fleet dashboard for configured machines, last sync time, version compatibility, and policy compliance.
- Add clear opt-in UX and no-cloud default.
- Add tests for export/import, conflict handling, and non-syncable data exclusion.

## Tasks

| Task | Summary |
| --- | --- |
| [P36-T1](../tasks/phase-36/p36-t1-sync-data-classification.md) | Classify syncable, non-syncable, and opt-in-only data |
| [P36-T2](../tasks/phase-36/p36-t2-local-sync-export-import.md) | Implement local file/repository export-import sync |
| [P36-T3](../tasks/phase-36/p36-t3-sync-provider-abstraction.md) | Define optional remote sync provider interface |
| [P36-T4](../tasks/phase-36/p36-t4-conflict-resolution.md) | Add conflict detection and resolution for settings, policies, and blueprints |
| [P36-T5](../tasks/phase-36/p36-t5-fleet-dashboard.md) | Add fleet status dashboard for configured machines and policy compliance |
| [P36-T6](../tasks/phase-36/p36-t6-sync-security-tests.md) | Add exclusion, encryption/signing, and sync compatibility tests |

## Dependencies

- Phase 32 review bundles, Phase 33 extensions, Phase 34 governance, and Phase 35 resilience must be stable enough to sync safely.
- Local data classification and privacy expectations from Phase 21 and Phase 31 must be clear.
- Secure storage must support separating syncable metadata from local-only secrets.

## Exit Criteria

- Sync is opt-in and Ralph remains fully usable without it.
- Operators can export and import sync bundles for approved data classes.
- Secrets, raw source files, and local-only data are excluded unless explicitly supported by policy.
- Conflicts are detected and resolved without silently overwriting local configuration.
- Fleet dashboard shows configured machines and sync/compliance status.
