# Phase 30 - Tool Connector Hub

## Functional Feature Outcome

Operators can connect Ralph to approved local and remote tools such as issue trackers, design sources, repositories, package registries, deployment targets, and monitoring services through a governed connector hub.

## Why This Phase Exists

Ralph's early workflow is local-first: app brief, workspace, run, evidence, delivery. Real product work often starts from external systems and ends in external systems: GitHub issues, Figma designs, Linear tickets, package registries, deployment targets, crash reports, and status monitors. Adding every integration ad hoc would create security and maintenance problems. This phase introduces a connector hub with explicit permissions, secrets handling, health checks, and per-project configuration.

## Scope

- Define connector abstraction for capabilities such as read issue, read design, create branch, publish package, deploy preview, fetch monitoring signal, and post status update.
- Add connector registry and per-project connector configuration.
- Integrate secure storage for connector secrets and tokens.
- Add UI for enabling, disabling, testing, and scoping connectors.
- Add built-in connectors starting with repository provider, issue tracker, design source, package registry, and monitoring endpoint where feasible.
- Add connector permission checks that integrate with Phase 29 policy.
- Add connector health diagnostics and clear failure messages.
- Add connector artifacts so Ralph runs record external inputs and outputs.
- Keep connector execution optional; Ralph must still work locally without configured connectors.

## Tasks

| Task | Summary |
| --- | --- |
| [P30-T1](../tasks/phase-30/p30-t1-connector-abstraction.md) | Define connector capability interface and registry |
| [P30-T2](../tasks/phase-30/p30-t2-connector-settings-ui.md) | Build connector setup, health, and scope UI |
| [P30-T3](../tasks/phase-30/p30-t3-secure-connector-secrets.md) | Store and rotate connector credentials through secure storage |
| [P30-T4](../tasks/phase-30/p30-t4-built-in-connectors.md) | Add initial repository, issue, design, registry, and monitoring connectors |
| [P30-T5](../tasks/phase-30/p30-t5-policy-scoped-connectors.md) | Enforce connector permissions through workspace policy |
| [P30-T6](../tasks/phase-30/p30-t6-connector-artifacts.md) | Record connector inputs, outputs, and failures as Ralph artifacts |

## Dependencies

- Phase 29 policy and permissions should exist for connector governance.
- Secure storage and diagnostics infrastructure must be stable.
- The product must retain a local-only fallback path.

## Exit Criteria

- Operators can configure at least one connector and verify its health.
- Connector credentials are stored securely and never exposed to renderer logs.
- Ralph can use connector data as explicit run input or delivery output.
- Connector failures are visible and recoverable without breaking local-only workflows.
- Connector permissions are scoped by project policy.
