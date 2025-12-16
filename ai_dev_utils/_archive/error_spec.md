# P0 Blocker Fixes - Code Examples

## 1. SaveHandler Error Boundary (45 min)

**File:** `apps/vscode/src/handlers/SaveHandler.ts`

```typescript
// Around line 217 - CURRENT (unguarded):
await this.analysisCoordinator.analyzeAndPublish(
  filePath,
  filename,
  preSaveContent,
  document
);

// REPLACE WITH:
try {
  await this.analysisCoordinator.analyzeAndPublish(
    filePath,
    filename,
    preSaveContent,
    document
  );
} catch (error) {
  logger.error("Analysis failed, applying safe default protection", {
    filePath: path.basename(filePath), // No full path in logs
    error: error instanceof Error ? error.message : String(error),
  });

  // Track failure
  this.telemetryProxy?.trackEvent("error.analysis_failed", {
    errorType: error instanceof Error ? error.constructor.name : "unknown",
    timestamp: Date.now(),
  });

  // Apply conservative protection (WARN level)
  const safeDecision: ProtectionDecision = {
    action: "warn",
    createSnapshot: true,
    showNotification: true,
    reason: "Analysis unavailable - applying conservative protection",
  };

  await this.protectionLevelHandler.applyDecision(
    safeDecision,
    filePath,
    document
  );

  // Show user-friendly message
  vscode.window.showWarningMessage(
    `Code analysis unavailable. Applied safe protection to ${path.basename(filePath)}.`,
    "OK"
  );
}
```

---

## 2. auth.completed Telemetry (30 min)

**File:** `apps/vscode/src/auth/UnifiedAuthProvider.ts`

Find the authentication success handler (likely in `createSession` or similar):

```typescript
// CURRENT: Successful auth with no telemetry
private async createSession(token: string, provider: string): Promise<void> {
  this.authState.setToken(token);
  this.authState.setAuthenticated(true);
  // ... other setup
}

// ADD TELEMETRY:
private async createSession(token: string, provider: string): Promise<void> {
  this.authState.setToken(token);
  this.authState.setAuthenticated(true);

  // Track successful authentication
  if (this.telemetryProxy) {
    this.telemetryProxy.trackEvent("auth.completed", {
      provider, // "github" | "google" | "mock"
      timestamp: Date.now(),
    });
  }

  logger.info("Authentication completed", { provider });
  // ... rest of setup
}
```

**Alternative location** if auth happens in `AuthState.setAuthenticated()`:

```typescript
// File: apps/vscode/src/auth/AuthState.ts
public setAuthenticated(value: boolean, provider?: string): void {
  this._isAuthenticated = value;
  this._onDidChangeAuthentication.fire(value);

  // NEW: Track on first authentication
  if (value && !this._previouslyAuthenticated) {
    this._previouslyAuthenticated = true;

    const telemetryProxy = /* get from context */;
    telemetryProxy?.trackEvent("auth.completed", {
      provider: provider || "unknown",
      timestamp: Date.now(),
    });
  }
}
```

---

## 3. First Snapshot Detection (30 min)

**File:** `apps/vscode/src/handlers/SaveHandler.ts`

After successful snapshot creation:

```typescript
// Find where snapshot creation succeeds (likely around line 240+)
// CURRENT:
await this.snapshotManager.create(filePath, document);

// REPLACE WITH:
const snapshotResult = await this.snapshotManager.create(filePath, document);

if (snapshotResult.success) {
  // Check if this is user's first snapshot
  const totalSnapshots = await this.snapshotRegistry.getCount();
  const isFirstSnapshot = totalSnapshots === 1;

  if (isFirstSnapshot) {
    // Track first snapshot milestone
    this.telemetryProxy?.trackEvent("first_snapshot.created", {
      method: "auto_protection",
      fileCount: 1,
      filePath: path.basename(filePath),
      timestamp: Date.now(),
    });

    logger.info("First snapshot created - user milestone reached");
  } else {
    // Track regular snapshot
    this.telemetryProxy?.trackEvent("snapshot.created", {
      method: "auto_protection",
      fileCount: 1,
      timestamp: Date.now(),
    });
  }
}
```

**If `snapshotRegistry.getCount()` doesn't exist**, add it:

```typescript
// File: apps/vscode/src/snapshot/SnapshotRegistry.ts (or similar)
public async getCount(): Promise<number> {
  // If using storage manager:
  const snapshots = await this.storageManager.listSnapshots({ limit: 1000 });
  return snapshots.length;

  // OR if using database:
  const result = await this.db.query("SELECT COUNT(*) as count FROM snapshots");
  return result.rows[0].count;
}
```

---

## Validation Script

Create `scripts/validate-p0-fixes.ts`:

```typescript
import * as vscode from "vscode";

/**
 * Validates P0 fixes are working
 * Run after implementing fixes
 */
export async function validateP0Fixes(): Promise<void> {
  console.log("🔍 Validating P0 fixes...\n");

  const checks = {
    errorBoundary: false,
    authTelemetry: false,
    snapshotTelemetry: false,
  };

  // 1. Check SaveHandler has error boundary
  try {
    const saveHandlerPath = vscode.Uri.file(
      "./apps/vscode/src/handlers/SaveHandler.ts"
    );
    const content = await vscode.workspace.fs.readFile(saveHandlerPath);
    const code = Buffer.from(content).toString("utf-8");

    checks.errorBoundary =
      code.includes("try {") &&
      code.includes("analyzeAndPublish") &&
      code.includes("error.analysis_failed");

    console.log(
      checks.errorBoundary ? "✅" : "❌",
      "SaveHandler error boundary"
    );
  } catch (error) {
    console.log("❌ Could not validate SaveHandler");
  }

  // 2. Check auth telemetry exists
  try {
    const authProviderPath = vscode.Uri.file(
      "./apps/vscode/src/auth/UnifiedAuthProvider.ts"
    );
    const content = await vscode.workspace.fs.readFile(authProviderPath);
    const code = Buffer.from(content).toString("utf-8");

    checks.authTelemetry =
      code.includes("auth.completed") &&
      code.includes("trackEvent");

    console.log(
      checks.authTelemetry ? "✅" : "❌",
      "auth.completed telemetry"
    );
  } catch (error) {
    console.log("❌ Could not validate auth telemetry");
  }

  // 3. Check first snapshot telemetry
  try {
    const saveHandlerPath = vscode.Uri.file(
      "./apps/vscode/src/handlers/SaveHandler.ts"
    );
    const content = await vscode.workspace.fs.readFile(saveHandlerPath);
    const code = Buffer.from(content).toString("utf-8");

    checks.snapshotTelemetry =
      code.includes("first_snapshot.created") &&
      code.includes("getCount");

    console.log(
      checks.snapshotTelemetry ? "✅" : "❌",
      "First snapshot telemetry"
    );
  } catch (error) {
    console.log("❌ Could not validate snapshot telemetry");
  }

  // Summary
  const passed = Object.values(checks).filter(Boolean).length;
  console.log(`\n📊 P0 Fixes: ${passed}/3 validated`);

  if (passed === 3) {
    console.log("✅ All P0 blockers fixed - ready for demo!");
  } else {
    console.log("⚠️ Some P0 fixes missing - implement remaining fixes");
  }
}
```

---

## Quick Test Commands

```bash
# After implementing fixes

# 1. Type check
pnpm --filter @snapback/vscode typecheck

# 2. Build
pnpm --filter @snapback/vscode build

# 3. Unit tests (if you have SaveHandler tests)
pnpm --filter @snapback/vscode test SaveHandler

# 4. Manual integration test
code --extensionDevelopmentPath=./apps/vscode ./test-workspace
```

---

## PostHog Verification

After deploying fixes, check events appear in PostHog:

```javascript
// PostHog console (https://app.posthog.com)
// Run these queries to verify:

// 1. Auth events
SELECT * FROM events
WHERE event = 'auth.completed'
ORDER BY timestamp DESC
LIMIT 10;

// 2. First snapshots
SELECT * FROM events
WHERE event = 'first_snapshot.created'
ORDER BY timestamp DESC
LIMIT 10;

// 3. Error tracking
SELECT * FROM events
WHERE event = 'error.analysis_failed'
ORDER BY timestamp DESC
LIMIT 10;
```
