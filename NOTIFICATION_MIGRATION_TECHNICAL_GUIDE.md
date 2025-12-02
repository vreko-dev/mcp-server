# Notification System Centralization - Technical Migration Guide

This guide provides the detailed technical steps to migrate from scattered VS Code API calls to centralized NotificationManager.

## Table of Contents

1. [Extend NotificationManager](#extend-notificationmanager)
2. [Create Helper Wrappers](#create-helper-wrappers)
3. [Refactoring Patterns](#refactoring-patterns)
4. [File-by-File Migration](#file-by-file-migration)
5. [Testing Strategy](#testing-strategy)
6. [Rollout Plan](#rollout-plan)

---

## Extend NotificationManager

Add these methods to `apps/vscode/src/notificationManager.ts`:

### 1. Acknowledgment/Persistence Methods

```typescript
// Add to NotificationManager class

private acknowledgedNotifications: Set<string> = new Set();

/**
 * Check if a notification has been acknowledged by the user.
 * Reads from globalState to persist across sessions.
 */
async isAcknowledged(
  notificationId: string,
  context: vscode.ExtensionContext
): Promise<boolean> {
  // Check in-memory cache first
  if (this.acknowledgedNotifications.has(notificationId)) {
    return true;
  }

  // Check persisted state
  const acknowledged = await context.globalState.get<string[]>(
    'snapback.acknowledgedNotifications',
    []
  );

  const isAcked = acknowledged.includes(notificationId);
  if (isAcked) {
    this.acknowledgedNotifications.add(notificationId);
  }
  return isAcked;
}

/**
 * Mark a notification as acknowledged by user ("Don't show again").
 * Persists to globalState.
 */
async acknowledgeDontShowAgain(
  notificationId: string,
  context: vscode.ExtensionContext
): Promise<void> {
  this.acknowledgedNotifications.add(notificationId);

  const acknowledged = await context.globalState.get<string[]>(
    'snapback.acknowledgedNotifications',
    []
  );

  if (!acknowledged.includes(notificationId)) {
    acknowledged.push(notificationId);
    await context.globalState.update(
      'snapback.acknowledgedNotifications',
      acknowledged
    );
  }
}

/**
 * Reset acknowledgment for a specific notification.
 */
async resetAcknowledgment(
  notificationId: string,
  context: vscode.ExtensionContext
): Promise<void> {
  this.acknowledgedNotifications.delete(notificationId);

  const acknowledged = await context.globalState.get<string[]>(
    'snapback.acknowledgedNotifications',
    []
  );

  const filtered = acknowledged.filter((id) => id !== notificationId);
  await context.globalState.update(
    'snapback.acknowledgedNotifications',
    filtered
  );
}

/**
 * Reset all acknowledgments (useful for testing/reset).
 */
async resetAllAcknowledgments(
  context: vscode.ExtensionContext
): Promise<void> {
  this.acknowledgedNotifications.clear();
  await context.globalState.update('snapback.acknowledgedNotifications', []);
}
```

### 2. Rate Limiting Methods

```typescript
// Add to NotificationManager class

private lastNotificationTime: Map<string, number> = new Map();
private readonly MIN_INTERVAL_MS = 5000; // 5 seconds between same notifications

/**
 * Check if a notification should be rate-limited.
 * @param rateLimitKey - Unique key for deduplication (e.g., "risk-detected")
 * @returns true if enough time has passed to show this notification
 */
shouldShowNotification(rateLimitKey?: string): boolean {
  if (!rateLimitKey) {
    return true; // No rate limiting
  }

  const lastTime = this.lastNotificationTime.get(rateLimitKey) ?? 0;
  const now = Date.now();
  const timeSinceLastNotification = now - lastTime;

  if (timeSinceLastNotification >= this.MIN_INTERVAL_MS) {
    this.lastNotificationTime.set(rateLimitKey, now);
    return true;
  }

  logger.debug(
    `Notification rate-limited: ${rateLimitKey} (${this.MIN_INTERVAL_MS - timeSinceLastNotification}ms remaining)`
  );
  return false;
}

/**
 * Show a notification with automatic rate limiting.
 * Returns undefined if rate-limited.
 */
async showWithRateLimit(
  notification: SnapBackNotification,
  rateLimitKey?: string
): Promise<void> {
  if (!this.shouldShowNotification(rateLimitKey)) {
    return; // Silent discard if rate-limited
  }

  await this.showNotification(notification);
}

/**
 * Reset rate limiting for a specific key (for testing).
 */
resetRateLimit(rateLimitKey: string): void {
  this.lastNotificationTime.delete(rateLimitKey);
}

/**
 * Reset all rate limits.
 */
resetAllRateLimits(): void {
  this.lastNotificationTime.clear();
}
```

### 3. Helper Methods for Common Patterns

```typescript
// Add to NotificationManager class

/**
 * Show notification with "Don't show again" option.
 * Automatically handles persistence.
 */
async showWithDontShowAgain(
  notification: SnapBackNotification,
  notificationId: string,
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  // Check if already acknowledged
  if (await this.isAcknowledged(notificationId, context)) {
    logger.debug(`Suppressed acknowledged notification: ${notificationId}`);
    return undefined;
  }

  // Add "Don't show again" action
  const actions = notification.actions ?? [];
  actions.push({
    title: "Don't show again",
    command: `snapback.acknowledgeDontShowAgain:${notificationId}`
  });

  const modifiedNotification: SnapBackNotification = {
    ...notification,
    actions
  };

  return await this.showNotification(modifiedNotification);
}

/**
 * Show a modal confirmation dialog with proper result handling.
 */
async showModal(config: {
  type: 'info' | 'warning' | 'error';
  message: string;
  detail?: string;
  actions: Array<{ title: string; command?: string }>;
}): Promise<{ title: string; command?: string } | undefined> {
  const actionTitles = config.actions.map((a) => a.title);

  let selectedTitle: string | undefined;

  switch (config.type) {
    case 'info':
      selectedTitle = await vscode.window.showInformationMessage(
        config.message,
        { detail: config.detail, modal: true },
        ...actionTitles
      );
      break;
    case 'warning':
      selectedTitle = await vscode.window.showWarningMessage(
        config.message,
        { detail: config.detail, modal: true },
        ...actionTitles
      );
      break;
    case 'error':
      selectedTitle = await vscode.window.showErrorMessage(
        config.message,
        { detail: config.detail, modal: true },
        ...actionTitles
      );
      break;
  }

  if (!selectedTitle) {
    return undefined; // User dismissed
  }

  return config.actions.find((a) => a.title === selectedTitle);
}

/**
 * Show notification without waiting (fire-and-forget).
 * Errors are logged but don't propagate.
 */
showAndForget(notification: SnapBackNotification): void {
  // Don't await - fire and forget
  this.showNotification(notification).catch((error) => {
    logger.error('Failed to show notification (fire-and-forget)', error as Error);
    // Continue silently
  });
}
```

### 4. Telemetry Integration

```typescript
// Add to NotificationManager class

/**
 * Track notification interaction for analytics.
 */
async trackNotification(
  notificationId: string,
  outcome: 'shown' | 'dismissed' | 'action_taken',
  actionTitle?: string
): Promise<void> {
  // This will integrate with your telemetry system
  logger.info('Notification event', {
    notificationId,
    outcome,
    actionTitle,
    timestamp: Date.now()
  });

  // TODO: Send to telemetry backend
  // await telemetryProxy.trackEvent('notification', {
  //   notificationId,
  //   outcome,
  //   actionTitle
  // });
}
```

---

## Create Helper Wrappers

Create a new file: `apps/vscode/src/ui/notificationHelpers.ts`

```typescript
import * as vscode from "vscode";
import { NotificationManager } from "../notificationManager.js";
import type { SnapBackNotification } from "../notificationManager.js";

/**
 * Central location for creating notifications with consistent patterns.
 */
export class NotificationHelpers {
  constructor(
    private notificationManager: NotificationManager,
    private context: vscode.ExtensionContext
  ) {}

  /**
   * Create a protection level notification.
   * Usage: await helpers.protectionLevel('Watch', 'File monitoring active');
   */
  async protectionLevel(
    level: 'Watch' | 'Warn' | 'Block',
    message: string,
    actions?: string[]
  ): Promise<string | undefined> {
    const typeMap = { Watch: 'info', Warn: 'warning', Block: 'error' } as const;
    const iconMap = { Watch: '👁️', Warn: '⚠️', Block: '🛑' } as const;

    return await this.notificationManager.show({
      id: `protection-${level}-${Date.now()}`,
      type: typeMap[level],
      message,
      icon: iconMap[level],
      timestamp: Date.now(),
      actions: actions?.map((title) => ({ title, command: '' }))
    });
  }

  /**
   * Create an error notification that doesn't block.
   */
  async error(message: string, detail?: string): Promise<void> {
    this.notificationManager.showAndForget({
      id: `error-${Date.now()}`,
      type: 'error',
      message,
      detail,
      timestamp: Date.now()
    });
  }

  /**
   * Create a rate-limited notification.
   */
  async riskDetected(
    riskLevel: string,
    fileName: string,
    rateLimitKey: string
  ): Promise<void> {
    await this.notificationManager.showWithRateLimit(
      {
        id: `risk-${riskLevel}-${Date.now()}`,
        type: 'warning',
        message: `Risk detected in ${fileName} (${riskLevel})`,
        timestamp: Date.now(),
        actions: [
          { title: 'Analyze', command: 'snapback.analyzeRisk' },
          { title: 'Protect', command: 'snapback.protectFile' }
        ]
      },
      rateLimitKey // Use consistent key across all risk notifications
    );
  }

  /**
   * Create a dismissable notification.
   */
  async dismissable(
    message: string,
    notificationId: string,
    type: 'info' | 'warning' = 'info'
  ): Promise<void> {
    await this.notificationManager.showWithDontShowAgain(
      {
        id: notificationId,
        type,
        message,
        timestamp: Date.now()
      },
      notificationId,
      this.context
    );
  }

  /**
   * Create a status bar message (auto-dismiss after 3s).
   */
  statusBar(message: string, durationMs: number = 3000): void {
    vscode.window.setStatusBarMessage(message, durationMs);
  }

  /**
   * Show a confirmation modal.
   */
  async confirm(
    message: string,
    detail?: string
  ): Promise<boolean> {
    const result = await this.notificationManager.showModal({
      type: 'warning',
      message,
      detail,
      actions: [
        { title: 'Continue', command: 'continue' },
        { title: 'Cancel' }
      ]
    });

    return result?.command === 'continue';
  }
}
```

---

## Refactoring Patterns

### Pattern 1: Simple Info Message

**BEFORE:**
```typescript
vscode.window.showInformationMessage("Snapshot created successfully");
```

**AFTER:**
```typescript
await notificationManager.show({
  id: `snapshot-${snapshotId}-${Date.now()}`,
  type: 'info',
  message: `Snapshot ${snapshotId} created successfully`,
  timestamp: Date.now(),
  actions: [{ title: 'View', command: 'snapback.viewSnapshot' }]
});
```

### Pattern 2: Error with Fallback

**BEFORE:**
```typescript
try {
  await operation();
} catch (error) {
  vscode.window.showErrorMessage(`Operation failed: ${error.message}`);
  throw error; // Still throw
}
```

**AFTER:**
```typescript
try {
  await operation();
} catch (error) {
  notificationManager.showAndForget({
    id: `error-${Date.now()}`,
    type: 'error',
    message: `Operation failed`,
    detail: error instanceof Error ? error.message : String(error),
    timestamp: Date.now()
  });
  // Don't re-throw for non-critical errors
}
```

### Pattern 3: Rate-Limited Notification

**BEFORE:**
```typescript
function onFileChange(file: string) {
  vscode.window.showWarningMessage(`File changed: ${file}`);
  // Called on EVERY file change → spam
}
```

**AFTER:**
```typescript
function onFileChange(file: string) {
  notificationManager.showWithRateLimit(
    {
      id: `file-change-${Date.now()}`,
      type: 'info',
      message: `${file} and other files changed`,
      timestamp: Date.now()
    },
    'file-change' // Rate limit key - same for all file changes
  );
  // Max 1 notification per 5 seconds
}
```

### Pattern 4: "Don't Show Again" Option

**BEFORE:**
```typescript
const result = await vscode.window.showInformationMessage(
  "Pro tip: You can use Cmd+Shift+P to open command palette",
  "Got it"
);
// User dismisses, sees it again next time
```

**AFTER:**
```typescript
await notificationManager.showWithDontShowAgain(
  {
    id: 'pro-tip-command-palette',
    type: 'info',
    message: "Pro tip: You can use Cmd+Shift+P to open command palette",
    timestamp: Date.now()
  },
  'pro-tip-command-palette',
  context
);
// User selects "Don't show again" → never shows again (persisted to globalState)
```

### Pattern 5: Modal Confirmation

**BEFORE:**
```typescript
const choice = await vscode.window.showWarningMessage(
  "Delete snapshot?",
  { modal: true },
  "Delete",
  "Cancel"
);

if (choice === "Delete") {
  await deleteSnapshot();
} else if (choice === "Cancel") {
  logger.info("Delete cancelled");
}
// Issue: What if user clicks X? Result is undefined, code may crash
```

**AFTER:**
```typescript
const result = await notificationManager.showModal({
  type: 'warning',
  message: "Delete snapshot?",
  actions: [
    { title: 'Delete', command: 'delete' },
    { title: 'Cancel' }
  ]
});

if (result?.command === 'delete') {
  await deleteSnapshot();
} else {
  logger.info("Delete cancelled");
}
// Safe: handles X button (returns undefined), checks command explicitly
```

### Pattern 6: Progress Indicator

**BEFORE:**
```typescript
return vscode.window.withProgress(
  { location: vscode.ProgressLocation.Notification },
  async (progress) => {
    progress.report({ message: "Creating snapshot..." });
    const snapshot = await createSnapshot();
    progress.report({ message: "Encrypting..." });
    await encrypt(snapshot);
    return snapshot;
  }
);
```

**AFTER:**
```typescript
// Can keep as-is, but consider wrapping:
return vscode.window.withProgress(
  { location: vscode.ProgressLocation.Notification },
  async (progress) => {
    // Same implementation
    // (Consider creating notificationManager.showProgress() wrapper if heavily used)
  }
);
```

---

## File-by-File Migration

### HIGH PRIORITY - Day 1-2

#### File: `src/extension.ts`

**Lines 121, 156-165** - CRITICAL: Blocking notifications during activation

```typescript
// ❌ BEFORE (Lines 121-123)
if (!workspaceFolderResolver.hasWorkspace()) {
  const errorMsg = "SnapBack requires an open workspace folder";
  vscode.window.showErrorMessage(errorMsg);
  throw new Error(errorMsg);
}

// ✅ AFTER
if (!workspaceFolderResolver.hasWorkspace()) {
  const errorMsg = "SnapBack requires an open workspace folder";
  // Still throw, but don't show blocking UI during activation
  throw new Error(errorMsg);
  // Note: VS Code will show error in problems panel
}

// ❌ BEFORE (Lines 156-165)
if (!isWorkspaceTrusted) {
  logger.warn("Workspace is not trusted...");
  vscode.window
    .showWarningMessage(
      "SnapBack is running in limited mode because...",
      "Trust Workspace"
    )
    .then((selection) => {
      if (selection === "Trust Workspace") {
        vscode.commands.executeCommand("workbench.action.manageTrust");
      }
    });
  // Continue activation but features will be limited
}

// ✅ AFTER (Use async AFTER activation completes)
// In extension.ts, after context is passed to phase initialization:
if (!isWorkspaceTrusted) {
  logger.warn("Workspace is not trusted...");
  // Show async notification AFTER extension activates
  void notificationManager.showWithDontShowAgain(
    {
      id: 'workspace-untrusted-warning',
      type: 'warning',
      message: "SnapBack is running in limited mode...",
      actions: [{ title: 'Trust Workspace', command: 'workbench.action.manageTrust' }],
      timestamp: Date.now()
    },
    'workspace-untrusted-warning',
    context
  );
  // Don't await - continues immediately
}
```

#### File: `src/ui/ProgressiveDisclosureController.ts`

**8 vscode.window calls** - Progressive onboarding dialogs

```typescript
// ❌ BEFORE
const action = await vscode.window.showInformationMessage(
  "Welcome to SnapBack...",
  "Next",
  "Skip"
);

if (action === "Next") {
  // Show next step
}

// ✅ AFTER
const result = await notificationManager.showModal({
  type: 'info',
  message: "Welcome to SnapBack...",
  actions: [
    { title: 'Next', command: 'next' },
    { title: 'Skip', command: 'skip' }
  ]
});

if (result?.command === 'next') {
  // Show next step
} else {
  // User skipped or dismissed
}
```

### MEDIUM PRIORITY - Day 3-5

#### File: `src/ui/SnapshotRestoreUI.ts`

**6 notification calls** - Snapshot restore feedback

Migrate each to NotificationManager equivalents following pattern 1 above.

#### File: `src/operationCoordinator.ts`

**15 notification calls** - Add rate limiting to risk notifications

```typescript
// ❌ BEFORE (Shows on every risk detection)
if (riskDetected) {
  vscode.window.showWarningMessage(`Risk in ${file}`);
}

// ✅ AFTER (Rate limited to 1 per 5 seconds)
if (riskDetected) {
  await notificationManager.showWithRateLimit(
    {
      id: `risk-${Date.now()}`,
      type: 'warning',
      message: `Risk detected`,
      timestamp: Date.now()
    },
    'risk-detected' // Consistent rate limit key
  );
}
```

### LOWER PRIORITY - Day 6-8

- `commands/` directory (40+ scattered calls)
- `handlers/` directory (20+ calls)
- `services/` directory (30+ calls)
- Test files (use for validation)

---

## Testing Strategy

### Unit Tests for New NotificationManager Methods

Create `test/unit/notificationManager.extended.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationManager } from '../../src/notificationManager';

describe('NotificationManager - Acknowledgment & Rate Limiting', () => {
  let notificationManager: NotificationManager;
  let mockContext: any;

  beforeEach(() => {
    notificationManager = new NotificationManager();
    mockContext = {
      globalState: {
        get: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined)
      }
    };
  });

  describe('Acknowledgment Persistence', () => {
    it('should mark notification as acknowledged', async () => {
      await notificationManager.acknowledgeDontShowAgain('test-1', mockContext);

      const isAcked = await notificationManager.isAcknowledged('test-1', mockContext);
      expect(isAcked).toBe(true);
    });

    it('should persist acknowledged notifications to globalState', async () => {
      await notificationManager.acknowledgeDontShowAgain('test-1', mockContext);

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'snapback.acknowledgedNotifications',
        expect.arrayContaining(['test-1'])
      );
    });

    it('should restore acknowledgments from globalState on next check', async () => {
      mockContext.globalState.get.mockResolvedValue(['test-1']);

      const isAcked = await notificationManager.isAcknowledged('test-1', mockContext);
      expect(isAcked).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow first notification immediately', () => {
      const shouldShow = notificationManager.shouldShowNotification('test-key');
      expect(shouldShow).toBe(true);
    });

    it('should block second notification within 5 seconds', () => {
      notificationManager.shouldShowNotification('test-key');

      const shouldShow = notificationManager.shouldShowNotification('test-key');
      expect(shouldShow).toBe(false);
    });

    it('should allow different rate limit key', () => {
      notificationManager.shouldShowNotification('key-1');

      const shouldShow = notificationManager.shouldShowNotification('key-2');
      expect(shouldShow).toBe(true); // Different key
    });

    it('should reset rate limit for testing', () => {
      notificationManager.shouldShowNotification('test-key');
      notificationManager.resetRateLimit('test-key');

      const shouldShow = notificationManager.shouldShowNotification('test-key');
      expect(shouldShow).toBe(true); // Allowed after reset
    });
  });

  // Add more tests for other methods...
});
```

### Integration Tests for Refactored Components

Update `test/integration/` with tests that verify:
- Protected file notifications are rate-limited
- Snapshot creation shows notification
- Onboarding dialogs can be dismissed and don't re-appear
- Error notifications don't block operations

---

## Rollout Plan

### Week 1: Setup & High Priority
- Day 1: Extend NotificationManager, create NotificationHelpers
- Day 2: Refactor extension.ts (blocking notifications)
- Day 3: Refactor ProgressiveDisclosureController
- Day 4-5: Test and validate Phase 1

### Week 2: Medium Priority
- Day 6-7: Refactor SnapshotRestoreUI, operationCoordinator
- Day 8-9: Refactor remaining ui/ files
- Day 10: Comprehensive testing

### Week 3: Low Priority & Deployment
- Day 11-12: Refactor commands/ and services/
- Day 13-14: Final testing and staged rollout

### Success Metrics
- ✅ >95% of notifications use NotificationManager
- ✅ Rate limiting reduces duplicate notifications by 80%
- ✅ Test coverage increases from 40% → 80%+
- ✅ Users report no change in extension behavior (transparent refactoring)
- ✅ Zero blocking notifications during activation

---

## Common Mistakes to Avoid

1. **Forgetting to await showNotification()**
   - ❌ `notificationManager.showNotification(...);`
   - ✅ `await notificationManager.showNotification(...);`

2. **Not providing rate limit key for repetitive notifications**
   - ❌ `await notificationManager.show(notif);` (fires on every trigger)
   - ✅ `await notificationManager.showWithRateLimit(notif, 'risk-detected');`

3. **Ignoring modal result**
   - ❌ `await vscode.window.showWarningMessage(...);`
   - ✅ `const result = await notificationManager.showModal(...); if (result?.command === 'yes') { ... }`

4. **Mixing patterns**
   - ❌ Using NotificationManager in some files, direct vscode calls in others
   - ✅ Consistent use of NotificationManager across all files

5. **Not testing acknowledgment behavior**
   - ❌ Test shows notification once, assume it's dismissed
   - ✅ Test that acknowledged notifications don't re-appear (check globalState)

---

## References

- Extended NotificationManager: `apps/vscode/src/notificationManager.ts`
- Helper functions: `apps/vscode/src/ui/notificationHelpers.ts` (create this file)
- Test template: `test/unit/notificationManager.extended.test.ts`
- VS Code API docs: https://code.visualstudio.com/api/references/vscode-api#window

