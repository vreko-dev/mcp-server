# Quick Reference: All Disconnects & Fixes

## 🔴 Critical Issues

### Issue #1: BLOCK Level - No Modal Shown
- **Location:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts:152-182`
- **Problem:** `handleBlockLevel()` throws `CancellationError` immediately without dialog
- **Solution:** Call `SnapBackDialogs.showBlockDialog()` before throwing
- **Impact:** User can't choose options; gets immediate undo
- **Fix Time:** 1 hour

### Issue #2: Override Dialog Never Invoked  
- **Location:** `apps/vscode/src/ui/dialogs.ts:52-75` (defined but never called)
- **Problem:** `showOverrideDialog()` exists but no code calls it
- **Solution:** Call after user selects "Continue" in block dialog
- **Impact:** No justification collected for overrides
- **Fix Time:** 1 hour

### Issue #3: WARN Level Auto-Creates Snapshot Without Asking
- **Location:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts:188-282`
- **Problem:** Creates snapshot without showing dialog first
- **Solution:** Add confirmation modal BEFORE `createSnapshotForFile()`
- **Impact:** User has no control over WARN level behavior
- **Fix Time:** 2 hours

### Issue #4: Security Override Missing Justification
- **Location:** `apps/vscode/src/handlers/AnalysisCoordinator.ts:149-193`
- **Problem:** User can override critical security with no explanation
- **Solution:** Call `showOverrideDialog()` when user selects "Save Anyway (Override)"
- **Impact:** Audit trail has no context for security overrides
- **Fix Time:** 1 hour

---

## 🟠 High Priority Issues

### Issue #5: MVP Stub Unfulfilled
- **Location:** `apps/vscode/src/ui/ProtectionLevelSelector.ts:80-93`
- **Problem:** `showBlockConfirmation()` throws error; promises inline UI not implemented
- **Solution:** Either remove function or implement promised inline UI
- **Impact:** Dead code; unclear which path is active (modals vs. inline UI)
- **Fix Time:** 4-8 hours

### Issue #6: Audit Trail Missing Justification Fields
- **Location:** `apps/vscode/src/handlers/AuditLogger.ts`
- **Problem:** Audit records don't include user's justification for override
- **Solution:** Add `justification`, `userAction`, `timestamp` fields to metadata
- **Impact:** Can't audit WHY users made risky decisions
- **Fix Time:** 1 hour

### Issue #7: Temporary Allowance - No UI
- **Location:** Multiple (ProtectionLevelHandler, dialogs)
- **Problem:** "Allow Once" feature mentioned but no button in dialogs
- **Solution:** Add "Allow Once (30 min)" button to block dialog
- **Impact:** Users must make full decision each time; no temporary bypass
- **Fix Time:** 2 hours

---

## 🟡 Medium Priority Issues

### Issue #8: "Mark Wrong" Feature Missing
- **Location:** `apps/vscode/src/handlers/AnalysisCoordinator.ts`
- **Problem:** No button for false positive feedback on analysis
- **Solution:** Add "Mark Wrong" button to security warning dialogs
- **Impact:** Analysis model can't learn from user feedback
- **Fix Time:** 3 hours

### Issue #9: "Details" Button Missing  
- **Location:** `apps/vscode/src/handlers/AnalysisCoordinator.ts`
- **Problem:** Can't see detailed breakdown of analysis factors
- **Solution:** Add "Details" button that shows factor explanations
- **Impact:** Users can't understand why security issues were flagged
- **Fix Time:** 2 hours

---

## 📋 Complete Checklist

### Handlers That Need Changes
- [ ] `handleBlockLevel()` - Add dialog call
- [ ] `handleWarnLevel()` - Add confirmation modal (before snapshot)
- [ ] `handleRiskBasedBlocking()` - Add override dialog call
- [ ] All override paths - Pass justification to audit logger

### Dialogs That Need Wiring  
- [ ] `showBlockDialog()` - Call from `handleBlockLevel()`
- [ ] `showOverrideDialog()` - Call from all override paths
- [ ] Confirmation modal for WARN - Create new modal or use `showWarningMessage()`

### Audit Logger Updates
- [ ] Add `justification?: string` field
- [ ] Add `userAction?: string` field (e.g., "selected_continue")
- [ ] Add `timestamp?: number` field
- [ ] Add `dialogShownTime?: number` field
- [ ] Pass these from all override paths

### Protected File Registry Updates
- [ ] Implement `grantTemporaryAllowance(filePath, duration)`
- [ ] Update existing allowance check

### New Features to Add
- [ ] "Allow Once" button in block dialog
- [ ] "Mark Wrong" button in security warnings
- [ ] "Details" button for analysis breakdown
- [ ] Optional comment collection on skip/override

---

## 🔗 Code Connections That Are Missing

| From | To | Type | Status |
|------|----|----|--------|
| `handleBlockLevel()` | `showBlockDialog()` | Function call | ❌ Missing |
| `showBlockDialog()` handler | `showOverrideDialog()` | Function call | ❌ Missing |
| `showBlockDialog()` handler | `createSnapshotForFile()` | Function call | ❌ Missing |
| `handleWarnLevel()` | Confirmation modal | Function call | ❌ Missing |
| `handleRiskBasedBlocking()` | `showOverrideDialog()` | Function call | ❌ Missing |
| All override handlers | `auditLogger.recordAudit()` | With justification | ❌ Missing |
| `showOverrideDialog()` result | Audit metadata | Data flow | ❌ Missing |

---

## 🧪 Tests That Need to Be Added

### Unit Tests
- [ ] `ProtectionLevelHandler.handleBlockLevel()` shows modal
- [ ] Block dialog "Continue" path calls override dialog
- [ ] Block dialog "Create Snapshot" creates snapshot
- [ ] `handleWarnLevel()` shows confirmation modal first
- [ ] WARN dialog "Skip" allows save without snapshot
- [ ] Override dialog requires 5+ character input
- [ ] All override paths call audit logger with justification
- [ ] Temporary allowance prevents prompt (30 min window)
- [ ] "Mark Wrong" sends feedback to API

### Integration Tests
- [ ] Full BLOCK flow: modal → choice → optional justification → save
- [ ] Full WARN flow: modal → choice → optional comments → save
- [ ] Full override flow: warning → override dialog → justification → audit → save
- [ ] Cooldown doesn't skip necessary dialogs

### E2E/Manual Tests
- [ ] Save BLOCK file → modal appears → click buttons → each path works
- [ ] Save WARN file → modal appears → choose skip → save succeeds
- [ ] Override security → justification required → audit logged

---

## 📊 Effort Estimation

| Phase | Task | Days | Difficulty |
|-------|------|------|-----------|
| 1 | BLOCK modal implementation | 1 | Easy |
| 1 | WARN modal implementation | 1 | Medium |
| 1 | Override dialog wiring | 0.5 | Easy |
| 2 | Audit trail updates | 0.5 | Easy |
| 2 | Temporary allowance UI | 1 | Medium |
| 3 | "Mark Wrong" feature | 1 | Medium |
| 3 | "Details" feature | 1 | Medium |
| 3 | MVP decision / cleanup | 2 | Hard |
| 4 | Testing & verification | 1 | Medium |

**Total:** 8.5 - 10 days (2 weeks)
**Critical path:** Phases 1-2 = 3.5 days (1 week for critical fixes)

---

## 🎯 Implementation Order

### Week 1: Critical (Make blocking actually work)
1. **Day 1:**
   - [ ] Implement BLOCK modal call
   - [ ] Implement WARN confirmation modal
   - [ ] Wire override dialog calls
   
2. **Day 2-3:**
   - [ ] Update audit logger with justification fields
   - [ ] Implement "Allow Once" button
   - [ ] Add unit tests for critical paths
   - [ ] Manual testing of all flows

### Week 2: Enhancements (Complete MVP features)
4. **Day 4:**
   - [ ] Implement "Mark Wrong" feedback
   - [ ] Implement "Details" button
   - [ ] Remove/fix MVP stub
   
5. **Day 5:**
   - [ ] Complete testing
   - [ ] Documentation updates
   - [ ] Code review & merge

---

## 🚨 High-Risk Areas

1. **CancellationError timing:** Must be thrown AFTER dialog/override handling
2. **Document restoration:** Must happen at right time (on cancel only)
3. **Snapshot vs. no-snapshot paths:** Ensure both are tested
4. **Audit completeness:** Every override path must record justification
5. **Cooldown interaction:** Shouldn't skip necessary dialogs

---

## ✅ Success Criteria

When complete, you'll be able to:

- ✅ Save BLOCK file → get modal with options
- ✅ Choose "Continue" → get prompted for justification  
- ✅ Choose "Create Snapshot" → snapshot created & save allowed
- ✅ Choose "Cancel" → save cancelled cleanly
- ✅ Save WARN file → get prompted before snapshot
- ✅ Override security issue → forced to explain why
- ✅ View audit logs → see complete context for every override
- ✅ Grant temporary allowance → skip prompts for 30 minutes
- ✅ Mark false positives → feedback sent to backend

---

## 🔍 Code Search Patterns

Find all the pieces that need wiring:

```bash
# Find all protection level handlers
grep -r "handleBlockLevel\|handleWarnLevel\|handleWatchLevel" apps/vscode/src

# Find override dialog calls (should be > 0 after fix)
grep -r "showOverrideDialog" apps/vscode/src

# Find audit logger calls (should all have justification after fix)
grep -r "recordAudit" apps/vscode/src --context=3

# Find temporary allowance grants (should exist after fix)
grep -r "grantTemporaryAllowance\|allowOnce" apps/vscode/src

# Find "Mark Wrong" implementation (should exist after fix)
grep -r "markWrong\|falsePositive\|analysis.*feedback" apps/vscode/src
```

---

## 📖 Reference Files

All code analysis in one place:
- **Overview:** `IMPLEMENTATION_GAPS_ANALYSIS.md`
- **Detailed flows:** `FLOW_ANALYSIS_DETAILED.md`
- **Visual diagrams:** `VISUAL_FLOW_SUMMARY.md`
- **Fix roadmap:** `PATCHWORK_FIXES_ROADMAP.md`
- **This file:** `IMPLEMENTATION_GAPS_QUICK_REF.md`

---

## 🎬 Next Action

1. Read `VISUAL_FLOW_SUMMARY.md` to see the disconnect clearly
2. Review `PATCHWORK_FIXES_ROADMAP.md` for implementation details
3. Start with Phase 1 (critical fixes)
4. Follow checklist above to track progress

**Estimated time to critical fixes: 3-5 days**
