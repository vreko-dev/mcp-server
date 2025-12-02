# Quick Reference: Notification System Maturity

## Key Metrics at a Glance

```
MATURITY SCORE: 12/50 🔴 CRITICAL
├─ Centralization:    2/10  ❌ (284 direct API calls despite NotificationManager)
├─ Persistence:       1/10  ❌ (Only 15 acknowledgments scattered)
├─ Non-Blocking:      3/10  ❌ (73 blocking notifications during activation)
├─ Testability:       4/10  ⚠️  (40% coverage, 93 files with duplication)
└─ UX Consistency:    2/10  ❌ (Wording, severity, icons all vary)

TOTAL NOTIFICATIONS: 317 direct API calls
├─ Direct vscode.window.showXxxMessage:  284 ❌
├─ WithProgress/status bar:               33  ⚠️
└─ Through NotificationManager:           29  ✅ (9% adoption)

RECOMMENDATION: ✅ FULL CENTRALIZATION REQUIRED
Effort: XL (~2 weeks)
ROI: High (enables rate limiting, A/B testing, analytics)
```

## Most Impactful Issues

### 🔴 CRITICAL (Fix First)

1. **Blocking Notifications During Extension Activation**
   - Location: `extension.ts:121, 156-165`
   - Impact: 2-3 second perceived delay at startup
   - Fix: Make workspace trust warning non-blocking (use status bar)

2. **No Unified Acknowledgment System**
   - 15 instances scattered across 3 different approaches
   - Users can't control notification spam
   - Fix: Centralize in NotificationManager with "Don't show again" button

3. **284 Direct API Calls Bypass NotificationManager**
   - Undermines 951 lines of well-designed infrastructure
   - Prevents rate limiting, persistence, analytics
   - Fix: Systematic refactoring (see roadmap below)

### ⚠️ HIGH (Fix Next)

4. **31 Modal Dialogs Without Consistent Handling**
   - Users dismiss modals, flow continues undefined
   - Fix: Standardize modal handling pattern

5. **No Rate Limiting in Production**
   - Same notification can fire 10+ times rapidly
   - SmartDismissalManager exists but unused
   - Fix: Enable deduplication in NotificationManager

6. **Hardcoded Strings - No i18n Support**
   - 40+ instances of English-only messages
   - Fix: Centralize message strings, add i18n layer

## Refactoring Roadmap (Phase by Phase)

### Phase 1: Setup (Day 1) ⚙️
- [ ] Extend NotificationManager methods
  - `acknowledgeDontShowAgain(id)`
  - `isAcknowledged(id)`
  - `showWithRateLimit()`
- [ ] Audit all 284 call sites
- [ ] Categorize by notification type

### Phase 2: Category A - Protection Level (Day 2) 🛡️
- [ ] Identify 80 protection-related notifications
- [ ] Route through new `showLevelNotification()` helper
- [ ] Add tests for each protection level

### Phase 3: Category B - Errors & Warnings (Day 3) ⚠️
- [ ] Identify 85 error/warning notifications
- [ ] Create `showError()` and `showWarning()` wrappers
- [ ] Add error recovery tests

### Phase 4: Category C - Modals (Day 4) 📋
- [ ] Identify 31 modal confirmations
- [ ] Create `showModal()` with action mapping
- [ ] Add action handling tests

### Phase 5: Category D - Progress (Day 5) ⏳
- [ ] Identify 20 withProgress calls
- [ ] Create `showProgress()` wrapper
- [ ] Add progress completion tests

### Phase 6: Category E - Status Bar (Day 6) 📊
- [ ] Identify 36 status bar calls
- [ ] Create `showStatusBar()` with auto-dismiss
- [ ] Add timeout tests

### Phase 7: Category F - Misc & Testing (Days 7-8) 🧪
- [ ] Handle remaining 39 scattered calls
- [ ] Write comprehensive test suite (35 unit + 20 integration)
- [ ] Verify 40% → 80%+ coverage

### Phase 8: Deploy & Monitor (Day 9) 🚀
- [ ] Staged rollout to beta users
- [ ] Collect notification fatigue feedback
- [ ] Tune rate limits

## File-by-File Impact Assessment

### Highest Impact Files (Fix First)

| File | Calls | Issue | Priority |
|------|-------|-------|----------|
| ProgressiveDisclosureController.ts | 8 | Blocking modals during onboarding | 🔴 |
| SnapshotRestoreUI.ts | 6 | Unhandled restoration messages | 🔴 |
| extension.ts | 2 | Blocking at activation | 🔴 |
| operationCoordinator.ts | 15 | Risk alerts not deduped | 🟠 |
| SaveHandler.ts | 12 | Status bar messages | 🟠 |
| dialogs.ts | 8 | Modal inconsistency | 🟠 |

### Medium Impact (Fix Next)

- ProtectionLevelSelector.ts (8 calls - protection alerts)
- SnapshotManager.ts (15 calls - snapshot feedback)
- commands/ directory (40+ scattered calls)

### Lower Impact (Fix Last)

- Test files (use for validation)
- UI providers (status displays)

## Success Criteria

After centralization, verify:

✅ **Adoption**: >95% of notifications routed through NotificationManager (>300/317)

✅ **Rate Limiting**: Same notification fires max 1x per 5 seconds

✅ **Acknowledgment**: User can dismiss similar notifications for session/permanently

✅ **Blocking**: <5% of notifications block extension (only critical errors)

✅ **Test Coverage**: >80% of notification code covered by tests

✅ **UX Consistency**:
- Button labels from consistent set ("OK", "Cancel", "Next", "Skip")
- Error messages always use `showErrorMessage`
- Confirmations always use modals with proper handling
- Status updates use status bar with auto-dismiss

## Common Pitfalls to Avoid

```typescript
// ❌ DON'T: Direct calls still exist
vscode.window.showInformationMessage("Snapshot created");

// ✅ DO: Route through centralized manager
await notificationManager.showSnapshotCreated(snapshotId);

// ❌ DON'T: Block activation
export async function activate(context: ExtensionContext) {
  await vscode.window.showWarningMessage("Trust workspace?").then(...);
  // Extension waits for user response
}

// ✅ DO: Show warning async
export async function activate(context: ExtensionContext) {
  notificationManager.showWorkspaceTrustWarning(); // Fire and forget
  // Extension continues immediately
}

// ❌ DON'T: Hardcoded strings everywhere
showErrorMessage("Error: " + errorDetails);

// ✅ DO: Centralized, structured notifications
await notificationManager.show({
  type: "error",
  message: "Operation Failed",
  detail: errorDetails,
  id: `error-${Date.now()}`
});

// ❌ DON'T: Forget to handle modal result
const choice = await vscode.window.showWarningMessage("Continue?", "Yes", "No");
// Code continues regardless of user choice

// ✅ DO: Check result before proceeding
const choice = await notificationManager.showModal({
  message: "Continue?",
  actions: [{ title: "Yes", command: "cmd.yes" }, { title: "No" }]
});
if (choice?.command === "cmd.yes") {
  // Proceed only if user selected Yes
}
```

## Testing Checklist

When you add tests for centralized system, verify:

- [ ] Rate limiting blocks 2nd identical notification
- [ ] Rate limiting allows different notification type
- [ ] Acknowledgment persists across restarts
- [ ] Action buttons trigger correct commands
- [ ] Blocking notifications only during user confirmation
- [ ] Status bar messages auto-dismiss after 3s
- [ ] Modal dialogs require explicit user action
- [ ] Fire-and-forget errors are logged, don't crash
- [ ] Notification history bounded at 50 items
- [ ] Telemetry tracks notification interactions

## Next Actions

**This Week:**
1. Read full evaluation: `NOTIFICATION_SYSTEM_MATURITY_EVALUATION.md`
2. Review blocking notifications in `extension.ts`
3. Schedule refactoring sprint planning

**Next Week:**
1. Extend NotificationManager with persistence methods
2. Create categorized refactoring plan
3. Start Phase 1: Protection Level notifications

**Code Review Checklist** (Before merging):
- All new notification calls use NotificationManager ✅
- No direct `vscode.window.showXxxMessage` calls ✅
- Rate limit key provided for deduplication ✅
- Acknowledgment ID provided where applicable ✅
- Modal results are checked before continuing ✅
- Test coverage increased (not decreased) ✅

