# Implementation Gaps & Patchwork Analysis - SnapBack VS Code Extension

**Analysis Date:** November 19, 2025  
**Focus:** Save flow handling for protected files (Watch/Warn/Block levels)  
**Status:** Multiple incomplete flows identified

---

## Executive Summary

The save protection system has a disconnected architecture where:
- **Initial components exist** (dialogs, handlers, coordinators)
- **Flows are incomplete** (Block level doesn't show dialogs; Warn level doesn't collect comments)
- **Functions are stubbed** (comment collection dialog exists but never invoked)
- **MVP notes exist** but promised implementations are missing

The user's complaint "it just undoes the save no modal to collect my comments" is **accurate** - there's no modal path for collecting override justifications on blocked saves.

---

## Critical Implementation Gaps

### 1. BLOCK Level Protection - No Modal Flow ❌

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 152-182)

**Current Implementation:**
```typescript
private async handleBlockLevel(...) {
    logger.info("Save blocked due to BLOCK protection level (MVP implementation)", {...});
    
    vscode.window.setStatusBarMessage(
        `🔴 Save blocked: ${filename} requires snapshot (MVP)`,
        2000,
    );
    
    await this.auditLogger.recordAudit(...);
    await this.restoreDocumentContents(document, preSaveContent);
    
    // Just throws immediately - no dialog!
    throw new vscode.CancellationError();
}
```

**Problems:**
- ❌ No modal dialog shown to user
- ❌ `SnapBackDialogs.showBlockDialog()` exists but is **never called**
- ❌ Only a 2-second status bar message (dismissed before user can read)
- ❌ No opportunity for user to choose "Continue", "Create Snapshot & Continue", or "Cancel"
- ❌ No comment/justification collection
- ❌ Undo happens immediately without user interaction

**Dialog Exists But Unused:**
```typescript
// From ui/dialogs.ts - exists but never invoked by ProtectionLevelHandler
export async function showBlockDialog(
    options: BlockDialogOptions,
): Promise<"continue" | "createSnapshot" | "cancel"> {
    const selection = await vscode.window.showErrorMessage(
        message,
        { modal: true, detail },
        "Continue",
        "Create Snapshot & Continue",
        "Cancel Save",
    );
    // ... returns user selection
}
```

**Expected Flow (not implemented):**
1. User tries to save blocked file
2. Modal dialog appears with options
3. User chooses action (Continue, Create Snapshot & Continue, or Cancel)
4. If "Continue" or "Create Snapshot & Continue", optionally ask for justification
5. Audit log records user's action and justification

---

### 2. WARN Level Protection - No Comment Collection ❌

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 188-282)

**Current Implementation:**
```typescript
private async handleWarnLevel(...) {
    // ... creates snapshot automatically
    
    this.showWarnNotification(filename, snapshotId, relativePath);
    // That's it - just a notification
}

private showWarnNotification(...) {
    vscode.window.setStatusBarMessage(
        `🟡 Snapshot captured for ${filename}`,
        5000,
    );
    
    vscode.window.showInformationMessage(
        `SnapBack captured a snapshot for "${filename}"`,
        "Restore Snapshot", // Only one button!
    );
}
```

**Problems:**
- ❌ No modal asking user to confirm/override protection
- ❌ No comment collection on save
- ❌ User has no control - snapshot is created automatically
- ❌ For WARN level, should warn user BEFORE creating snapshot
- ❌ No override capability

**Expected Flow (for proper WARN):**
1. User tries to save file at WARN level
2. Modal appears: "This file has WARN protection. Create snapshot?"
3. User can choose: "Create Snapshot", "Save Without Snapshot", or "Cancel"
4. If overriding protection, collect optional comments
5. Audit log records the decision and any comments

---

### 3. Override Dialog Exists But Never Invoked ❌

**File:** `apps/vscode/src/ui/dialogs.ts` (lines 52-75)

**Exists But Unused Function:**
```typescript
export async function showOverrideDialog(
    _options: BlockDialogOptions,
): Promise<
    { action: "override"; justification: string } | { action: "cancel" }
> {
    const justification = await vscode.window.showInputBox({
        prompt: "Enter justification for overriding this protection",
        placeHolder: "Briefly explain why this change is safe...",
        ignoreFocusOut: true,
        validateInput: (value: string) => {
            if (!value || value.trim().length < 5) {
                return "Justification must be at least 5 characters";
            }
            return null;
        },
    });
    
    if (justification) {
        return { action: "override", justification };
    }
    return { action: "cancel" };
}
```

**Problem:** Never called from any protection level handler!

**Where It Should Be Used:**
- When user selects "Continue" in Block dialog → should ask for justification
- When user overrides security warnings → should collect reasoning
- When user chooses "Allow Once" → should optionally document why

---

### 4. Analysis Coordinator - Disconnected Override Paths ❌

**File:** `apps/vscode/src/handlers/AnalysisCoordinator.ts` (lines 149-278)

**Critical Issue (lines 158-178):**
```typescript
if (analysisResult.score > 8 && protectionLevel === "Protected") {
    const selection = await vscode.window.showErrorMessage(
        `Critical security issues detected in ${filename}. Save blocked due to protection level.`,
        "Save Anyway (Override)",
        "Cancel Save",
    );

    if (selection !== "Save Anyway (Override)") {
        // ... block save
        throw new vscode.CancellationError();
    }

    // Record override - but NO JUSTIFICATION COLLECTED!
    await this.auditLogger.recordAudit(
        filePath,
        protectionLevel,
        "save_allowed",
        {
            reason: "user_override_critical_security",
            factors: analysisResult.factors,
            risk_score: analysisResult.score,
            // Missing: user's justification/comments
        },
    );

    return { shouldBlock: false, userOverride: true };
}
```

**Problems:**
- ❌ User can override critical security issues but no comment/justification required
- ❌ Audit trail has no record of why user overrode
- ❌ `showOverrideDialog()` function exists but isn't called here
- ❌ No way to document reasoning for security violations

---

### 5. Stubbed Functions & MVP Placeholders ❌

**File:** `apps/vscode/src/ui/ProtectionLevelSelector.ts` (lines 80-124)

**The Big Stub:**
```typescript
/**
 * Show confirmation dialog for block-level protection - MVP MODAL REPLACEMENT
 *
 * MVP Note: This modal has been commented out for MVP and will be replaced with
 * inline CodeLens + status-bar toast UI instead of full-screen modals.
 *
 * For context: Modal dialogs create interruption cost for users. The MVP approach
 * uses inline banners with "Allow once · Mark wrong · Details" chips that store
 * rationale without flow break.
 *
 * See Lean architecture v0 (MVP-ready) specification for implementation details.
 */

// MVP implementation uses inline CodeLens + status-bar toast instead of modals
export async function showBlockConfirmation(
    _filename: string,
): Promise<"snapshot" | "override" | "cancel"> {
    // In MVP, block confirmation is handled via inline UI elements
    // This function is a placeholder that will be replaced with inline implementation
    throw new Error("Block confirmation modal replaced with inline UI in MVP");
}
```

**Problems:**
- ❌ Throws error if called
- ❌ Promise for "inline CodeLens + status-bar toast" never implemented
- ❌ "Allow once · Mark wrong · Details chips" never implemented
- ❌ References "Lean architecture v0 (MVP-ready) specification" - where is it?
- ❌ Function is essentially dead code

---

### 6. Missing Permission/Cooldown Flows ❌

**Patterns Mentioned But Not Implemented:**
- "Allow Once" capability mentioned in MVP notes but no `allowOnce()` method exists
- "Mark Wrong" for protecting against false positives - no implementation
- "Details" link - no deep details modal

**File Search Result:**
```
See Lean architecture v0 (MVP-ready) specification for implementation details.
```

This reference document doesn't appear to exist or is not linked.

---

## Flow Diagram: Current State vs. Expected State

### BLOCK Level: Current (Broken)
```
User saves blocked file
    ↓
handleBlockLevel() called
    ↓
Status bar message (2 sec)
    ↓
Document content restored
    ↓
CancellationError thrown
    ↓
Save cancelled (undo) ✗ No user interaction!
```

### BLOCK Level: Expected
```
User saves blocked file
    ↓
Show modal: "Save blocked. Choose action:"
├─ "Continue (no snapshot)"
├─ "Create Snapshot & Continue"
└─ "Cancel Save"
    ↓
If "Continue":
    ├─ Show override dialog: "Enter justification..."
    ├─ Audit log with justification
    └─ Allow save
    ↓
If "Create Snapshot":
    ├─ Create snapshot
    ├─ Audit log
    └─ Allow save
    ↓
If "Cancel":
    ├─ Restore document
    └─ Block save
```

### WARN Level: Current (Incomplete)
```
User saves warned file
    ↓
handleWarnLevel() called
    ↓
Snapshot created automatically
    ↓
Notification shown (no choice)
    ↓
Save allowed ✗ No user confirmation!
```

### WARN Level: Expected
```
User saves warned file
    ↓
Show modal: "This file has WARN protection. Create snapshot?"
├─ "Create Snapshot"
├─ "Save Without Snapshot"
└─ "Cancel"
    ↓
If override selected:
    ├─ Ask for optional comments
    └─ Audit log decision + comments
    ↓
Allow save
```

---

## Audit Trail Gaps

**Current Audit Logging:**
```typescript
await this.auditLogger.recordAudit(
    filePath,
    protectionLevel,
    "save_blocked",
    {
        reason: "protection_level_block",
        // No user justification
        // No user comments
        // No timestamp of dialog interaction
        // No decision rationale
    },
);
```

**Expected Audit Logging:**
```typescript
await this.auditLogger.recordAudit(
    filePath,
    protectionLevel,
    "save_allowed",
    {
        reason: "user_override_block_level",
        justification: "This is a safe change - tested locally",
        userAction: "selected_continue",
        dialogShownTime: timestamp,
        decisionTime: timestamp,
        riskFactors: [...],
        riskScore: score,
    },
);
```

---

## Implementation Patchwork Summary

| Flow | Status | Gap |
|------|--------|-----|
| BLOCK protection modal | ❌ Missing | Dialog exists but never called |
| BLOCK user interaction | ❌ Missing | Just undoes immediately |
| BLOCK comment collection | ❌ Missing | No `showOverrideDialog()` invocation |
| WARN user confirmation | ❌ Missing | No modal asking for approval |
| WARN snapshot confirmation | ❌ Missing | Auto-creates without asking |
| Override justification dialog | ✓ Exists | ❌ Never invoked (stubbed in one place) |
| Security override comments | ❌ Missing | No comment collection on critical overrides |
| Audit trail completeness | ⚠️ Partial | No justification/comments recorded |
| MVP inline UI (CodeLens/chips) | ❌ Missing | Stubbed with "see spec" reference |
| Allow Once feature | ❌ Missing | Mentioned but not implemented |
| Mark Wrong feature | ❌ Missing | Mentioned but not implemented |

---

## Code Files Involved

1. **Core Protection Handler:**
   - `apps/vscode/src/handlers/ProtectionLevelHandler.ts` - Missing modal invocations

2. **Dialog Components:**
   - `apps/vscode/src/ui/dialogs.ts` - Has `showBlockDialog()` and `showOverrideDialog()` but latter is never called
   - `apps/vscode/src/ui/ProtectionLevelSelector.ts` - `showBlockConfirmation()` is stubbed

3. **Analysis & Risk:**
   - `apps/vscode/src/handlers/AnalysisCoordinator.ts` - Override path doesn't collect justification

4. **Audit Logging:**
   - `apps/vscode/src/handlers/AuditLogger.ts` - Records actions but no justification fields

---

## Specific User-Facing Issues

**Issue 1: "No Modal for Save on Blocked Status File"**
- **When:** User tries to save file at BLOCK protection level
- **Current behavior:** Save is immediately undone with only a 2-second status message
- **Expected behavior:** Modal dialog appears with options to Continue, Create Snapshot, or Cancel
- **Code location:** `ProtectionLevelHandler.handleBlockLevel()` - line 166-181
- **Fix:** Call `SnapBackDialogs.showBlockDialog()` and handle user selection

**Issue 2: "No Comments Modal for Override"**
- **When:** User chooses to override protection
- **Current behavior:** No dialog asking for justification
- **Expected behavior:** Input box appears asking "Why is this change safe?"
- **Code location:** Multiple - each override path needs `showOverrideDialog()` call
- **Fix:** Invoke `SnapBackDialogs.showOverrideDialog()` before allowing override

**Issue 3: "WARN Level Doesn't Ask User"**
- **When:** User saves file at WARN level
- **Current behavior:** Snapshot created automatically, just notification shown
- **Expected behavior:** Modal asks user to confirm snapshot creation
- **Code location:** `ProtectionLevelHandler.handleWarnLevel()` - line 242-249
- **Fix:** Show confirmation modal before creating snapshot, not after

**Issue 4: "MVP Features Stubbed Out"**
- **Promised features:** Inline CodeLens, "Allow Once" chips, "Mark Wrong" capability
- **Current state:** Only error message in stub function
- **Code location:** `ProtectionLevelSelector.showBlockConfirmation()` - line 90-93
- **Fix:** Implement promised inline UI or switch back to modals

---

## Recommended Fix Priority

### Priority 1 (Critical) - User can't protect files properly
1. Implement BLOCK level modal flow
   - Call `showBlockDialog()` 
   - Handle all three return paths
   - Collect justification if user chooses "Continue"

2. Implement WARN level modal flow
   - Show confirmation before snapshot (not after)
   - Allow user to skip snapshot

3. Implement comment collection on all override paths
   - Use `showOverrideDialog()`
   - Pass justification to audit logger

### Priority 2 (High) - Completeness
4. Fix stubbed MVP functions
   - Decide: return to modals OR implement promised inline UI
   - Update `ProtectionLevelSelector.showBlockConfirmation()`

5. Enhanced audit trails
   - Add `justification` field to all override records
   - Record decision timestamps and user actions

### Priority 3 (Medium) - Features
6. Implement "Allow Once" capability
   - Add button to block dialog
   - Implement temporary override system

7. Implement "Mark Wrong" for false positives
   - Feedback mechanism for analysis errors

---

## Testing Impact

**Currently Passing But Wrong:**
- Tests mock dialogs, so they don't catch missing modal calls
- `saveHandler.protectionLevels.test.ts` mocks `showErrorMessage` but BLOCK handler never calls it
- Integration tests can't verify dialog interaction (noted in code comments)

**What Tests Are Missing:**
- Block level MUST show modal before blocking
- Warn level MUST ask user before creating snapshot
- Override paths MUST collect justification
- Audit logs MUST include user comments

---

## Questions for Clarification

1. **MVP Decision:** Is the target to return to full modals, or implement the promised inline CodeLens/chips UI?
2. **Spec Location:** Where is the "Lean architecture v0 (MVP-ready) specification" referenced in code?
3. **Allow Once:** Should this be a global override (allow all saves for file) or single-save override?
4. **Mark Wrong:** Should this be feedback to backend analysis or just local override flag?
5. **Audit Completeness:** How detailed should override justifications be? Free-form text?

---

## Next Steps

1. Decide on modal vs. inline UI strategy
2. Connect existing `showBlockDialog()` in BLOCK level handler
3. Implement WARN level confirmation modal
4. Connect `showOverrideDialog()` on all override paths
5. Update audit logging to include justifications
6. Update tests to verify modal flows
7. Document the "Allow Once" and "Mark Wrong" features
