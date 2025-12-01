# Implementation Patchwork Fixes - Actionable Roadmap

## Quick Summary

Your observation is **100% accurate**: You don't get a modal to enter comments when a save is blocked. The extension has the components but they're not connected. This document lists every fix needed.

---

## Phase 1: Critical - User-Facing Breaks (1-2 days)

### Fix #1: BLOCK Level Must Show Modal

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts`

**Current (lines 152-182):**
```typescript
private async handleBlockLevel(
    filePath: string,
    filename: string,
    preSaveContent: string,
    document: vscode.TextDocument,
    protectionLevel: ProtectionLevel,
): Promise<ProtectionHandlingResult> {
    logger.info("Save blocked due to BLOCK protection level (MVP implementation)", {...});
    vscode.window.setStatusBarMessage(`🔴 Save blocked: ${filename} requires snapshot (MVP)`, 2000);
    await this.auditLogger.recordAudit(filePath, protectionLevel, "save_blocked", { reason: "protection_level_block" });
    await this.restoreDocumentContents(document, preSaveContent);
    throw new vscode.CancellationError();
}
```

**Action Required:**
1. Import `SnapBackDialogs` at top of file
2. Call `showBlockDialog()` with proper options
3. Handle all three return paths
4. Call `showOverrideDialog()` if user selects "Continue"
5. Record audit with justification

**Pseudo-code:**
```typescript
private async handleBlockLevel(...): Promise<ProtectionHandlingResult> {
    // Import SnapBackDialogs and showBlockDialog
    const action = await SnapBackDialogs.showBlockDialog({
        fileName: filename,
        filePath,
        protectionLevel: "Block",
    });
    
    switch (action) {
        case "continue": {
            const override = await SnapBackDialogs.showOverrideDialog({...});
            if (override.action === "override") {
                // Allow save WITH justification in audit
                return { shouldProceed: true, shouldSnapshot: false, reason: "user_override", };
            }
            // Fall through to cancel if user cancels override dialog
        }
        case "createSnapshot": {
            // Create snapshot and allow
            return { shouldProceed: true, shouldSnapshot: true, reason: "snapshot_created", };
        }
        case "cancel":
        default: {
            await this.restoreDocumentContents(document, preSaveContent);
            throw new vscode.CancellationError();
        }
    }
}
```

**Test:** Try to save a BLOCK-level file and verify modal appears with options.

---

### Fix #2: WARN Level Must Ask Before Creating Snapshot

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts`

**Current (lines 188-282):** Creates snapshot first, shows notification after.

**Action Required:**
1. Add confirmation dialog BEFORE snapshot creation
2. Allow user to skip snapshot
3. Only create snapshot if user approves

**Pseudo-code:**
```typescript
private async handleWarnLevel(...): Promise<ProtectionHandlingResult> {
    const shouldDebounce = this.cooldownService.shouldDebounce(filePath);
    if (shouldDebounce) {
        vscode.window.setStatusBarMessage(`🟡 Warn level (debounced) - save allowed`, 3000);
        return { shouldProceed: true, shouldSnapshot: false, reason: "debounce_bypass" };
    }

    // ✓ NEW: Ask user BEFORE creating snapshot
    const response = await vscode.window.showWarningMessage(
        `File "${filename}" has WARN protection. Create snapshot?`,
        { modal: true },
        "Create Snapshot",
        "Save Without Snapshot",
        "Cancel",
    );

    switch (response) {
        case "Create Snapshot": {
            const snapshotId = await this.createSnapshotForFile(...);
            // ... return success
        }
        case "Save Without Snapshot": {
            // Optional: collect comments on why skipping
            vscode.window.setStatusBarMessage(`⚠️ Saved without snapshot`, 2000);
            return { shouldProceed: true, shouldSnapshot: false, reason: "user_skipped_snapshot" };
        }
        case "Cancel":
        default: {
            await this.restoreDocumentContents(document, preSaveContent);
            throw new vscode.CancellationError();
        }
    }
}
```

**Test:** Try to save a WARN-level file and verify you're asked to confirm snapshot creation.

---

### Fix #3: Override Dialog MUST Be Called on All Override Paths

**File:** Multiple locations

**Locations that need `showOverrideDialog()` call:**

1. **ProtectionLevelHandler.handleBlockLevel()** (line 152)
   - When user selects "Continue" in block dialog
   - Collect: "Why is this override safe?"

2. **AnalysisCoordinator.handleRiskBasedBlocking()** (line 149)
   - When user selects "Save Anyway (Override)" on critical security issues
   - Collect: "Why are you overriding security warnings?"

3. **ProtectionLevelHandler.handleWarnLevel()** (optional enhancement)
   - When user selects "Save Without Snapshot" at WARN level
   - Collect: "Why are you not creating a snapshot?"

**Implementation Template:**
```typescript
// Before allowing override:
const override = await SnapBackDialogs.showOverrideDialog({
    fileName: filename,
    filePath,
    protectionLevel: "Block", // or current level
});

if (override.action === "cancel") {
    // User decided not to override
    await this.restoreDocumentContents(document, preSaveContent);
    throw new vscode.CancellationError();
}

// Proceed with override, storing justification
await this.auditLogger.recordAudit(
    filePath,
    protectionLevel,
    "save_allowed",
    {
        reason: "user_override_...",
        justification: override.justification,
        timestamp: Date.now(),
    },
);

return { shouldProceed: true, ... };
```

**Test:** Try to override protection and verify you're prompted for justification.

---

## Phase 2: High Priority - Complete Audit Trail (1 day)

### Fix #4: Add Justification Field to Audit Logger

**File:** `apps/vscode/src/handlers/AuditLogger.ts`

**Action:** Update audit record structure to include:
- `justification?: string` - User's explanation for override
- `userAction?: string` - Which button user clicked (e.g., "continue", "skip_snapshot")
- `dialogShownAt?: number` - Timestamp when dialog appeared
- `decisionTime?: number` - Time user took to decide

**Current record:**
```typescript
{
    reason: "protection_level_block",
}
```

**Enhanced record:**
```typescript
{
    reason: "user_override_block_level",
    justification: "This change is tested locally and safe",
    userAction: "selected_continue",
    dialogShownAt: 1700412345000,
    decisionTime: 2500, // ms between dialog show and decision
}
```

**Test:** Check audit logs include justification for all overrides.

---

### Fix #5: Update All Audit Calls to Include Justification

**Files affected:**
1. `ProtectionLevelHandler.handleBlockLevel()`
2. `ProtectionLevelHandler.handleWarnLevel()`
3. `AnalysisCoordinator.handleRiskBasedBlocking()`

**For each location:**
- Pass `justification` from `showOverrideDialog()` response
- Include user action/decision path
- Add decision timestamps

---

## Phase 3: Medium Priority - MVP Promise Fulfillment (2-3 days)

### Fix #6: Decide - Modals vs. Inline UI

**Decision Required:** The MVP notes promise inline CodeLens + status-bar chips. Current code has full modal dialogs. Need to decide:

**Option A: Keep Full Modals (Recommended for stability)**
- Less disruption cost for users
- Clearer user affordances
- Easier to implement justification collection
- Better for critical decisions

**Option B: Implement Promised Inline UI**
- Requires custom UI components
- More complex implementation
- Better workflow (less interruption)
- Need to spec out exactly what "chips" contain

**Recommendation:** Option A (keep modals) - they're more appropriate for blocking operations and justification collection.

**Action:** Update `ProtectionLevelSelector.showBlockConfirmation()` to:
- Remove error throw
- Delegate to `showBlockDialog()` OR
- Remove entirely if no other code uses it

---

### Fix #7: Implement "Allow Once" Feature

**Files:** `ProtectionLevelHandler.ts`, dialogs

**Current:** Buttons: "Continue", "Create Snapshot & Continue", "Cancel Save"

**Enhanced:** Add fourth button: "Allow Once"

**Implementation:**
1. Add `allowOnce()` method to ProtectedFileRegistry
2. Call when user clicks "Allow Once"
3. Records temporary allowance valid for: this file, next 30 minutes, single save

**UI Changes:**
```typescript
const selection = await vscode.window.showErrorMessage(
    message,
    { modal: true, detail },
    "Continue (override)",
    "Allow Once (30 min)",
    "Create Snapshot & Continue",
    "Cancel Save",
);

switch (selection) {
    case "Allow Once (30 min)": {
        await this.registry.grantTemporaryAllowance(filePath, 30 * 60 * 1000);
        return { shouldProceed: true, shouldSnapshot: false, reason: "temporary_allowance" };
    }
    // ... other cases
}
```

**Test:** Click "Allow Once", save successfully, try to save again a minute later - should be blocked again.

---

### Fix #8: Implement "Mark Wrong" Feature

**Files:** `AnalysisCoordinator.ts`, `ApiClient.ts` (or analytics)

**For false positive feedback:**
```typescript
case "Mark Wrong": {
    // Send feedback to backend
    await this.apiClient.reportAnalysisAccuracy({
        filePath,
        analysisScore: analysisResult.score,
        factors: analysisResult.factors,
        userOverride: true,
        feedback: "false_positive",
    }).catch(() => {
        // Offline - still allow save
    });
    
    // Allow save after feedback
    return { shouldBlock: false, userOverride: true };
}
```

**Implementation Plan:**
1. Add endpoint to API client for feedback
2. Add "Mark Wrong" button to security analysis warnings
3. Send feedback with context (score, factors, file type, etc.)
4. Use feedback to improve analysis model

---

## Phase 4: Enhancement - Details & Learning (1-2 days)

### Fix #9: Add "Details" Button for Deep Analysis

**Current:** Shows inline factors in message.

**Enhancement:** Add "Details" button showing:
- Full factor list with explanations
- Risk calculation breakdown
- Recommendations per factor
- Similar past issues in this codebase

**Implementation:**
```typescript
const response = await vscode.window.showWarningMessage(
    "Security issues detected...",
    "Details",
    "Mark Wrong",
    "Save Anyway",
    "Cancel",
);

if (response === "Details") {
    await vscode.window.showInformationMessage(
        generateDetailedAnalysis(analysisResult),
        { modal: true },
        "Back to Choices",
    );
    // Loop back to main decision
    return handleRiskBasedBlocking(...);
}
```

---

### Fix #10: Enhance Snapshot Naming for Context

**File:** `SnapshotNamingStrategy.ts`

**Current:** Intelligent names based on changes

**Enhancement:** Include override context in snapshot name:
- `"Updated auth.ts (blocked save override)"`
- `"Modified config.json (security issue override)"`
- `"Changed api.ts (unsnapshot ed warn save)"`

---

## Testing Checklist

### Unit Tests to Add

- [ ] `ProtectionLevelHandler.handleBlockLevel()` shows modal
- [ ] BLOCK dialog "Continue" triggers override dialog
- [ ] BLOCK dialog "Create Snapshot" creates snapshot
- [ ] BLOCK dialog "Cancel" restores document
- [ ] `handleWarnLevel()` shows confirmation before snapshot
- [ ] WARN dialog "Create Snapshot" creates snapshot
- [ ] WARN dialog "Skip" allows save without snapshot
- [ ] All override paths call `showOverrideDialog()`
- [ ] Override dialog requires 5+ character justification
- [ ] Audit records include justification field
- [ ] Temporary allowance prevents second prompt (30 min)
- [ ] "Mark Wrong" sends feedback to API

### Integration Tests to Add

- [ ] User saves BLOCK file → modal appears → chooses "Continue" → justification dialog → save succeeds
- [ ] User saves WARN file → modal appears → chooses "Skip" → save succeeds without snapshot
- [ ] User overrides critical security → justification required → audit log complete
- [ ] User clicks "Allow Once" → next save doesn't prompt (for 30 min)
- [ ] User clicks "Mark Wrong" → feedback sent → save allowed

### Manual Testing (E2E)

1. **BLOCK level save flow:**
   - Create file, set BLOCK protection
   - Edit file
   - Try to save
   - Verify modal appears with 4 buttons
   - Click "Continue"
   - Verify justification dialog appears
   - Enter reason
   - Verify save succeeds
   - Check audit log has justification

2. **WARN level save flow:**
   - Create file, set WARN protection
   - Edit file
   - Try to save
   - Verify modal appears asking about snapshot
   - Choose "Save Without Snapshot"
   - Verify save succeeds without snapshot
   - Check audit log shows decision

3. **Security override flow:**
   - Create file with critical security issue
   - Try to save
   - Verify warning appears
   - Click "Save Anyway (Override)"
   - Verify justification dialog appears
   - Verify save succeeds with justification in audit

---

## File Modification Summary

| File | Changes | Lines |
|------|---------|-------|
| `ProtectionLevelHandler.ts` | Add modal calls to BLOCK/WARN handlers | 20-30 |
| `dialogs.ts` | No changes (already correct) | 0 |
| `AnalysisCoordinator.ts` | Add override dialog call, fix security override path | 10-15 |
| `AuditLogger.ts` | Add justification fields to audit records | 5-10 |
| `ProtectedFileRegistry.ts` | Add temporary allowance methods | 10-15 |
| Tests | Add verification of modal flows | 100+ |

**Total implementation effort:** 3-5 days
**Effort breakdown:**
- Phase 1 (Critical): 1-2 days
- Phase 2 (Audit): 1 day
- Phase 3 (MVP features): 1 day
- Phase 4 (Enhancements): 0.5-1 day

---

## Verification Commands

After implementing fixes, verify:

```bash
# Type checking
pnpm type-check

# Unit tests for affected files
pnpm test apps/vscode/src/handlers/ProtectionLevelHandler.ts
pnpm test apps/vscode/src/handlers/AnalysisCoordinator.ts
pnpm test apps/vscode/src/ui/dialogs.ts

# Build extension
pnpm build

# Manual testing (in VSCode)
F5 # Start debug extension
# Follow manual testing checklist above
```

---

## Documentation Updates Needed

After fixes, update:

1. **User guide:** Document modal workflows for each protection level
2. **CHANGELOG:** List new modal flows and justification features
3. **Contributing guide:** Document audit trail expectations
4. **README:** Update feature list to include justification collection

---

## References to Existing But Unused Code

- `SnapBackDialogs.showBlockDialog()` → Line 19-47 in dialogs.ts
- `SnapBackDialogs.showOverrideDialog()` → Line 52-75 in dialogs.ts
- `ProtectedFileRegistry.hasTemporaryAllowance()` → Already exists, just needs granting mechanism
- `ProtectionLevelHandler.createSnapshotForFile()` → Already works, just needs calling at right time

---

## Decision Log

### Decision 1: Modal vs. Inline UI
**Current state:** Commented-out modal code + stub
**Decision:** Keep modals (Option A) - simpler to implement correctly, better UX for blocking operations
**Rationale:** Blocking saves need clear user affordances; justification collection works better with modals
**Alternative rejected:** Inline CodeLens UI - more complex, less clear for critical decisions

### Decision 2: Temporary Allowance Duration
**Current state:** System exists but no duration defined
**Proposed:** 30 minutes per grant, single save only (user must click "Allow Once" again to extend)
**Rationale:** Prevents accidental persistent bypasses, requires conscious re-decision
**Alternative:** 1 hour or 24 hour options - too permissive

### Decision 3: Mark Wrong Implementation
**Current state:** Completely missing
**Proposed:** Simple feedback endpoint, no UI complexity
**Rationale:** Can be added incrementally, doesn't block other fixes
**Alternative:** Complex ML feedback loop - too ambitious for current phase

---

## Next Steps

1. **Prioritize:** Decide which phase to start with (recommend Phase 1)
2. **Create branch:** `fix/modal-flows` or `feature/protected-save-modals`
3. **Implement Phase 1** (2 days)
   - BLOCK modal call
   - WARN confirmation modal
   - Override dialog invocation
4. **Test Phase 1** (1 day)
   - Unit tests
   - Integration tests
   - Manual E2E testing
5. **Review & merge** Phase 1
6. **Continue to Phases 2-4** iteratively

---

## Success Criteria

✅ User saves BLOCK file → gets modal with options
✅ User can choose to override or create snapshot
✅ Override requires justification
✅ Justification is recorded in audit trail
✅ WARN level asks before snapshot
✅ All override paths collect comments
✅ Audit logs are complete with context
✅ Tests verify all new modal flows
✅ No regressions in existing functionality
