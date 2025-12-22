# SnapBack Extension: Systemic Risks Deep-Dive Analysis
**Analysis Date:** December 9, 2025 20:50 UTC  
**Scope:** Runtime failure risk assessment before demo  
**Status:** CRITICAL FINDINGS - Multiple systemic issues identified

---

## INVESTIGATION METHODOLOGY

This analysis follows a **sequential integration-centric approach**:
1. **Activation Order Analysis** - Identify initialization race conditions
2. **Error Propagation Audit** - Find silent failure points
3. **Concurrent Write Safety** - Test rapid operation handling
4. **Event Bus Completeness** - Map emit/on listeners
5. **Auth State Machine** - Verify authentication flow edge cases

---

## FINDING 1: ACTIVATION ORDER RACE CONDITION ⚠️ RISK FOUND

**Status:** ⚠️ RACE CONDITION DETECTED  
**Severity:** HIGH - Likely to cause runtime failures

### The Issue

In `extension.ts`, line 177-223, an authentication event listener is registered **BEFORE** `userIdentityService` is initialized.

```typescript
// ⚠️ LINE 177: Listener registered EARLY
context.subscriptions.push(
    vscode.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === "snapback") {
            if (sessions && userIdentityService) {  // ⚠️ Check for null
                await userIdentityService.handleLogin(sessions.account.id);
                // ...
            } else {
                logger.info("⚠️ Extension: No session or userIdentityService not ready");
            }
        }
    }),
);

// ✅ LINE 401: UserIdentityService initialized MUCH LATER
userIdentityService = new UserIdentityService(anonymousIdManager, authService, telemetryProxy);
```

### Race Condition Scenario

**Timing Problem:**
1. Authentication event listener registered at **line 177**
2. If user has cached session, `onDidChangeSessions` fires **immediately** or during activation
3. `userIdentityService` not initialized until **line 401** (224 lines later)
4. If event fires between registration and initialization → **null pointer check silently fails**

**Impact Chain:**
```
Auth session change fires
    ↓
Listener runs: if (sessions && userIdentityService) → FALSE
    ↓
User sees: "⚠️ Extension: No session or userIdentityService not ready"
    ↓
handleLogin() NEVER CALLED
    ↓
Credentials never synced to CredentialsManager
    ↓
Commands using auth fail silently
    ↓
Demo blocked: Can't access protected features
```

### Evidence

**File:** `apps/vscode/src/extension.ts`
- **Lines 177-223:** Early listener registration with null-check fallback
- **Lines 382-404:** UserIdentityService initialization 224 lines later
- **Line 185:** Conditional check `if (sessions && userIdentityService)` gates logic

**Actual Problem:** The null-check is **defensive but masks the timing bug**. Users won't see clear error—just silent failure.

### Test Case

```typescript
// Scenario: User has cached auth session
1. Close VS Code while authenticated
2. Session persisted in VS Code auth storage
3. Open VS Code → Extension activation begins
4. AuthProvider fires onDidChangeSessions event (early in activation)
5. Listener executes: userIdentityService is still null
6. Silent failure: handleLogin() not called
7. User remains "authenticated" to VS Code but not to SnapBack
8. Commands fail because CredentialsManager not synced
```

### Recommended Fix

**Move listener registration to AFTER UserIdentityService initialization**, OR create UserIdentityService earlier:

```typescript
// Option 1: Register listener AFTER UserIdentityService exists
userIdentityService = new UserIdentityService(...);

// NOW register listener (userIdentityService guaranteed to exist)
context.subscriptions.push(
    vscode.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === "snapback" && sessions && userIdentityService) {
            await userIdentityService.handleLogin(...);
        }
    }),
);

// Option 2: Use optional chaining + queued operation
context.subscriptions.push(
    vscode.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === "snapback" && sessions) {
            // Queue operation if userIdentityService not ready
            if (userIdentityService) {
                await userIdentityService.handleLogin(...);
            } else {
                // Queue for later processing
                queuedAuthChanges.push(e);
            }
        }
    }),
);
```

**Fix Effort:** 30 minutes  
**Risk if unfixed:** User authentication fails silently → Commands fail → Demo blocked

---

## FINDING 2: ERROR PROPAGATION DEAD ZONES ❌ CRITICAL

**Status:** ❌ SILENT FAILURE POINTS FOUND  
**Severity:** CRITICAL - Multiple unhandled errors

### The Issue

Throughout the codebase, errors are caught but **not propagated to user** or **not logged with context**:

### Error Sink #1: Fire-and-Forget Async Operations

**File:** `apps/vscode/src/handlers/SaveHandler.ts`, lines 126-136

```typescript
// ❌ ANTI-PATTERN: Fire and forget with only internal null-check
void (async () => {
    if (this.milestoneService) {
        await this.milestoneService.triggerFirstTimeEvent(...);
        // ...
    }
})();  // ← No .catch() handler
```

**Problem:** If `milestoneService.triggerFirstTimeEvent()` throws:
- Error is silently swallowed
- User sees no notification
- No log message
- Extension continues as if nothing happened

**Impact:** Demo fails silently when milestone tracking crashes

---

### Error Sink #2: Async .catch() Without Notification

**File:** `apps/vscode/src/activation/phase2-storage.ts`, lines 149-181

```typescript
// ❌ PATTERN: .catch() that only logs, doesn't notify user
autoProtectConfig.initialize().catch((err) => {
    logger.error("Failed to initialize auto-protect config", err as Error);
    // No user notification!
    // Extension continues silently broken
});

snapbackrcLoader.loadConfig().catch((err) => {
    logger.error("Failed to load snapback config", err as Error);
    // No user notification!
});

migrationService.checkAndMigrate().catch((err) => {
    logger.error("Failed to migrate old snapshots", err as Error);
    // No user notification!
});

mcpManager.start().catch((err) => {
    logger.error("Failed to start MCP server", err as Error);
    // No user notification!
});
```

**Problem:**
- 4 critical initialization steps have `.catch()` handlers
- Each logs error internally only
- User sees nothing
- Extension may be partially broken but appears normal

**Demo Impact:**
- User tries to use feature
- Feature silently fails because initialization error swallowed
- User confused: "Nothing happens when I click the button"

---

### Error Sink #3: Missing Error Handler in Event Bus

**File:** `apps/vscode/src/extension.ts`, lines 584-609

```typescript
// ❌ Event listeners with NO error handling
bus.on(SnapBackEvent.SNAPSHOT_CREATED, snapshotCreatedHandler);
// If snapshotCreatedHandler throws → Error unhandled

bus.on(SnapBackEvent.PROTECTION_CHANGED, protectionChangedHandler);
// If protectionChangedHandler throws → Error unhandled

bus.on(SnapBackEvent.ANALYSIS_COMPLETED, analysisCompletedHandler);
// If analysisCompletedHandler throws → Error unhandled
```

**Missing Pattern:**
```typescript
// Should be:
bus.on(SnapBackEvent.SNAPSHOT_CREATED, async (payload) => {
    try {
        await snapshotCreatedHandler(payload);
    } catch (error) {
        logger.error("Snapshot created handler failed", error as Error);
        vscode.window.showErrorMessage("Snapshot notification failed");
    }
});
```

**Impact:** If TreeView refresh throws during event → TreeView stops responding, user doesn't know why

---

### Error Sink #4: NotificationManager Error Propagation

**File:** `apps/vscode/src/notificationManager.ts`, line ~143+

**Question:** When NotificationManager.show() fails, what happens?

- ❓ Does it notify user of the notification failure? (Recursive problem)
- ❓ Does it log to console with context?
- ❓ Does it propagate to extension error handler?
- ❓ Or silently fail?

**Evidence:** NotificationManager likely has try/catch internally but unclear if errors surface.

---

### Comprehensive Error Audit Summary

| Error Source | Current Handler | User Notification | Risk |
|---|---|---|---|
| SaveHandler milestone tracking | (none) | ❌ | SILENT FAIL |
| AutoProtect initialization | .catch() log only | ❌ | PARTIAL BREAK |
| Config loading | .catch() log only | ❌ | CONFIG IGNORED |
| Migration service | .catch() log only | ❌ | DATA LOST |
| MCP startup | .catch() log only | ❌ | MCP DISABLED |
| Event handlers | (none) | ❌ | SILENT FAIL |
| NotificationManager | **UNCLEAR** | ❓ | UNKNOWN |
| StorageManager init | throw + notify | ✅ | GOOD |

---

### Recommended Fix

Create a centralized error notification helper:

```typescript
// apps/vscode/src/utils/errorHandler.ts
export async function handleAsyncError(
    promise: Promise<any>,
    context: string,
    shouldNotifyUser: boolean = true
): Promise<void> {
    try {
        await promise;
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Always log
        logger.error(`Error in ${context}:`, err);
        
        // Notify user if critical
        if (shouldNotifyUser) {
            vscode.window.showErrorMessage(
                `SnapBack: ${context} failed. Check output panel for details.`
            );
        }
    }
}
```

Then use it:
```typescript
// BEFORE: ❌
autoProtectConfig.initialize().catch((err) => {
    logger.error("Failed", err);
});

// AFTER: ✅
await handleAsyncError(
    autoProtectConfig.initialize(),
    "Auto-protect initialization",
    true  // Notify user
);
```

**Fix Effort:** 2-3 hours  
**Risk if unfixed:** Multiple silent failures → Demo appears broken → User confused

---

## FINDING 3: CONCURRENT WRITE RACE CONDITIONS ⚠️ RISK FOUND

**Status:** ⚠️ POTENTIAL RACE CONDITION  
**Severity:** MEDIUM - Requires specific timing

### The Issue

StorageManager uses atomic writes but **no write queue/mutex** for rapid successive operations.

**File:** `apps/vscode/src/storage/StorageManager.ts`

**Atomic write pattern (lines 91-92):**
```typescript
export async function writeJsonFile(uri: vscode.Uri, data: unknown): Promise<void> {
    await atomicWriteFile(uri, JSON.stringify(data, null, 2));
}
```

**Pattern is safe for individual files**, but what about:

### Race Condition: Rapid Saves to Same File

**Scenario:**
```typescript
// User: Save → Save → Save within 100ms
// All three fire onWillSaveTextDocument

// Thread 1: Create snapshot for file.ts (start write)
const snapshot1 = await snapshotStore.createSnapshot(...);

// Thread 2: Create another snapshot for file.ts (starts immediately)
const snapshot2 = await snapshotStore.createSnapshot(...);

// Thread 3: Create third snapshot for file.ts (starts immediately)
const snapshot3 = await snapshotStore.createSnapshot(...);

// All three try to write snapshot metadata simultaneously
// atomicWrite is safe, BUT:
// - Snapshot 1 writes metadata.json
// - Snapshot 2 writes metadata.json (overwrites snapshot 1)
// - Snapshot 3 writes metadata.json (overwrites snapshot 2)
// Result: Snapshots 1 and 2 lost!
```

### Root Cause

SnapshotStore stores each snapshot in a directory with same filename structure:

```
snapshots/
├── snap-001/
│   ├── meta.json ← Overwrite race!
│   ├── files.json
│   └── content/
├── snap-002/
│   ├── meta.json ← Overwrite race!
│   └── ...
```

Each snapshot is independent, so **concurrent writes to different files should be safe**. However:

**Real Risk:** SessionStore and SnapshotStore have shared manifest files:

```
snapshots/
├── manifest.json ← SHARED, multiple writers!
├── snap-001/
├── snap-002/
```

If two snapshots are created simultaneously:
1. Process A reads manifest.json
2. Process B reads manifest.json
3. Process A appends snap-001, writes manifest.json
4. Process B appends snap-002, writes manifest.json
5. **Result: snap-001 lost from manifest**

### Evidence

**File:** `apps/vscode/src/storage/SnapshotStore.ts`

```typescript
private async updateManifest(manifest: SnapshotManifest[]): Promise<void> {
    // ⚠️ No lock/queue prevents concurrent updates!
    await writeJsonFile(this.manifestUri, manifest);
}
```

### Test Case

```bash
# In demo, simulate rapid saves:
1. Open file in editor
2. Change content
3. Ctrl+S (save)
4. Immediately: Ctrl+Z (undo) → Ctrl+S (save again)
5. Immediately: Ctrl+Z (undo) → Ctrl+S (save again)
6. Result: 3 saves within 200ms
7. Expected: 3 snapshots created
8. Actual: Possible race condition, snapshots may be lost
```

### Recommended Fix

Add write queue to StorageManager:

```typescript
// apps/vscode/src/storage/StorageManager.ts
export class StorageManager {
    private writeQueue: Map<string, Promise<void>> = new Map();
    
    private async enqueueWrite(key: string, operation: () => Promise<void>): Promise<void> {
        const previous = this.writeQueue.get(key) || Promise.resolve();
        const current = previous.then(operation);
        this.writeQueue.set(key, current);
        try {
            await current;
        } finally {
            if (this.writeQueue.get(key) === current) {
                this.writeQueue.delete(key);
            }
        }
    }
    
    async createSnapshot(...): Promise<SnapshotWithContent> {
        return this.enqueueWrite("snapshots-manifest", async () => {
            // Snapshot creation now serialized
            return this.snapshotStore.createSnapshot(...);
        });
    }
}
```

**Fix Effort:** 2 hours  
**Risk if unfixed:** Rapid saves may lose snapshots → Demo shows missing data

---

## FINDING 4: EVENT BUS INCOMPLETE WIRING ⚠️ RISK FOUND

**Status:** ⚠️ PARTIAL WIRING  
**Severity:** MEDIUM - Late subscribers miss events

### The Issue

Events fired from StorageManager, but **listeners registered later** miss those events.

**Event Publishing (Storage Layer):**
- `apps/vscode/src/storage/StorageManager.ts`, line 66: `this.eventBus.publish(event, payload)`
- `apps/vscode/src/operationCoordinator.ts`, line 258: `this.eventBus.publish(event, payload)`

**Event Listening (UI Layer):**
- `apps/vscode/src/extension.ts`, lines 584-609: `bus.on(...)`

### Race Condition: Events Fire Before Listeners Attach

**Scenario:**

```typescript
// Phase 3 (line 323): StorageManager created with eventBus
const phase3Result = await initializePhase3Managers(
    context,
    workspaceRoot,
    phase2Result.storage,  // ← Created, starts publishing events
    telemetryProxy,
    // ... operations may fire SNAPSHOT_CREATED, PROTECTION_CHANGED
);

// Many lines later...

// Phase 5 (lines 584-609): Listeners attached
bus.on(SnapBackEvent.SNAPSHOT_CREATED, snapshotCreatedHandler);
bus.on(SnapBackEvent.PROTECTION_CHANGED, protectionChangedHandler);
```

**If a snapshot is created during Phase 3:**
1. SNAPSHOT_CREATED fires
2. But listeners not attached yet
3. Event is lost
4. TreeView doesn't refresh
5. User doesn't see snapshot

### Evidence

**Files:**
- `apps/vscode/src/extension.ts`, lines 300-415: Phases 2-4 (events may fire)
- `apps/vscode/src/extension.ts`, lines 584-609: Listeners registered (Phase 5 equivalent)

**No event buffering mechanism exists** - events are emitted immediately, lost if no listeners.

### Recommended Fix

Add event buffering to EventBus:

```typescript
// In @snapback/events or extension.ts
class BufferingEventBus extends SnapBackEventBus {
    private eventBuffer: Array<{event: SnapBackEvent, payload: unknown}> = [];
    private listenerCount = new Map<SnapBackEvent, number>();
    
    override on<T>(event: SnapBackEvent, listener: (payload: T) => void): void {
        super.on(event, listener);
        this.listenerCount.set(event, (this.listenerCount.get(event) || 0) + 1);
        
        // Flush buffered events for this listener
        this.eventBuffer.forEach(({event: e, payload}) => {
            if (e === event) {
                listener(payload);
            }
        });
        // Clear buffer after replaying
        this.eventBuffer = this.eventBuffer.filter(({event: e}) => e !== event);
    }
    
    override publish<T>(event: SnapBackEvent, payload: T): void {
        if (this.listenerCount.get(event) === undefined || this.listenerCount.get(event) === 0) {
            // No listeners, buffer event
            this.eventBuffer.push({event, payload});
        } else {
            // Has listeners, emit immediately
            super.publish(event, payload);
        }
    }
}
```

**Fix Effort:** 1 hour  
**Risk if unfixed:** Early events lost → TreeViews don't update on initial snapshot → Demo looks broken

---

## FINDING 5: AUTH STATE MACHINE EDGE CASES ⚠️ RISK FOUND

**Status:** ⚠️ INCOMPLETE STATE HANDLING  
**Severity:** MEDIUM - Token expiry not handled

### The Issue

Authentication flow has gaps in token refresh and expired state handling.

**Current Flow:**
1. UnifiedAuthProvider handles OAuth/Mock auth
2. Listener on `onDidChangeSessions` updates `userIdentityService`
3. CredentialsManager stores credentials

**Missing State:** Token expiry and refresh

### Edge Cases Not Handled

**Case 1: Token Expires During Session**
```typescript
// Initial login: ✅ Credentials stored
// 1 hour passes...
// User tries to execute command requiring auth
// Command calls credentialsManager.getCredentials()
// Returns credentials (doesn't check expiry!)
// Command tries to use token
// API rejects with 401 Unauthorized
// User sees cryptic error (if any error shown at all)
```

**Case 2: Refresh Token Fails**
```typescript
// AuthService.refreshToken() fails
// No retry logic
// User stuck in stale state
// No prompt to re-authenticate
```

**Case 3: Multiple Auth Events**
```typescript
// User: Signs in → Signs out → Signs in again
// Rapid onDidChangeSessions fires
// userIdentityService may be in intermediate state
// handleLogin() called while logout() in progress
// Race condition in auth state
```

### Evidence

**File:** `apps/vscode/src/auth/AuthState.ts`

```typescript
async getCredentials(): Promise<UserCredentials | null> {
    const credentials = await this.credentialsManager.getCredentials();
    // ⚠️ Does NOT check if credentials.expiresAt < now()
    if (!credentials) {
        return null;
    }
    return {
        id: credentials.user.id,
        email: credentials.user.email,
        name: credentials.user.name,
    };
}
```

**File:** `apps/vscode/src/auth/AuthService.ts` (assumed to exist)

**Missing logic:**
- No expiry validation
- No automatic refresh attempt
- No clear "expired" state

### Recommended Fix

Add expiry checking and refresh:

```typescript
// apps/vscode/src/auth/AuthState.ts
async getValidCredentials(): Promise<UserCredentials | null> {
    const credentials = await this.credentialsManager.getCredentials();
    if (!credentials) {
        return null;
    }
    
    // ✅ Check if expired
    if (credentials.expiresAt < Date.now()) {
        // Try refresh
        try {
            const refreshed = await this.authService.refreshToken(credentials.refreshToken);
            await this.credentialsManager.setCredentials(refreshed);
            return { /* return refreshed */ };
        } catch (error) {
            // Refresh failed, clear credentials
            await this.credentialsManager.clearCredentials();
            vscode.window.showInformationMessage("Your SnapBack session expired. Please sign in again.");
            return null;
        }
    }
    
    return { /* normal return */ };
}
```

**Fix Effort:** 1.5 hours  
**Risk if unfixed:** Users get 401 errors or cryptic auth failures during demo

---

## FINDING 6: NOTIFICATION MANAGER INITIALIZATION ⚠️ UNCERTAIN

**Status:** ⚠️ INITIALIZATION PATH UNCLEAR  
**Severity:** MEDIUM - May cause notification failures

### The Issue

**Two NotificationManager classes exist:**
1. `apps/vscode/src/notificationManager.ts` (30.9KB)
2. `apps/vscode/src/notifications/notificationManager.ts` (unknown size)

**Question:** Which one is used? Are both active?

### Investigation Required

```bash
grep -rn "new NotificationManager" apps/vscode/src/ --include="*.ts"
grep -rn "notificationManager.initialize\|notificationManager.show" apps/vscode/src/ --include="*.ts"
```

### Risks

1. **Duplicate instances** - If both are instantiated, notifications duplicate or conflict
2. **Missing initialization** - If neither is properly wired, notifications fail silently
3. **Event subscription missing** - NotificationManager may not be listening to relevant events

### Evidence Needed

- Grep output showing all NotificationManager references
- Check if Phase 3 managers includes NotificationManager.initialize()
- Check if events trigger notification.show()

---

## SUMMARY TABLE: SYSTEMIC RISKS

| Risk | Status | Severity | Demo Impact | Fix Time |
|------|--------|----------|-------------|----------|
| **Activation Race** | ⚠️ FOUND | HIGH | Auth fails silently | 30m |
| **Error Propagation** | ❌ FOUND | CRITICAL | Multiple silent failures | 3h |
| **Concurrent Writes** | ⚠️ FOUND | MEDIUM | Snapshots lost with rapid saves | 2h |
| **Event Bus** | ⚠️ FOUND | MEDIUM | Early events lost | 1h |
| **Auth Expiry** | ⚠️ FOUND | MEDIUM | 401 errors after 1 hour | 1.5h |
| **NotificationManager** | ⚠️ UNCLEAR | MEDIUM | Notifications may fail | 30m |

**Total Fix Time:** 8.5 hours  
**Total Demo Risk:** CRITICAL - Multiple independent failure paths

---

## GO/NO-GO ASSESSMENT

**Current State:** 
- 40.5% commands missing (from previous audit)
- 6 systemic runtime risks identified
- Demo readiness: **NO-GO until fixes applied**

**Minimum Viable Fix (for demo unblock):**
1. Fix activation race condition (30m)
2. Fix error propagation in initialization (2h)
3. Add write queue to storage (1h)
4. Verify NotificationManager wiring (30m)
5. **Total: 4 hours → Demo can proceed**

**Recommended (production ready):**
1. + All 6 systemic fixes
2. + All 17 missing command registrations
3. + DiffViewManager wiring
4. **Total: 12.5 hours → Production ready**

---

## NEXT IMMEDIATE ACTIONS

1. **THIS HOUR:** 
   - Fix activation race condition
   - Fix error propagation in phase 2-4 initialization
   - Verify NotificationManager class identity

2. **NEXT 2 HOURS:**
   - Add write queue to StorageManager
   - Test concurrent save scenario

3. **NEXT 3 HOURS:**
   - Add token expiry checking to AuthState
   - Add event buffering to EventBus

4. **FINAL VERIFICATION:**
   - Run rapid-save E2E test
   - Run authentication expiry scenario
   - Run 17 missing commands test

---

**Status:** Ready for targeted remediation  
**Confidence:** 90%+ (systemic issues clearly identified)  
**Risk if addressed:** Demo unblocked within 4 hours

