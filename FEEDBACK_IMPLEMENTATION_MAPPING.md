# Feedback.md Recommendations → Implementation Mapping

**Source**: `/scripts/snapback_implementation_pack/feedback.md`
**Purpose**: Map each critique to your codebase and identify what needs to change

---

## Section 1: Token Naming Reconciliation

### Feedback Critique Summary
- ✅ Correct diagnosis: Extension needs API Key, not client token
- ✅ Token hierarchy accurate: OAuth Session → API Key
- ✅ Storage strategy correct: secrets + globalState
- ❌ **Issue 1**: Missing Grant Code Exchange Step
- ❌ **Issue 2**: Key Rotation Not Addressed
- ❌ **Issue 3**: keyPrefix display needs masking

---

## Issue 1: Missing Device Authorization Flow

### What Feedback Says
Current flow shows `OAuth callback → POST /api/auth/extension-grant → API Key` but this conflates two patterns. Better Auth OAuth returns a **session**, not a code for extension grant.

### Current Implementation Status
**File**: `packages/auth/src/` - Need to verify current flow

**Proposed Fix from Feedback**:
```typescript
// RFC 8628 Device Authorization Flow
async startAuth(): Promise<ExtensionCredentials> {
  // 1. POST /api/auth/device-code
  const { deviceCode, userCode, verificationUri, expiresIn, interval } =
    await this.requestDeviceCode();

  // 2. Show user the verification URL
  await vscode.env.openExternal(vscode.Uri.parse(verificationUri));

  // 3. Poll for completion
  return this.pollForToken(deviceCode, interval, expiresIn);
}
```

### Action Items
- [ ] Verify current auth flow in `packages/auth/src/auth.ts`
- [ ] Check if VS Code extension already has OAuthHandler
- [ ] Implement `/api/auth/device-code` endpoint
- [ ] Implement `/api/auth/device-token` endpoint
- [ ] Create `apps/vscode/src/auth/DeviceAuthFlow.ts`
- [ ] Add polling logic with exponential backoff + slow_down handling
- [ ] Test on WSL, Remote SSH, Codespaces

**Effort**: 2-3 days
**Timeline**: Week 2
**Files to Create**:
- `apps/vscode/src/auth/DeviceAuthFlow.ts` (250 lines)
- `apps/api/modules/auth/procedures/device-code.ts` (new endpoint)
- `apps/api/modules/auth/procedures/device-token.ts` (new endpoint)

---

## Issue 2: Key Rotation Not Addressed

### What Feedback Says
Design shows API keys that "never expire" but doesn't address:
- What happens when user rotates key from dashboard?
- How does extension know its key was revoked?
- How to handle "key used from multiple devices"?

### Current Implementation Status
**File**: `packages/platform/src/db/schema/snapback/api-keys.ts`

```typescript
// Current schema has:
revoked_at: TIMESTAMPTZ  // Exists! ✓
request_count: INTEGER   // Exists! ✓
last_used_at: TIMESTAMPTZ // Exists! ✓
```

**But missing**:
- No background validation in extension
- No mechanism to detect revocation
- No multi-device detection

### Action Items

#### A. Implement Key Validator in Extension
**File to Create**: `apps/vscode/src/auth/KeyValidator.ts`

```typescript
export class KeyValidator {
  private lastValidated: number = 0;
  private readonly VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

  async validateIfNeeded(context: vscode.ExtensionContext): Promise<boolean> {
    // Fast path: already checked in this session
    if (Date.now() - this.lastValidated < this.VALIDATION_INTERVAL) {
      return true;
    }

    const apiKey = await context.secrets.get(AUTH_STORAGE_KEYS.API_KEY);
    if (!apiKey) return false;

    try {
      const response = await fetch(`${API_URL}/api/keys/validate`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (response.status === 401) {
        // Key revoked - clear and prompt re-auth
        await this.clearCredentials(context);
        this.promptReAuth('Your API key was revoked. Please sign in again.');
        return false;
      }

      this.lastValidated = Date.now();
      return true;
    } catch (e) {
      // Network error - assume valid, will fail on actual API call
      return true;
    }
  }
}
```

#### B. Implement Validation Endpoint
**File**: `apps/api/modules/auth/procedures/validate-key.ts`

```typescript
// POST /api/keys/validate
// Returns 200 if valid, 401 if revoked
export const validateKey = protectedProcedure.handler(async ({ context }) => {
  const apiKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, context.auth.apiKeyId))
    .limit(1);

  if (!apiKey || apiKey[0].revokedAt !== null) {
    return { status: 401, message: 'API key revoked' };
  }

  // Update last_used_at
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, context.auth.apiKeyId));

  return { status: 200, message: 'Valid' };
});
```

#### C. Integrate Validation Into Snapshot Operations
**File**: `apps/vscode/src/snapshot/SnapshotManager.ts`

```typescript
async createSnapshot(files: FileInfo[]): Promise<Snapshot> {
  // Validate key before creating snapshot
  const isValid = await this.keyValidator.validateIfNeeded(this.context);
  if (!isValid) {
    throw new Error('API key invalid - please re-authenticate');
  }

  // ... rest of snapshot creation
}
```

#### D. Handle Multi-Device Detection
**Enhancement to api-keys schema**:
```sql
-- Add device tracking
ALTER TABLE api_keys ADD COLUMN device_fingerprint TEXT;
ALTER TABLE api_keys ADD COLUMN last_used_device TEXT;
ALTER TABLE api_keys ADD COLUMN devices_used_count INTEGER DEFAULT 1;

-- When key is used from new device, track it
-- If used from >5 devices, flag for review
```

### Action Items Summary
- [ ] Create `apps/vscode/src/auth/KeyValidator.ts`
- [ ] Create `apps/api/modules/auth/procedures/validate-key.ts`
- [ ] Integrate KeyValidator into SnapshotManager
- [ ] Add background validation job (5-min interval)
- [ ] Update API key schema with device tracking
- [ ] Test revocation flow end-to-end

**Effort**: 2 days
**Timeline**: Week 3
**Testing**: Critical - ensure users can't use revoked keys

---

## Issue 3: keyPrefix Display Formatting

### What Feedback Says
Store `keyPrefix: "sk_live_abc"` but display as `sk_live_abc...` (masked) to avoid confusion.

### Current Implementation Status
**Need to verify**: Where are API keys displayed to users?

### Action Items
- [ ] Find API key display in web dashboard
- [ ] Find API key display in VS Code extension settings
- [ ] Update formatting function

```typescript
// apps/web/lib/api-keys.ts
export function formatKeyForDisplay(fullKey: string): string {
  if (fullKey.length <= 11) return fullKey;
  return fullKey.slice(0, 11) + '...';  // "sk_live_abc..."
}

// Usage
const displayKey = formatKeyForDisplay(apiKey.keyPrefix);
// Shows: "sk_live_abc..."
```

**Effort**: 2 hours
**Timeline**: Week 2 (polish phase)

---

---

## Section 2: Telemetry Events Mapping - Critique

### Feedback Critique Summary
- ✅ Correct event taxonomy
- ✅ Activation funnel definition is complete
- ✅ Privacy blocklist is enforced
- ❌ **Issue 1**: Event Naming Inconsistency
- ❌ **Issue 2**: Missing Critical Funnel Events
- ❌ **Issue 3**: Event Mapper Gap (only 2/7 core events mapped)
- ❌ **Issue 4**: Timing Property Missing (no absolute timestamps)

---

## Issue 1: Event Naming Inconsistency

### What Feedback Says
Your events mix `snake_case` and `dot.notation`:

```typescript
// Current (BROKEN):
'welcome_panel_shown'      // ✗ snake_case
'auth_flow_started'        // ✗ snake_case
'auth_login_completed'     // ✓ actually 'auth.login.completed' needed

// Existing (GOOD):
'extension.activated'      // ✓ dot notation
'snapshot.created'         // ✓ dot notation
```

### Current Implementation Status

**File**: `packages/contracts/src/telemetry/events.ts`

```typescript
// Current state (as seen in search results)
TELEMETRY_EVENTS = {
  EXTENSION_ACTIVATED: "extension.activated",      // ✓
  EXTENSION_DEACTIVATED: "extension.deactivated",  // ✓
  COMMAND_EXECUTION: "command.execution",          // ✓
  SNAPSHOT_CREATED: "snapshot.created",            // ✓
  // ... all use dot notation ✓
} as const
```

**Also has**:
- `packages/contracts/src/events/core.ts` - CORE_TELEMETRY_EVENTS
- `packages/contracts/src/events/legacy.ts` - duplicate TELEMETRY_EVENTS
- `packages/contracts/src/telemetry/events.v1.ts` - duplicate CORE_TELEMETRY_EVENTS

### Action Items
- [ ] **Delete** `packages/contracts/src/events/legacy.ts` (duplicate)
- [ ] **Delete** `packages/contracts/src/telemetry/events.v1.ts` (duplicate)
- [ ] **Keep** `packages/contracts/src/events/core.ts` as canonical source
- [ ] **Update** all imports to use `core.ts` only
- [ ] **Standardize** all NEW event names to dot.notation

**Files to Update**:
```typescript
// Change imports from:
import { TELEMETRY_EVENTS } from '@snapback/contracts/src/telemetry/events';

// To:
import { CORE_EVENTS, INFRASTRUCTURE_EVENTS } from '@snapback/contracts/src/events/core';
```

**Effort**: 2 hours
**Timeline**: Week 1
**Risk**: LOW (consolidation)

---

## Issue 2: Missing Critical Funnel Events

### What Feedback Says
Current funnel is missing diagnostic events that explain **why** users drop off:

```typescript
// Missing events:
'welcome.feature_viewed'     // User saw specific feature
'auth.provider_selected'     // Which OAuth provider
'auth.browser_opened'        // Browser actually launched
'auth.callback_received'     // Callback hit the extension
'auth.exchange_started'      // Code exchange began
```

### Current Implementation Status
**File**: `apps/vscode/src/auth/OAuthHandler.ts` (need to verify exists)

Need to check:
- [ ] Does VS Code extension have auth flow implementation?
- [ ] Where are auth events currently being tracked?
- [ ] Are diagnostic events logged at each step?

### Proposed Enhanced Funnel from Feedback

```typescript
export const ACTIVATION_FUNNEL_V2 = {
  name: 'Extension Activation (Detailed)',
  steps: [
    // Acquisition
    { name: 'Installed', event: 'extension.installed' },
    { name: 'Activated', event: 'extension.activated' },

    // Onboarding
    { name: 'Welcome Shown', event: 'welcome.panel.shown' },
    { name: 'Feature Interest', event: 'welcome.feature.viewed', optional: true },

    // Auth (with diagnostics)
    { name: 'Auth Started', event: 'auth.flow.started', optional: true },
    { name: 'Provider Selected', event: 'auth.provider.selected', diagnostic: true },
    { name: 'Browser Opened', event: 'auth.browser.opened', diagnostic: true },
    { name: 'Callback Received', event: 'auth.callback.received', diagnostic: true },
    { name: 'Auth Completed', event: 'auth.flow.completed', optional: true },

    // OR Skip path
    { name: 'Auth Skipped', event: 'auth.flow.skipped', optional: true },

    // Activation (the money moment)
    { name: 'First Protected Save', event: 'save.attempt', filter: { first: true } },
    { name: 'First Snapshot', event: 'snapshot.created' },
  ],
};
```

### Action Items
- [ ] Add missing event constants to `packages/contracts/src/events/core.ts`:
  - `AUTH_PROVIDER_SELECTED`
  - `AUTH_BROWSER_OPENED`
  - `AUTH_CALLBACK_RECEIVED`
  - `AUTH_EXCHANGE_STARTED`
  - `WELCOME_FEATURE_VIEWED`

- [ ] Update VS Code auth handler to emit diagnostic events at each step
- [ ] Update welcome panel to emit `welcome.feature.viewed` when features are shown
- [ ] Update snapshot manager to emit `save.attempt` (currently emits `snapshot.created`)

**File Changes Needed**:
```typescript
// apps/vscode/src/auth/OAuthHandler.ts (new or updated)
async startAuth() {
  telemetry.track('auth.flow.started', {});

  // Let user choose provider
  const provider = await showProviderPicker(); // GitHub or Google
  telemetry.track('auth.provider.selected', { provider });

  // Open browser
  await vscode.env.openExternal(vscode.Uri.parse(verificationUri));
  telemetry.track('auth.browser.opened', { uri: verificationUri });

  // Wait for callback
  const code = await this.waitForCallback();
  telemetry.track('auth.callback.received', { success: !!code });

  // Exchange code
  telemetry.track('auth.exchange.started', {});
  const { apiKey } = await this.exchangeCode(code);
  telemetry.track('auth.flow.completed', { source: 'oauth' });

  return apiKey;
}
```

**Effort**: 2 days
**Timeline**: Week 2
**Value**: High - enables drop-off diagnosis in PostHog

---

## Issue 3: Event Mapper Gap

### What Feedback Says
Your `mapWelcomeEventToCore()` function only maps 2 events. The Core Events system has 7 events designed for simplified analytics. You should map more.

### Current Implementation Status
**Need to find**: Where is the event mapper implemented?

**Likely location**: `apps/vscode/src/telemetry/` or `packages/infrastructure/src/metrics/`

### Proposed Event Mapping from Feedback

```typescript
// Map Infrastructure Events → Core Events
function mapWelcomeEventToCore(event: InfrastructureEvent): CoreEvent | null {
  switch (event.event) {
    // ✅ save_attempt - File save with protection
    case 'file.saved':
      return {
        event: 'save_attempt',
        properties: {
          fileCount: event.properties.fileCount,
          totalBytes: event.properties.totalBytes,
        },
      };

    // ✅ snapshot_created - Checkpoint created
    case 'snapshot.created':
      return {
        event: 'snapshot.created',
        properties: {
          filesChanged: event.properties.fileCount,
          aiDetected: event.properties.aiDetected,
        },
      };

    // ✅ session_finalized - Coding session ended
    case 'welcome.panel.dismissed':
      return {
        event: 'session.finalized',
        properties: {
          sessionId: event.properties.sessionId,
          durationMs: event.properties.durationMs,
          snapshotsCreated: event.properties.snapshotCount,
        },
      };

    // ✅ issue_created - Problem detected
    case 'risk.detected':
      return {
        event: 'issue.created',
        properties: {
          riskLevel: event.properties.riskScore > 70 ? 'high' : 'medium',
          trigger: event.properties.trigger,
        },
      };

    // ✅ issue_resolved - Problem fixed
    case 'snapshot.restored':
      return {
        event: 'issue.resolved',
        properties: {
          filesRestored: event.properties.fileCount,
          fromSnapshot: event.properties.snapshotId,
        },
      };

    // ✅ session_restored - Rollback performed
    case 'snapshot.restored':  // Same event, different context
      return {
        event: 'session.restored',
        properties: {
          snapshotAge: event.properties.ageMs,
          filesRestored: event.properties.fileCount,
        },
      };

    // ✅ policy_changed - Protection settings modified
    case 'auth.flow.completed':
      return {
        event: 'policy.changed',
        properties: {
          pattern: '*',  // User just authenticated
          fromState: 'unprotected',
          toState: 'authenticated',
          source: 'onboarding',
        },
      };

    default:
      return null;
  }
}
```

### Action Items
- [ ] Find existing event mapper (or create if missing)
- [ ] Update to map all 7 core events
- [ ] Add proper property transformation for each event
- [ ] Add timestamp properties (see Issue 4)
- [ ] Test mapper thoroughly

**Effort**: 1 day
**Timeline**: Week 1-2
**File**: Create or update `apps/vscode/src/telemetry/event-mapper.ts`

---

## Issue 4: Timing Property Missing

### What Feedback Says
Events track `durationMs` but not absolute timestamps. This matters for funnel analysis and session correlation.

### Current Implementation Status
**File**: `packages/platform/src/db/schema/snapback/telemetry-events.ts`

```typescript
export const telemetryEvents = pgTable("telemetry_events", {
  // ...
  timestamp: timestamp("timestamp").notNull().defaultNow(),  // ✓ Exists
  createdAt: timestamp("created_at").notNull().defaultNow(), // ✓ Exists
  // But missing in properties JSON
});
```

### Action Items
- [ ] Ensure all events include absolute timestamp in properties:

```typescript
// When tracking events, add:
telemetry.track('snapshot.created', {
  fileCount: 5,
  durationMs: 1500,

  // Add these to EVERY event:
  timestamp_utc: Date.now(),           // Absolute time
  session_start_utc: this.sessionStartTime,  // For correlation
});
```

- [ ] Update event schema in `packages/contracts/` to include timestamp fields
- [ ] Update all tracking calls to include timestamps

**Effort**: 4 hours
**Timeline**: Week 1
**Files**:
- `packages/infrastructure/src/telemetry-client.ts` (if it exists)
- All telemetry.track() call sites (bulk find-replace possible)

---

---

## Section 3: "Skip for Now" Degraded Experience

### Feedback Critique Summary
- ✅ Philosophy is correct (local-first, unauthenticated users get full features)
- ✅ Feature matrix is accurate
- ✅ Nudge system is tasteful (max 1/day, non-blocking)
- ✅ Status bar differentiation is smart
- ❌ **Issue 1**: AnonymousMode Creates God Object
- ❌ **Issue 2**: Race Condition in Nudge Timing
- ❌ **Issue 3**: Missing "Continue Without Account" Explicit Choice
- ❌ **Issue 4**: Tier "anonymous" Creates Type Pollution
- ❌ **Issue 5**: No Local Snapshot Count Persistence

---

## Issue 1: AnonymousMode God Object

### What Feedback Says
Your `AnonymousMode` class handles too much:
- Anonymous ID generation
- Auth state checking
- Feature access
- Nudge showing

This violates Single Responsibility Principle.

### Current Implementation Status
**Need to find**: `apps/vscode/src/auth/AnonymousMode.ts`

### Proposed Refactoring from Feedback

Split into 4 classes:

```typescript
// apps/vscode/src/auth/AuthState.ts
export class AuthState {
  isAuthenticated(): boolean { ... }
  getCredentials(): ExtensionCredentials | null { ... }
  getApiKey(): string | null { ... }
}

// apps/vscode/src/telemetry/AnonymousIdManager.ts
export class AnonymousIdManager {
  getOrCreate(): string { ... }
  migrate(userId: string): void { ... }  // When user signs in
}

// apps/vscode/src/features/FeatureGate.ts
export class FeatureGate {
  canUseFeature(feature: Feature, context: UserContext): boolean { ... }
  listAvailableFeatures(): Feature[] { ... }
}

// apps/vscode/src/nurturing/NudgeManager.ts
export class NudgeManager {
  maybeNudge(trigger: NudgeTrigger): Promise<void> { ... }
  getLastNudgeTime(): number { ... }
}
```

### Action Items
- [ ] Find existing AnonymousMode class
- [ ] Create 4 separate classes (listed above)
- [ ] Distribute responsibilities
- [ ] Update all imports
- [ ] Test each class independently

**Effort**: 1 day
**Timeline**: Week 2
**Benefit**: Easier to test and maintain

---

## Issue 2: Race Condition in Nudge Timing

### What Feedback Says
Race condition where two nudge triggers fire simultaneously both pass the time check and show duplicate nudges.

### Proposed Fix from Feedback

```typescript
export class NudgeManager {
  private nudgingInProgress = false;      // In-memory lock
  private nudgeShownThisSession = false;  // Session-level throttle

  async maybeNudge(trigger: NudgeTrigger): Promise<void> {
    // Fast path: already shown this session
    if (this.nudgeShownThisSession) return;

    // Prevent concurrent nudges
    if (this.nudgingInProgress) return;
    this.nudgingInProgress = true;

    try {
      // Check persistent throttle
      const lastNudge = this.context.globalState.get<number>('snapback.lastAuthNudge') ?? 0;
      if (Date.now() - lastNudge < 24 * 60 * 60 * 1000) return;

      await this.showNudge(trigger);
      this.nudgeShownThisSession = true;
      await this.context.globalState.update('snapback.lastAuthNudge', Date.now());
    } finally {
      this.nudgingInProgress = false;
    }
  }
}
```

### Action Items
- [ ] Find current NudgeManager implementation
- [ ] Add in-memory flag (`nudgingInProgress`)
- [ ] Add session flag (`nudgeShownThisSession`)
- [ ] Wrap in try/finally to always reset flag
- [ ] Test with concurrent triggers

**Effort**: 2 hours
**Timeline**: Week 2
**Testing**: Critical - ensure no duplicate nudges

---

## Issue 3: Missing "Continue Without Account" Explicit Choice

### What Feedback Says
Feedback suggests showing feature tradeoffs when users click "Skip" so they make an informed decision.

### Proposed UX from Feedback

```html
<div class="skip-section">
  <button onclick="handleSkip('user_clicked_skip')">
    Skip for now
  </button>
  <details>
    <summary>What do I get without signing in?</summary>
    <ul>
      <li>✓ Unlimited local snapshots</li>
      <li>✓ All protection levels</li>
      <li>✓ Basic AI detection</li>
      <li>✗ No cloud backup</li>
      <li>✗ No cross-device sync</li>
    </ul>
    <button onclick="handleSkip('informed_skip')">
      Continue without account
    </button>
  </details>
</div>
```

### Track the Difference

```typescript
reason: z.enum([
  'user_clicked_skip',    // Quick skip
  'informed_skip',        // Read tradeoffs, still skipped
  'panel_closed',
  'timeout',
])
```

### Action Items
- [ ] Find welcome panel component (React or HTML)
- [ ] Add `<details>` element with feature tradeoffs
- [ ] Update skip event tracking to distinguish reasons
- [ ] Test analytics data in PostHog

**Effort**: 4 hours
**Timeline**: Week 3
**Value**: Better analytics insight into user intent

---

## Issue 4: Tier "anonymous" Creates Type Pollution

### What Feedback Says
`AnonymousContext` uses `tier: 'anonymous'` but `AuthenticatedContext` uses `tier: 'free' | 'pro' | 'enterprise'`. This creates type confusion.

### Proposed Fix from Feedback

Use discriminated union instead:

```typescript
// Clear separation
type UserContext = AuthenticatedContext | AnonymousContext;

interface AuthenticatedContext {
  isAuthenticated: true;
  userId: string;
  tier: 'free' | 'pro' | 'enterprise';
  // ... rest
}

interface AnonymousContext {
  isAuthenticated: false;
  anonymousId: string;
  // NO tier field - anonymous is not a tier, it's a state
}

// Feature checks use the discriminator:
function canUseFeature(ctx: UserContext, feature: Feature): boolean {
  if (!ctx.isAuthenticated) {
    return ANONYMOUS_FEATURES.includes(feature);
  }
  return TIER_FEATURES[ctx.tier].includes(feature);
}
```

### Action Items
- [ ] Find current UserContext/AnonymousContext types
- [ ] Verify if `tier: 'anonymous'` is being used (likely not - check)
- [ ] If used, refactor to remove `tier` from AnonymousContext
- [ ] Update feature gate to use discriminator pattern
- [ ] Add type tests to verify can't access tier on anonymous

**Effort**: 2 hours
**Timeline**: Week 2 (verification + fix if needed)
**Risk**: LOW - likely already correct

---

## Issue 5: No Local Snapshot Count Persistence

### What Feedback Says
Nudge system checks `localSnapshotCount` for milestone nudges (10, 50, 100 snapshots) but file-based storage doesn't have an atomic counter.

### Current Implementation Status
**File**: `packages/platform/src/db/schema/snapback/snapshots.ts`

The schema exists but need to check:
- [ ] Does VS Code extension have snapshot counter in storage?
- [ ] Is it recalculated on every init (expensive)?
- [ ] Where is milestone checking implemented?

### Proposed Solution from Feedback

Atomic increment instead of full recalculation:

```typescript
// apps/vscode/src/storage/StorageManager.ts
async createSnapshot(...): Promise<SnapshotManifest> {
  const manifest = await this.snapshotStore.create(files, options);

  // Atomic increment (not full recalculation)
  const metadata = await this.getStorageMetadata();
  metadata.stats.snapshotCount += 1;
  await writeJsonFile(this.metadataUri, metadata);

  // Check milestones
  this.checkSnapshotMilestone(metadata.stats.snapshotCount);

  return manifest;
}

private checkSnapshotMilestone(count: number): void {
  if ([10, 50, 100, 500, 1000].includes(count)) {
    this.context.globalState.update('snapback.localSnapshotCount', count);
    // NudgeManager will pick this up on next save
  }
}
```

### Action Items
- [ ] Find VS Code snapshot storage implementation
- [ ] Verify current counter implementation
- [ ] If recalculating: change to atomic increment
- [ ] Add milestone detection
- [ ] Hook into nudge system
- [ ] Test milestone triggers

**Effort**: 4 hours
**Timeline**: Week 3
**Impact**: Improves onboarding engagement

---

---

## Summary: Priority Implementation Order

### 🔴 MUST DO (Blocks Demo)
1. **Event Naming Consistency** (2 hours) - Week 1
2. **Device Auth Flow** (2-3 days) - Week 2
3. **Event Mapper** (1 day) - Week 1-2

### 🟡 SHOULD DO (High Value)
1. **Key Rotation & Validation** (2 days) - Week 3
2. **Nudge Race Condition** (2 hours) - Week 2
3. **Telemetry Event Addition** (2 days) - Week 2
4. **Anonymous Mode Refactoring** (1 day) - Week 2

### 🟢 NICE TO HAVE (Polish)
1. **keyPrefix Display** (2 hours) - Week 2
2. **Continue Without Account UI** (4 hours) - Week 3
3. **Snapshot Counter Atomicity** (4 hours) - Week 3
4. **Type Pollution Fix** (2 hours) - Week 2

### 📚 KNOWLEDGE GAPS (Verify First)
- [ ] Where is current auth flow implementation?
- [ ] Does AnonymousMode class exist?
- [ ] Where is welcome panel component?
- [ ] Where is event mapper (or does it exist)?
- [ ] Is tier: 'anonymous' actually used?

---

## File Checklist

### Need to Create
- [ ] `apps/vscode/src/auth/DeviceAuthFlow.ts`
- [ ] `apps/vscode/src/auth/KeyValidator.ts`
- [ ] `apps/api/modules/auth/procedures/device-code.ts`
- [ ] `apps/api/modules/auth/procedures/device-token.ts`
- [ ] `apps/api/modules/auth/procedures/validate-key.ts`
- [ ] `apps/vscode/src/telemetry/event-mapper.ts` (if missing)
- [ ] `apps/vscode/src/auth/AuthState.ts`
- [ ] `apps/vscode/src/telemetry/AnonymousIdManager.ts`
- [ ] `apps/vscode/src/features/FeatureGate.ts`
- [ ] `apps/vscode/src/nurturing/NudgeManager.ts`

### Need to Update
- [ ] `packages/contracts/src/events/core.ts` (add missing events)
- [ ] `packages/contracts/src/telemetry/events.ts` (consolidate)
- [ ] `apps/vscode/src/auth/` (integrate DeviceAuthFlow, KeyValidator)
- [ ] `packages/platform/src/db/schema/snapback/api-keys.ts` (add device tracking)
- [ ] All event tracking call sites (add timestamps)
- [ ] Welcome panel component (add feature details)

### Need to Delete
- [ ] `packages/contracts/src/events/legacy.ts`
- [ ] `packages/contracts/src/telemetry/events.v1.ts`
- [ ] `packages/auth-mock/` (merge to auth)
- [ ] `packages/analytics-infra/` (merge to analytics)

---

**This mapping is complete. Use alongside CODEBASE_ALIGNMENT_ANALYSIS.md for full context.**
