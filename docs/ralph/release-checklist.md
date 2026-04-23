# Ralph Mode Release Checklist

Use this checklist to validate Ralph-focused release is ready for shipping.

---

## Pre-Release Validation

### 1. Ralph Branding and Identity

- [ ] App title displays "Ralph" (not "Knuthflow")
- [ ] About screen shows Ralph branding and version
- [ ] Navigation shows Ralph as primary product name
- [ ] Package metadata uses Ralph branding
- [ ] Installer names match Ralph brand policy

### 2. Claude Code Dependency Messaging

- [ ] Missing Claude Code shows Ralph-styled messaging
- [ ] Claude Code detection uses Ralph-branded dialogs
- [ ] Installation guidance refers to Ralph workflow
- [ ] Error states use consistent Ralph styling

### 3. Primary Ralph Workflow Validation

- [ ] App launches directly into Ralph-first shell (not generic terminal)
- [ ] First screen shows Ralph Console or workspace selector
- [ ] New App button opens intake form for Ralph workflow
- [ ] Blueprint generation works for Ralph app-building
- [ ] Bootstrap Ralph creates correct control files (PROMPT.md, AGENT.md, fix_plan.md)
- [ ] Readiness validation correctly identifies workspace state
- [ ] Start Loop button activates Ralph runtime
- [ ] Run dashboard shows iteration count, phase, and artifacts
- [ ] Delivery panel is reachable from completed runs

### 4. Existing-Project Path

- [ ] Opening workspace with Ralph files loads directly into Ralph project context
- [ ] Repair Files action force-regenerates control files with backup
- [ ] Resume detects and recovers stale runs
- [ ] User-authored files are preserved during repair

### 5. Data Compatibility

- [ ] Existing workspaces load after upgrade without data loss
- [ ] Existing sessions and settings persist
- [ ] `RALPH_USER_DATA_DIR` override works
- [ ] `KNUTHFLOW_USER_DATA_DIR` legacy override still works
- [ ] Database filename `knuthflow.db` remains accessible

### 6. API Compatibility

- [ ] `window.ralph` is the preferred API and works correctly
- [ ] `window.knuthflow` retained as deprecated alias
- [ ] All `window.ralph` calls return expected data
- [ ] All `window.knuthflow` calls return expected data
- [ ] Both APIs return identical data for same calls

### 7. Safety Systems

- [ ] Approval gates display before destructive actions
- [ ] Stop confirmation dialog appears
- [ ] Pause/Resume controls work correctly
- [ ] Circuit breaker state is displayed in safety alerts
- [ ] Stale run detection triggers recovery messaging
- [ ] Failed validation does not appear as successful completion

### 8. Recovery States

- [ ] Missing Claude Code shows actionable error (not crash)
- [ ] Failed bootstrap shows repair guidance
- [ ] Corrupted files trigger repair workflow
- [ ] Stale run recovery offers resume or cleanup options
- [ ] Recovery actions do not silently overwrite files

### 9. Package Identity Follow-Through

- [ ] Packaged app launches successfully
- [ ] App title matches Ralph branding
- [ ] Bundle ID follows brand policy
- [ ] Installer metadata reflects Ralph product name

---

## Integration Testing

### 10. End-to-End Tests

Run these scenarios and verify behavior:

```
Scenario: Ralph Happy Path
Expected: Launch -> New App -> Blueprint -> Bootstrap -> Start Loop -> Dashboard
Result: [PASS/FAIL] _____

Scenario: Existing Project Open
Expected: Open workspace with .ralph directory loads Ralph context
Result: [PASS/FAIL] _____

Scenario: Repair Workflow
Expected: Damaged control files are repaired with user file preservation
Result: [PASS/FAIL] _____

Scenario: Stale Run Recovery
Expected: Stale run detected and recovery offered
Result: [PASS/FAIL] _____

Scenario: API Compatibility
Expected: window.ralph and window.knuthflow both work
Result: [PASS/FAIL] _____

Scenario: Safety Stop
Expected: Stop button shows confirmation and stops run
Result: [PASS/FAIL] _____

Scenario: Pause/Resume
Expected: Pause suspends run, Resume continues
Result: [PASS/FAIL] _____
```

### 11. Error Handling

- [ ] Graceful handling of missing Claude Code
- [ ] Graceful handling of git not available
- [ ] Graceful handling of invalid workspace paths
- [ ] Graceful handling of database errors
- [ ] No unhandled promise rejections

---

## Documentation Review

### 12. Operator Guide

- [ ] Operator guide describes Ralph-first workflow
- [ ] No references to generic terminal as default path
- [ ] Recovery procedures are practical and preserve user files
- [ ] Old product name references removed or marked historical

### 13. Release Notes

- [ ] Release notes describe Ralph refocus
- [ ] User-visible changes to branding and navigation documented
- [ ] Compatibility policy for API aliases is explicit
- [ ] Data migration behavior is documented
- [ ] Known limitations are honest and actionable

---

## Sign-Off

### Release Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| QA Lead | | | |
| Product Owner | | | |

### Known Limitations

_[Document any known issues that do not block release]_

---

## Post-Release

After release, update this section:

- Release version: _____
- Release date: _____
- Known issues: [link to issue tracker]
- Next steps: [link to next phase]
