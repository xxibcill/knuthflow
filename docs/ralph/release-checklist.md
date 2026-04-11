# Ralph Mode Release Checklist

Use this checklist to validate autonomous mode is ready for release.

---

## Pre-Release Validation

### 1. Functional Completeness

- [ ] Ralph can execute a full loop from start to completion
- [ ] Task selection from fix_plan.md works correctly
- [ ] Acceptance gates execute and pass/fail appropriately
- [ ] Validation failures trigger replan correctly
- [ ] Checkpoint workflow creates commits without unrelated changes
- [ ] Recovery from interrupted runs works

### 2. Safety Systems

- [ ] Rate limiting prevents API cost overruns
- [ ] Circuit breaker activates after threshold failures
- [ ] No-progress detection stops stuck loops
- [ ] Permission denial detection works for git/npm
- [ ] Timeout handling for iterations and idle states
- [ ] Safety stop recording for debugging

### 3. State Management

- [ ] Loop state transitions are valid (no invalid transitions)
- [ ] Active runs are tracked in memory
- [ ] Run status persists in database
- [ ] Stale run detection works on startup
- [ ] Recovery report is generated for stale runs

### 4. Checkpoint System

- [ ] Whitelisted git commands only (status, diff, stage, commit, tag, log)
- [ ] Preflight check excludes unrelated changes
- [ ] Checkpoint commits include only Ralph control files
- [ ] Commit message format is consistent
- [ ] Checkpoint metadata is stored in database

### 5. Dry-Run Harness

- [ ] Happy-path scenario passes
- [ ] Permission-denial scenario fails correctly
- [ ] No-progress scenario fails after threshold
- [ ] Timeout recovery scenario continues correctly
- [ ] QA matrix covers all major paths

---

## Operator Documentation Review

### 6. Documentation

- [ ] Operator guide is complete and accurate
- [ ] All configuration parameters are documented
- [ ] Known limitations are explicitly documented
- [ ] Recovery procedures are clear
- [ ] Example templates are provided and functional

### 7. Decision Log

- [ ] Unsupported workflows are listed
- [ ] Risk boundaries are documented
- [ ] Common issues and resolutions are provided

---

## Integration Testing

### 8. End-to-End Tests

Run these scenarios and verify behavior:

```
Scenario: HP-1 (Happy Path)
Expected: Loop completes successfully
Result: [PASS/FAIL] _____

Scenario: NP-1 (No Progress)
Expected: Loop fails after threshold
Result: [PASS/FAIL] _____

Scenario: PD-1 (Permission Denied)
Expected: Loop fails with permission_denied
Result: [PASS/FAIL] _____

Scenario: TO-1 (Timeout Recovery)
Expected: Loop resumes after timeout
Result: [PASS/FAIL] _____

Scenario: VF-1 (Validation Failure)
Expected: Loop replans and continues
Result: [PASS/FAIL] _____
```

### 9. Error Handling

- [ ] Graceful handling of missing Claude Code
- [ ] Graceful handling of git not available
- [ ] Graceful handling of invalid workspace paths
- [ ] Graceful handling of database errors
- [ ] No unhandled promise rejections

---

## Performance Verification

### 10. Performance

- [ ] Loop state transitions are < 100ms
- [ ] Checkpoint creation is < 2s
- [ ] Safety state persistence doesn't block execution
- [ ] Memory usage is bounded (active runs limit enforced)

---

## Security Review

### 11. Security

- [ ] Git commands are whitelist-limited
- [ ] No shell injection vulnerabilities in git commands
- [ ] Workspace path validation prevents traversal
- [ ] Session IDs are properly generated
- [ ] No credentials logged or persisted

---

## Sign-Off

### Release Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| QA Lead | | | |
| Product Owner | | | |

### Notes

_[Add any outstanding issues or caveats before release]_

---

## Post-Release

After release, update this section:

- Release version: _____
- Release date: _____
- Known issues: [link to issue tracker]
- Next steps: [link to next phase]
