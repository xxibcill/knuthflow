# P36-T5 - Fleet Dashboard

## Phase

[Phase 36 - Optional Sync and Fleet Operations](../../phases/phase-36-optional-sync-fleet-operations.md)

## Objective

Add fleet status dashboard for configured machines and policy compliance.

## Deliverables

- Track machine identity, Ralph version, last sync time, governance bundle version, blueprint catalog version, and compliance status.
- Show local machine and imported remote machine summaries.
- Highlight version incompatibility and stale sync state.
- Provide actions to export local state, import update, or inspect conflicts.
- Avoid implying live remote control unless a future provider supports it.

## Dependencies

- Sync history and governance compliance data exist.

## Acceptance Criteria

- Operators can see configured machine sync/compliance status.
- Stale or incompatible machines are visible.
- Dashboard is useful with local file sync only.
- No remote execution control is exposed by default.
