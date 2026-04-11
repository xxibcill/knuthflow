# IDE Mode Decision - Phase 6

**Date:** 2026-04-11
**Status:** DECIDED - Proceed with lightweight IDE expansion
**Phase:** P6-T1

## Decision

**Proceed with IDE expansion** - Knuthflow will add lightweight Monaco-based editor capabilities while maintaining terminal-first stability.

## Rationale

### Arguments FOR Editor Mode

1. **User workflow continuity** - Users can review and edit files without switching contexts to an external editor
2. **Diff review integration** - Claude Code changes can be reviewed in-app before acceptance
3. **Competitive positioning** - Bridges gap between terminal-first wrapper and full IDE
4. **User value unlock** - Enables prompt → code → review → commit workflows entirely in-app

### Arguments AGAINST (or caution)

1. **Terminal-first identity** - Core value proposition is wrapping Claude Code CLI, not replacing VSCode
2. **Complexity increase** - Monaco bundle is ~5MB, increases maintenance surface
3. **Feature creep risk** - Could dilute product focus
4. **Implementation cost** - Split-pane layouts, state sync add significant complexity

### Decision Factors

| Factor | Weight | Finding |
|--------|--------|---------|
| User value unlock | High | Significant for power users doing file-heavy workflows |
| Terminal stability | Critical | Must not degrade PTY reliability |
| Maintenance cost | Medium | Manageable with phased rollout |
| Product identity | Low-Medium | Editor is supplementary, not core |

## Criteria for Monaco Integration

Monaco integration is **justified if and only if**:

1. **Terminal stability is preserved** - Editor load/usage does not affect PTY responsiveness
2. **Incremental value** - Each feature (editor, diff, panels) must independently justify its cost
3. **Optional by default** - Editor mode can be disabled; terminal-only remains the default
4. **Performance acceptable** - Editor initialization < 2s; memory overhead < 100MB
5. **Usable on moderate workloads** - Handles 10-file diffs, typical workspace sizes

## Complexity & Maintenance Assessment

### Added Components

| Component | Complexity | Maintenance Burden |
|-----------|------------|-------------------|
| Monaco integration | Medium | Low (vendor-decorated) |
| Diff viewer | Medium | Low (stateless) |
| Split-pane layout | Medium-High | Medium |
| State synchronization | High | Medium-High |

### Risk Mitigations

- Monaco loaded lazily (only when editor is opened)
- Diff viewer uses read-only mode by default
- Layout state persisted but not shared between terminal/editor
- Terminal remains always-primary; editor is secondary panel

## Scope for Next Release Line

### Included (Phase 6)

- Monaco editor pane (read-only primary, optional edit mode)
- Diff viewer for changed files
- Split-pane layout (terminal + editor + diff panels)
- Side-by-side workflow support

### Excluded (Future phases)

- Full Monaco feature parity with VSCode
- Multi-file editing with project-wide refactoring
- Debugger integration
- Full IDE launching workflows

## Product Scope Update

The product will maintain its **terminal-first desktop wrapper** identity with the following expansion:

> "Knuthflow is a desktop wrapper for Claude Code CLI that provides terminal-first workflows with optional IDE capabilities for file review and editing."

This is an **additive expansion** - existing terminal-only users are not affected.

## Exit Criteria Met

- [x] Decision is explicit rather than implied
- [x] Editor work is justified by concrete user value
- [x] Product scope changes are documented (this memo)
- [x] Team can proceed with clear conscience

## Implementation Guidance

1. **Phase 6-T2 first** - Monaco integration establishes the foundation
2. **Read-only by default** - Edit mode behind a flag or confirmation
3. **Test terminal stability** - PTY benchmarks before/after Monaco load
4. **Incremental rollouts** - Each sub-feature must pass stability gates
