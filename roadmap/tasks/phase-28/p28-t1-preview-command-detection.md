# P28-T1 - Preview Command Detection

## Phase

[Phase 28 - Preview Evidence and Visual Validation](../../phases/phase-28-preview-evidence-visual-validation.md)

## Objective

Detect and configure local preview commands for scaffolded or existing apps so Ralph can validate rendered behavior.

## Deliverables

- Detect preview scripts from `package.json`, common frameworks, and scaffold metadata.
- Support configured preview commands in specs, blueprint metadata, or Ralph project settings.
- Identify expected host, port, startup URL, and route list where possible.
- Report when no preview command is available and explain manual configuration.
- Avoid running install or build commands implicitly unless policy allows it.

## Dependencies

- Workspace scaffolder and milestone validation command detection can be reused.
- Phase 29 policy may later constrain preview commands.

## Acceptance Criteria

- Supported scaffolded apps produce a preview command automatically.
- Unsupported apps show a clear configuration path.
- Detected commands are visible before execution.
- Preview detection does not mutate the workspace.
