# Phase 33 - Extension SDK and Automation Hooks

## Functional Feature Outcome

Developers can extend Ralph with governed local extensions for custom blueprints, validators, artifact analyzers, delivery targets, connectors, and automation hooks.

## Why This Phase Exists

Built-in Ralph capabilities cannot cover every stack, organization, validation gate, or delivery environment. The project already has strong internal modules, but extension points need clear contracts, permissions, versioning, diagnostics, and failure containment before third-party or team-specific logic can run safely. This phase creates a supported extension SDK instead of encouraging direct edits to core modules.

## Scope

- Define extension manifest format with name, version, capabilities, permissions, entry points, compatibility range, and configuration schema.
- Support extension types for blueprint providers, scaffold templates, validators, artifact analyzers, delivery targets, connector providers, policy checks, and run hooks.
- Add local extension discovery from a configured directory.
- Add extension enable/disable UI with health and permission display.
- Run extensions in a constrained environment with clear error boundaries.
- Add extension logging and diagnostics.
- Add version compatibility checks and migration warnings.
- Add sample extensions and developer documentation.
- Ensure core Ralph remains functional if an extension fails or is disabled.

## Tasks

| Task | Summary |
| --- | --- |
| [P33-T1](../tasks/phase-33/p33-t1-extension-manifest.md) | Define extension manifest, capability, and permission schema |
| [P33-T2](../tasks/phase-33/p33-t2-extension-loader.md) | Implement local extension discovery, loading, and compatibility checks |
| [P33-T3](../tasks/phase-33/p33-t3-extension-sandboxing.md) | Add execution boundaries, error handling, and diagnostics for extensions |
| [P33-T4](../tasks/phase-33/p33-t4-extension-management-ui.md) | Build extension enable, disable, configure, and health UI |
| [P33-T5](../tasks/phase-33/p33-t5-core-extension-points.md) | Add extension points for validators, analyzers, delivery targets, and blueprints |
| [P33-T6](../tasks/phase-33/p33-t6-sample-extensions-docs.md) | Add sample extensions and SDK documentation |

## Dependencies

- Phase 29 policy must exist for extension permissions.
- Phase 30 connector hub and Phase 20 blueprint system should define extension use cases.
- The codebase must have stable module boundaries for validators, delivery, and artifacts.

## Exit Criteria

- Ralph can discover and load a local extension with declared permissions.
- Operators can inspect, enable, disable, and diagnose extensions.
- A failing extension does not crash the core app or corrupt project state.
- At least one sample extension demonstrates the SDK.
- Extension documentation explains supported APIs and safety boundaries.
