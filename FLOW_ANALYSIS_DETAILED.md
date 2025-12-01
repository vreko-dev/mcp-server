# Detailed Save Flow Analysis - Code Disconnects Map

## Overview

This document maps every code path in the save flow for protected files, highlighting where:
- Functions exist but aren't called
- Flows branch but don't reconnect
- User interactions are expected but missing
- Audit trails are incomplete

---

## 1. Save Event Entry Point

**File:** `apps/vscode/src/save/onWillSave.ts`

This is where saves are intercepted (no code shown but exists in handlers):
- VSCode fires `onWillSaveTextDocument` event
- Extension intercepts via `SaveHandler.register()`
- Routes to different handlers based on protection level

---

## 2. SaveHandler Orchestrator

**File:** `apps/vscode/src/handlers/SaveHandler.ts` (lines 5-192)

**Architecture:**
```
SaveHandler.handleSave()
├─ AnalysisCoordinator.analyzeAndPublish()
│  └─ Risk analysis + diagnostic publishing
├─ ProtectionLevelHandler.handleProtectionLevel()
│  └─ Watch/Warn/Block logic
├─ CooldownService
└─ AuditLogger
```

**Critical Issue:** SaveHandler sets up the structure but delegates to handlers without capturing the full context needed for modals/comments.

---

## 3. BLOCK Level Protection - Full Disconnect

### Handler Entry

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 120-128)

```typescript
// In handleProtectionLevel(), switch statement routes based on level
switch (protectionLevel) {
    case "Protected":  // "Protected" = "Block" in type mapping
        return await this.handleBlockLevel(
            filePath,
            filename,
            preSaveContent,
            document,
            protectionLevel,
        );
    // ...
}
```

### Handler Implementation

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 152-182)

```typescript
private async handleBlockLevel(
    filePath: string,
    filename: string,
    preSaveContent: string,
    document: vscode.TextDocument,
    protectionLevel: ProtectionLevel,
): Promise<ProtectionHandlingResult> {
    logger.info(
        "Save blocked due to BLOCK protection level (MVP implementation)",
        { filePath },
    );

    vscode.window.setStatusBarMessage(
        `🔴 Save blocked: ${filename} requires snapshot (MVP)`,
        2000,
    );

    await this.auditLogger.recordAudit(
        filePath,
        protectionLevel,
        "save_blocked",
        { reason: "protection_level_block" },
    );

    await this.restoreDocumentContents(document, preSaveContent);

    // ❌ DISCONNECT #1: Throws immediately without user interaction
    throw new vscode.CancellationError();
}
```

### The Orphaned Dialog

**File:** `apps/vscode/src/ui/dialogs.ts` (lines 19-47)

```typescript
export async function showBlockDialog(
    options: BlockDialogOptions,
): Promise<"continue" | "createSnapshot" | "cancel"> {
    const message = `Save blocked for ${options.fileName} (${options.protectionLevel} level)`;
    const detail = generateDialogDetail(options);

    // Modal dialog with full options
    const selection = await vscode.window.showErrorMessage(
        message,
        {
            modal: true,
            detail,
        },
        "Continue",
        "Create Snapshot & Continue",
        "Cancel Save",
    );

    // Returns user selection
    switch (selection) {
        case "Continue":
            return "continue";
        case "Create Snapshot & Continue":
            return "createSnapshot";
        case "Cancel Save":
            return "cancel";
        default:
            return "cancel";
    }
}
```

**Problem:** `handleBlockLevel()` never calls `showBlockDialog()`!

### Expected Flow: What SHOULD Happen

```typescript
private async handleBlockLevel(
    filePath: string,
    filename: string,
    preSaveContent: string,
    document: vscode.TextDocument,
    protectionLevel: ProtectionLevel,
): Promise<ProtectionHandlingResult> {
    // ✓ MISSING: Show dialog with options
    const dialogOptions: BlockDialogOptions = {
        fileName: filename,
        filePath,
        protectionLevel: "Block",
        riskScore: undefined, // TODO: get from analysis
        reasons: undefined,   // TODO: get from analysis
    };
    
    const action = await SnapBackDialogs.showBlockDialog(dialogOptions);
    
    switch (action) {
        case "continue": {
            // ✓ MISSING: Collect justification for override
            const override = await SnapBackDialogs.showOverrideDialog(dialogOptions);
            
            if (override.action === "override") {
                // ✓ MISSING: Record justification in audit log
                await this.auditLogger.recordAudit(
                    filePath,
                    protectionLevel,
                    "save_allowed",
                    {
                        reason: "user_override_block_level",
                        justification: override.justification,
                    },
                );
                return {
                    shouldProceed: true,
                    shouldSnapshot: false,
                    reason: "user_override",
                };
            }
            // If user cancels override, fall through to cancel
        }
        
        case "createSnapshot": {
            const snapshotId = await this.createSnapshotForFile(
                filePath,
                filename,
                preSaveContent,
            );
            // ... record audit
            return {
                shouldProceed: true,
                shouldSnapshot: true,
                reason: "snapshot_created",
                snapshotId,
            };
        }
        
        case "cancel": {
            await this.restoreDocumentContents(document, preSaveContent);
            throw new vscode.CancellationError();
        }
    }
}
```

### Audit Trail Impact

**Current:**
```
Event: save_blocked
Reason: protection_level_block
Metadata: (empty)
```

**Expected:**
```
Event: save_allowed
Reason: user_override_block_level
Metadata: {
    justification: "Verified the change doesn't affect auth logic",
    userAction: "selected_continue_after_dialog",
    dialogShownAt: 1700412345000,
    decisionTime: 1700412350500,
}
```

---

## 4. WARN Level Protection - Auto-Execute Without Asking

### Handler Entry & Implementation

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 130-136, 188-282)

```typescript
// Route to warn handler
case "Warning":
    return await this.handleWarnLevel(
        filePath,
        filename,
        preSaveContent,
        protectionLevel,
    );
```

```typescript
private async handleWarnLevel(
    filePath: string,
    filename: string,
    preSaveContent: string,
    protectionLevel: ProtectionLevel,
): Promise<ProtectionHandlingResult> {
    // Check debounce
    const shouldDebounce = this.cooldownService.shouldDebounce(filePath);
    if (shouldDebounce) {
        // Allow save without snapshot
        return {
            shouldProceed: true,
            shouldSnapshot: false,
            reason: "debounce_bypass",
        };
    }

    // ❌ DISCONNECT #2: Creates snapshot WITHOUT asking user
    try {
        const snapshotId = await this.createSnapshotForFile(
            filePath,
            filename,
            preSaveContent,
        );

        if (snapshotId) {
            // ... set cooldown
            
            // ❌ DISCONNECT #3: Shows notification AFTER creating snapshot
            // User has no choice at this point
            this.showWarnNotification(
                filename,
                snapshotId,
                path.relative(workspaceRoot, filePath),
            );

            return {
                shouldProceed: true,
                shouldSnapshot: true,
                reason: "warning_level",
                snapshotId,
            };
        }
    } catch (error) {
        // ... error handling
    }

    return {
        shouldProceed: true,
        shouldSnapshot: false,
        reason: "snapshot_creation_failed",
    };
}
```

### The Notification (After the Fact)

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 446-494)

```typescript
private showWarnNotification(
    filename: string,
    snapshotId: string,
    relativePath: string,
): void {
    vscode.window.setStatusBarMessage(
        `🟡 Snapshot captured for ${filename}`,
        5000,
    );

    // Only button is "Restore Snapshot" - no way to prevent snapshot
    vscode.window
        .showInformationMessage(
            `SnapBack captured a snapshot for "${filename}"`,
            "Restore Snapshot",
        )
        .then(async (selection) => {
            // ... restore handler
        });
}
```

### Expected Flow: Proper WARN Behavior

WARN level should:
1. **ASK** user if they want a snapshot before saving
2. **ALLOW** user to skip snapshot
3. **OPTIONALLY** collect comments if user overrides
4. **RECORD** the user's decision

```typescript
private async handleWarnLevel(
    filePath: string,
    filename: string,
    preSaveContent: string,
    protectionLevel: ProtectionLevel,
): Promise<ProtectionHandlingResult> {
    // Check debounce first
    const shouldDebounce = this.cooldownService.shouldDebounce(filePath);
    if (shouldDebounce) {
        // Still notify user at warn level
        vscode.window.setStatusBarMessage(
            `🟡 Warn level (debounced) - save allowed`,
            3000,
        );
        return {
            shouldProceed: true,
            shouldSnapshot: false,
            reason: "debounce_bypass",
        };
    }

    // ✓ MISSING: Show dialog BEFORE creating snapshot
    const response = await vscode.window.showWarningMessage(
        `File "${filename}" has WARN protection. Create snapshot before saving?`,
        {
            modal: true,
            detail: "This helps you rollback if changes cause issues.",
        },
        "Create Snapshot",
        "Save Without Snapshot",
        "Cancel",
    );

    switch (response) {
        case "Create Snapshot": {
            // Create snapshot and show confirmation
            try {
                const snapshotId = await this.createSnapshotForFile(
                    filePath,
                    filename,
                    preSaveContent,
                );

                if (snapshotId) {
                    await this.cooldownService.setCooldown(...);
                    
                    // Show notification AFTER snapshot created
                    vscode.window.setStatusBarMessage(
                        `✅ Snapshot created for ${filename}`,
                        3000,
                    );

                    return {
                        shouldProceed: true,
                        shouldSnapshot: true,
                        reason: "user_approved_snapshot",
                        snapshotId,
                    };
                }
            } catch (error) {
                // Handle error
            }
            break;
        }

        case "Save Without Snapshot": {
            // ✓ MISSING: Collect optional comments for audit
            const comments = await vscode.window.showInputBox({
                prompt: "Why are you saving without snapshot?",
                placeHolder: "E.g., Just formatting changes",
                ignoreFocusOut: true,
            });

            await this.auditLogger.recordAudit(
                filePath,
                protectionLevel,
                "save_allowed",
                {
                    reason: "user_skipped_snapshot",
                    comments,
                },
            );

            return {
                shouldProceed: true,
                shouldSnapshot: false,
                reason: "user_skipped_snapshot",
            };
        }

        case "Cancel":
        default: {
            await this.restoreDocumentContents(document, preSaveContent);
            throw new vscode.CancellationError();
        }
    }
}
```

---

## 5. Security Analysis Override - Missing Justification

### Analysis Path

**File:** `apps/vscode/src/handlers/AnalysisCoordinator.ts` (lines 149-193)

```typescript
private async handleRiskBasedBlocking(
    filePath: string,
    filename: string,
    content: string,
    document: vscode.TextDocument,
    analysisResult: AnalysisResult | BasicAnalysisResult,
    protectionLevel: ProtectionLevel,
): Promise<{ shouldBlock: boolean; userOverride: boolean }> {
    // Block when risk > 8 and protectionLevel === 'Protected'
    if (analysisResult.score > 8 && protectionLevel === "Protected") {
        const selection = await vscode.window.showErrorMessage(
            `Critical security issues detected in ${filename}. Save blocked due to protection level.`,
            "Save Anyway (Override)",
            "Cancel Save",
        );

        if (selection !== "Save Anyway (Override)") {
            // Block the save
            await this.auditLogger.recordAudit(
                filePath,
                protectionLevel,
                "save_blocked",
                {
                    reason: "critical_security_issues_blocked",
                    factors: analysisResult.factors,
                    risk_score: analysisResult.score,
                },
            );
            await this.restoreDocumentContents(document, content);
            throw new vscode.CancellationError();
        }

        // ❌ DISCONNECT #4: No justification collected on override
        // User can override critical security issues with NO explanation
        await this.auditLogger.recordAudit(
            filePath,
            protectionLevel,
            "save_allowed",
            {
                reason: "user_override_critical_security",
                factors: analysisResult.factors,
                risk_score: analysisResult.score,
                // Missing: justification for overriding security warning
            },
        );

        return { shouldBlock: false, userOverride: true };
    }
    // ... more cases
}
```

### The Unused Override Dialog

**File:** `apps/vscode/src/ui/dialogs.ts` (lines 52-75)

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

**Problem:** This function exists but is NEVER called!

### Where It Should Be Used

```typescript
// In handleRiskBasedBlocking() - after user selects "Save Anyway (Override)"
if (selection === "Save Anyway (Override)") {
    // ✓ MISSING: Collect justification
    const override = await SnapBackDialogs.showOverrideDialog(dialogOptions);
    
    if (override.action === "cancel") {
        // User decided not to override
        await this.restoreDocumentContents(document, content);
        throw new vscode.CancellationError();
    }
    
    // Record override WITH justification
    await this.auditLogger.recordAudit(
        filePath,
        protectionLevel,
        "save_allowed",
        {
            reason: "user_override_critical_security",
            justification: override.justification,
            factors: analysisResult.factors,
            risk_score: analysisResult.score,
        },
    );

    return { shouldBlock: false, userOverride: true };
}
```

---

## 6. MVP Stub - Promise Unfulfilled

### The Stubbed Function

**File:** `apps/vscode/src/ui/ProtectionLevelSelector.ts` (lines 80-93)

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

### The Comment (Older Implementation)

Commented out above the stub:

```typescript
/*
export async function showBlockConfirmation(
    filename: string,
): Promise<"snapshot" | "override" | "cancel"> {
    const blockMetadata = PROTECTION_LEVELS.Protected;

    const choice = await vscode.window.showWarningMessage(
        `${blockMetadata.icon} File "${filename}" requires snapshot before save`,
        {
            modal: true,
            detail:
                "This file has BLOCK protection enabled. You must create a snapshot or explicitly override protection to save changes.",
        },
        "Create Snapshot",
        "Override Protection",
        "Cancel",
    );

    switch (choice) {
        case "Create Snapshot":
            return "snapshot";
        case "Override Protection":
            return "override";
        default:
            return "cancel";
    }
}
*/
```

### The Promise

The MVP notes promise:
> "inline banners with 'Allow once · Mark wrong · Details' chips that store rationale without flow break"

**Status:** ❌ Never implemented

**Current Result:** Function throws error if called

---

## 7. Temporary Allowance System - Incomplete

### Handler Check

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 95-117)

```typescript
// Check for temporary allowance (applies to all levels)
if (this.registry.hasTemporaryAllowance(filePath)) {
    this.registry.consumeTemporaryAllowance(filePath);
    logger.info("Save allowed due to temporary allowance", { filePath });

    vscode.window.setStatusBarMessage(
        `✅ Save allowed once for ${filename}`,
        2000,
    );

    await this.auditLogger.recordAudit(
        filePath,
        protectionLevel,
        "save_allowed",
        { reason: "temporary_allowance" },
    );

    return {
        shouldProceed: true,
        shouldSnapshot: false,
        reason: "temporary_allowance",
    };
}
```

**Issues:**
- ✓ Mechanism exists
- ❌ No UI to grant temporary allowance
- ❌ No "Allow Once" button in any dialog
- ❌ Users can't grant themselves temporary allowance

**Where "Allow Once" Should Be:**
- BLOCK dialog: Fourth button "Allow Once"
- WARN dialog: Alternative button "Skip for Now"
- Security override dialog: "Override This Time Only"

---

## 8. Mark Wrong Feature - Completely Missing

### Referenced But Not Implemented

The MVP notes mention:
> "Allow once · Mark wrong · Details"

**Current Status:**
- ❌ No "Mark Wrong" button in any dialog
- ❌ No feedback mechanism
- ❌ No way to flag analysis errors
- ❌ No backend integration to learn from user feedback

**Expected Implementation:**
```typescript
// After showing analysis results
const selection = await vscode.window.showWarningMessage(
    "Security issues detected. Is this a false positive?",
    "Mark Wrong",
    "Details",
    "Save Anyway",
    "Cancel",
);

if (selection === "Mark Wrong") {
    // Send feedback to backend
    await this.apiClient.markAnalysisFalsePositive({
        filePath,
        analysisScore: analysisResult.score,
        factors: analysisResult.factors,
        userOverride: true,
    });
    
    // Optionally allow this one save
    return { shouldBlock: false, userOverride: true };
}
```

---

## 9. Cooldown Interaction Points

### Where Cooldown Bypasses User Interaction

**File:** `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (lines 70-93)

```typescript
// Check if file is in cooldown
const inCooldown = await this.cooldownService.isInCooldown(filePath);
if (inCooldown) {
    logger.info(
        "File is in cooldown, allowing save without additional checks",
        { filePath, protectionLevel },
    );

    // ⚠️  Allows save WITHOUT showing any dialogs
    return {
        shouldProceed: true,
        shouldSnapshot: false,
        reason: "cooldown_bypass",
    };
}
```

**Issue:** For BLOCK level, even cooldown should show brief confirmation.

---

## 10. Summary: Every Disconnect

| # | Type | Location | Issue | Impact |
|---|------|----------|-------|--------|
| 1 | BLOCK | ProtectionLevelHandler.handleBlockLevel | No dialog call | User sees undo with no choice |
| 2 | WARN | ProtectionLevelHandler.handleWarnLevel | Creates snapshot first, asks after | User's choice comes too late |
| 3 | WARN | ProtectionLevelHandler.handleWarnLevel | No confirmation modal | Auto-snapshot violates WARN semantics |
| 4 | Override | AnalysisCoordinator.handleRiskBasedBlocking | No justification dialog | Can override critical security with no reason |
| 5 | Dialog | dialogs.ts::showOverrideDialog | Function defined but never called | Justification collection never happens |
| 6 | BLOCK | ProtectionLevelSelector.showBlockConfirmation | Stubbed with error | MVP promise unfulfilled |
| 7 | UI | MVP notes | Inline UI promised | CodeLens/chips never implemented |
| 8 | Feature | MVP notes | "Allow Once" promised | No UI to grant temporary allowance |
| 9 | Feature | MVP notes | "Mark Wrong" promised | No false positive feedback mechanism |
| 10 | Audit | Multiple locations | No justification fields | Can't audit why users overrode |

---

## Connection Map

```
SaveHandler.handleSave()
├─ AnalysisCoordinator.analyzeAndPublish()
│  └─ ❌ Never calls showOverrideDialog() on critical security override
│
└─ ProtectionLevelHandler.handleProtectionLevel()
   ├─ BLOCK path
   │  ├─ handleBlockLevel()
   │  │  └─ ❌ Never calls showBlockDialog()
   │  │  └─ ❌ Never calls showOverrideDialog() on "continue"
   │  └─ ✓ Dialog exists but orphaned
   │
   ├─ WARN path
   │  ├─ handleWarnLevel()
   │  │  ├─ ❌ No dialog BEFORE creating snapshot
   │  │  └─ ❌ No comment collection on skip
   │  └─ showWarnNotification()
   │     └─ ❌ Only shows AFTER decision made
   │
   └─ WATCH path
      └─ handleWatchLevel()
         ├─ ✓ Silently creates snapshot (correct)
         └─ ✓ Shows only status notification
```

---

## Code Dependencies

**Functions that exist but aren't called:**
- `SnapBackDialogs.showBlockDialog()` - defined, never invoked
- `SnapBackDialogs.showOverrideDialog()` - defined, never invoked
- `ProtectionLevelSelector.showBlockConfirmation()` - stubbed, can't be called

**Flows that are incomplete:**
- BLOCK user interaction
- WARN user confirmation
- Override justification collection
- Temporary allowance granting
- False positive feedback

**Audit trails that are incomplete:**
- No override justification fields
- No user decision timestamps
- No dialog interaction records
