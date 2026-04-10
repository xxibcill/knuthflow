# P6-T4 - Add Side-by-Side Workflow Panels

## Phase

[Phase 06 - IDE Expansion Optional](../../phases/phase-06-ide-expansion-optional.md)

## Objective

Support richer side-by-side workflows by showing terminal, prompt context, editor content, and tool output together when helpful.

## Deliverables

- Split-pane layout strategy
- Prompt, terminal, editor, and output panel model
- State synchronization rules between panels
- Layout persistence for power users

## Dependencies

- [P6-T2](./p6-t2-add-monaco-editor-pane.md)
- [P6-T3](./p6-t3-build-diff-and-patch-review.md)

## Acceptance Criteria

- Multiple panels can coexist without making the app unusable
- Users can focus on one workflow without losing context in another
- Layout state can be restored predictably
- The richer UI still respects the terminal-first foundation
