Prompt 1: Demo-Critical Notification Fixes (4-6 Hours)Objective
Fix the three user-reported notification issues before YC demo:

Repeated .snapbackrc popup on every launch
Extension doesn't start until popup is dismissed
Block protection dialog not fully atomic
Time Budget: 4-6 hours total
Success Criteria: Extension activates in <500ms, popups don't repeat after acknowledgmentPre-Flight ValidationBefore making changes, confirm the issues exist:bash# 1. Find blocking notifications in extension.ts
echo "=== Blocking Notifications (should find 2-3) ==="
grep -n "await.*show.*Message\|await.*showWarningMessage\|await.*showInformationMessage" \
  apps/vscode/src/extension.ts

# 2. Find where protection notifications are shown
echo "=== Protection Level Notifications ==="
grep -rn "protected.*level\|protection.*level\|\.snapbackrc" \
  apps/vscode/src/ --include="*.ts" | grep -i "show.*Message\|notification"

# 3. Check current acknowledgment patterns
echo "=== Existing Acknowledgment Patterns ==="
grep -rn "globalState.*get\|globalState.*update" apps/vscode/src/ --include="*.ts" | \
  grep -i "ack\|shown\|dismiss\|dont.*show"

# 4. Find NotificationManager location
echo "=== NotificationManager Location ==="
find apps/vscode/src -name "*[Nn]otification*" -type f

# 5. Check if SmartDismissalManager exists
echo "=== SmartDismissalManager ==="
grep -rn "SmartDismissalManager\|class.*Dismissal" apps/vscode/src/ --include="*.ts" -lRecord the output — you'll need these file locations for the fixes.Fix 1: Remove Blocking Notifications from Activation (2 hours)1.1 Locate the Blocking CallsBased on evaluation, these are in extension.ts:121, 156-165. Find them:bash# Show context around blocking calls
grep -n "await.*show.*Message" apps/vscode/src/extension.ts -B 3 -A 51.2 Understand the Current Patterntypescript// CURRENT (blocking) - extension.ts
export async function activate(context: vscode.ExtensionContext) {
  // Phase 1: Services...

  // ❌ THIS BLOCKS - user must click before extension continues
  if (!isWorkspaceTrusted()) {
    await vscode.window.showWarningMessage(
      "SnapBack requires a trusted workspace for full functionality.",
      "Trust Workspace",
      "Continue Limited"
    );
  }

  // ❌ THIS ALSO BLOCKS
  if (hasActivationError) {
    await vscode.window.showErrorMessage(
      "SnapBack encountered an error during activation."
    );
  }

  // ... rest of activation waits for above
}1.3 Implement the Fixtypescript// FIXED (non-blocking) - extension.ts

export async function activate(context: vscode.ExtensionContext) {
  const activationStart = Date.now();

  // Phase 1: Services (unchanged)
  // Phase 2: Storage (unchanged)
  // Phase 3: Managers (unchanged)

  // ✅ NON-BLOCKING: Show warnings AFTER activation completes
  // Use setImmediate to defer to next event loop tick
  setImmediate(() => {
    showDeferredActivationWarnings(context).catch(err => {
      console.error('[SnapBack] Deferred warning error:', err);
    });
  });

  // ✅ Activation completes immediately
  const activationTime = Date.now() - activationStart;
  console.log(`✅ SnapBack activated in ${activationTime}ms`);

  if (activationTime > 500) {
    console.warn(`⚠️ Activation exceeded 500ms budget`);
  }
}

/**
 * Show warnings that shouldn't block activation.
 * These are fire-and-forget — errors are logged, not thrown.
 */
async function showDeferredActivationWarnings(
  context: vscode.ExtensionContext
): Promise<void> {
  // Workspace trust warning (non-blocking)
  if (!vscode.workspace.isTrusted) {
    // Don't await — let user respond whenever
    showWorkspaceTrustWarning(context).catch(console.error);
  }

  // Any activation errors that occurred
  const activationErrors = getActivationErrors();
  if (activationErrors.length > 0) {
    // Show in status bar instead of modal
    const statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    statusBar.text = "$(warning) SnapBack: Check output for warnings";
    statusBar.command = 'snapback.showOutput';
    statusBar.show();

    // Auto-hide after 10 seconds
    setTimeout(() => statusBar.dispose(), 10000);
  }
}

/**
 * Workspace trust warning — non-blocking, with acknowledgment.
 */
async function showWorkspaceTrustWarning(
  context: vscode.ExtensionContext
): Promise<void> {
  const ACK_KEY = 'workspace-trust-warning-acknowledged';

  // Check if already acknowledged
  if (context.globalState.get<boolean>(ACK_KEY)) {
    return;
  }

  const result = await vscode.window.showWarningMessage(
    "SnapBack works best in a trusted workspace.",
    "Trust Workspace",
    "Continue Anyway",
    "Don't Show Again"
  );

  if (result === "Trust Workspace") {
    await vscode.commands.executeCommand('workbench.action.manageTrust');
  } else if (result === "Don't Show Again") {
    await context.globalState.update(ACK_KEY, true);
  }
  // "Continue Anyway" or dismiss — do nothing, will show again next time
}1.4 Add Test for Non-Blocking Activationtypescript// apps/vscode/test/unit/activation/non-blocking.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock vscode before imports
vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    createStatusBarItem: vi.fn(() => ({
      show: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  workspace: {
    isTrusted: false,
  },
  StatusBarAlignment: { Left: 1 },
  ExtensionContext: {},
}));

import * as vscode from 'vscode';
import { activate } from '../../../src/extension';

describe('Extension Activation - Non-Blocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete activation before showing warnings', async () => {
    const mockContext = createMockExtensionContext();

    const activationStart = Date.now();
    await activate(mockContext);
    const activationTime = Date.now() - activationStart;

    // Activation should complete in <500ms
    expect(activationTime).toBeLessThan(500);

    // Warning should NOT have been awaited during activation
    // (it's deferred to setImmediate)
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();

    // Wait for deferred warnings
    await new Promise(resolve => setImmediate(resolve));

    // Now warning should be shown
    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
  });

  it('should not block even if user never responds to warning', async () => {
    const mockContext = createMockExtensionContext();

    // Simulate user never clicking the warning (never resolves)
    vi.mocked(vscode.window.showWarningMessage).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    // Activation should still complete
    await expect(activate(mockContext)).resolves.not.toThrow();
  });

  it('should respect "Don\'t Show Again" for workspace trust', async () => {
    const mockContext = createMockExtensionContext();
    mockContext.globalState.get = vi.fn().mockReturnValue(true); // Already acknowledged

    await activate(mockContext);
    await new Promise(resolve => setImmediate(resolve));

    // Warning should NOT be shown
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
  });
});

function createMockExtensionContext() {
  return {
    globalState: {
      get: vi.fn().mockReturnValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    },
    subscriptions: [],
    extensionPath: '/mock/path',
    globalStorageUri: { fsPath: '/mock/storage' },
  };
}Fix 2: Add Acknowledgment Persistence for Protection Notifications (2-3 hours)2.1 Create Notification Acknowledgment Helpertypescript// apps/vscode/src/notifications/acknowledgment.ts

import * as vscode from 'vscode';

/**
 * Manages notification acknowledgment state.
 * Persists "Don't show again" preferences to globalState.
 */
export class NotificationAcknowledgment {
  private static readonly PREFIX = 'notification-ack:';

  constructor(private readonly globalState: vscode.Memento) {}

  /**
   * Check if a notification has been acknowledged.
   * @param notificationId Unique identifier for the notification type
   * @param scope Optional scope (e.g., file path) for file-specific acknowledgments
   */
  isAcknowledged(notificationId: string, scope?: string): boolean {
    const key = this.getKey(notificationId, scope);
    return this.globalState.get<boolean>(key, false);
  }

  /**
   * Mark a notification as acknowledged (don't show again).
   */
  async acknowledge(notificationId: string, scope?: string): Promise<void> {
    const key = this.getKey(notificationId, scope);
    await this.globalState.update(key, true);
  }

  /**
   * Reset acknowledgment (will show again).
   */
  async reset(notificationId: string, scope?: string): Promise<void> {
    const key = this.getKey(notificationId, scope);
    await this.globalState.update(key, undefined);
  }

  /**
   * Reset all acknowledgments (for debugging/settings).
   */
  async resetAll(): Promise<void> {
    // Note: globalState doesn't have a clear() method, so we track keys
    const keys = this.globalState.get<string[]>('notification-ack-keys', []);
    for (const key of keys) {
      await this.globalState.update(key, undefined);
    }
    await this.globalState.update('notification-ack-keys', []);
  }

  private getKey(notificationId: string, scope?: string): string {
    const key = scope
      ? `${NotificationAcknowledgment.PREFIX}${notificationId}:${scope}`
      : `${NotificationAcknowledgment.PREFIX}${notificationId}`;

    // Track keys for resetAll()
    this.trackKey(key);
    return key;
  }

  private async trackKey(key: string): Promise<void> {
    const keys = this.globalState.get<string[]>('notification-ack-keys', []);
    if (!keys.includes(key)) {
      await this.globalState.update('notification-ack-keys', [...keys, key]);
    }
  }
}2.2 Create Protection Level Notification Helpertypescript// apps/vscode/src/notifications/protectionNotifications.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { NotificationAcknowledgment } from './acknowledgment';

export type ProtectionLevel = 'watch' | 'warn' | 'block';

export class ProtectionNotifications {
  private readonly ack: NotificationAcknowledgment;

  constructor(globalState: vscode.Memento) {
    this.ack = new NotificationAcknowledgment(globalState);
  }

  /**
   * Show notification when a file's protection level is set or detected.
   * Respects "Don't show again" preferences.
   *
   * @param filePath The file that is protected
   * @param level The protection level (watch, warn, block)
   * @param isNewProtection Whether this is newly applied (vs. existing)
   */
  async showProtectionLevelNotification(
    filePath: string,
    level: ProtectionLevel,
    isNewProtection: boolean = false
  ): Promise<void> {
    const notificationId = 'protection-level';
    const scope = `${filePath}:${level}`;

    // Check if already acknowledged for this file+level combo
    if (!isNewProtection && this.ack.isAcknowledged(notificationId, scope)) {
      return; // User said "Don't show again" for this file at this level
    }

    const fileName = path.basename(filePath);
    const levelEmoji = this.getLevelEmoji(level);
    const message = isNewProtection
      ? `${levelEmoji} "${fileName}" is now protected at ${level.toUpperCase()} level`
      : `${levelEmoji} "${fileName}" is protected at ${level.toUpperCase()} level`;

    const buttons = isNewProtection
      ? ['Got it']  // New protection: just acknowledge
      : ['Got it', "Don't show again"];  // Existing: allow permanent dismiss

    // Fire and forget — don't block caller
    this.showNotificationAsync(message, buttons, notificationId, scope);
  }

  /**
   * Show notification when protection level changes.
   * Always shows (no acknowledgment check) because it's a state change.
   */
  async showProtectionLevelChanged(
    filePath: string,
    oldLevel: ProtectionLevel,
    newLevel: ProtectionLevel
  ): Promise<void> {
    const fileName = path.basename(filePath);
    const newEmoji = this.getLevelEmoji(newLevel);

    const message = `${newEmoji} "${fileName}" protection changed: ${oldLevel.toUpperCase()} → ${newLevel.toUpperCase()}`;

    // Always show level changes, but don't block
    vscode.window.showInformationMessage(message, 'Got it').then(() => {
      // Reset acknowledgment since level changed
      const scope = `${filePath}:${newLevel}`;
      this.ack.reset('protection-level', scope);
    });
  }

  private async showNotificationAsync(
    message: string,
    buttons: string[],
    notificationId: string,
    scope: string
  ): Promise<void> {
    try {
      const result = await vscode.window.showInformationMessage(message, ...buttons);

      if (result === "Don't show again") {
        await this.ack.acknowledge(notificationId, scope);
      }
    } catch (error) {
      // Don't let notification errors crash anything
      console.error('[SnapBack] Notification error:', error);
    }
  }

  private getLevelEmoji(level: ProtectionLevel): string {
    switch (level) {
      case 'watch': return '👁️';
      case 'warn': return '⚠️';
      case 'block': return '🛑';
      default: return '🛡️';
    }
  }
}2.3 Integrate with Existing CodeFind where protection notifications are currently shown and replace:bash# Find current protection notification calls
grep -rn "protected\|protection" apps/vscode/src/ --include="*.ts" | \
  grep -i "showInformation\|showWarning\|notification"typescript// BEFORE (scattered, no persistence)
// In some file like ProtectionLevelHandler.ts or extension.ts
vscode.window.showInformationMessage(
  `"${fileName}" is protected at ${level} level`
);

// AFTER (centralized, with persistence)
// At initialization
const protectionNotifications = new ProtectionNotifications(context.globalState);

// When showing notification
await protectionNotifications.showProtectionLevelNotification(
  filePath,
  level as ProtectionLevel,
  false // Not a new protection
);2.4 Add Command to Reset Acknowledgmentstypescript// In extension.ts or commands registration

context.subscriptions.push(
  vscode.commands.registerCommand('snapback.resetNotificationAcknowledgments', async () => {
    const ack = new NotificationAcknowledgment(context.globalState);
    await ack.resetAll();
    vscode.window.showInformationMessage(
      'SnapBack notification preferences have been reset.'
    );
  })
);Add to package.json:
json{
  "contributes": {
    "commands": [
      {
        "command": "snapback.resetNotificationAcknowledgments",
        "title": "SnapBack: Reset Notification Preferences"
      }
    ]
  }
}2.5 Add Tests for Acknowledgmenttypescript// apps/vscode/test/unit/notifications/acknowledgment.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationAcknowledgment } from '../../../src/notifications/acknowledgment';

describe('NotificationAcknowledgment', () => {
  let mockGlobalState: any;
  let ack: NotificationAcknowledgment;

  beforeEach(() => {
    const storage = new Map<string, any>();
    mockGlobalState = {
      get: vi.fn((key, defaultValue) => storage.get(key) ?? defaultValue),
      update: vi.fn((key, value) => {
        if (value === undefined) {
          storage.delete(key);
        } else {
          storage.set(key, value);
        }
        return Promise.resolve();
      }),
    };
    ack = new NotificationAcknowledgment(mockGlobalState);
  });

  it('should return false for unacknowledged notification', () => {
    expect(ack.isAcknowledged('test-notification')).toBe(false);
  });

  it('should return true after acknowledgment', async () => {
    await ack.acknowledge('test-notification');
    expect(ack.isAcknowledged('test-notification')).toBe(true);
  });

  it('should support scoped acknowledgments', async () => {
    await ack.acknowledge('protection-level', '/path/file.ts:warn');

    // Same notification, same scope = acknowledged
    expect(ack.isAcknowledged('protection-level', '/path/file.ts:warn')).toBe(true);

    // Same notification, different scope = not acknowledged
    expect(ack.isAcknowledged('protection-level', '/path/file.ts:block')).toBe(false);
    expect(ack.isAcknowledged('protection-level', '/path/other.ts:warn')).toBe(false);
  });

  it('should reset specific acknowledgment', async () => {
    await ack.acknowledge('test-notification');
    expect(ack.isAcknowledged('test-notification')).toBe(true);

    await ack.reset('test-notification');
    expect(ack.isAcknowledged('test-notification')).toBe(false);
  });

  it('should persist across instances', async () => {
    await ack.acknowledge('test-notification');

    // Create new instance with same globalState
    const ack2 = new NotificationAcknowledgment(mockGlobalState);
    expect(ack2.isAcknowledged('test-notification')).toBe(true);
  });
});typescript// apps/vscode/test/unit/notifications/protectionNotifications.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn().mockResolvedValue('Got it'),
  },
}));

import * as vscode from 'vscode';
import { ProtectionNotifications } from '../../../src/notifications/protectionNotifications';

describe('ProtectionNotifications', () => {
  let mockGlobalState: any;
  let notifications: ProtectionNotifications;

  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, any>();
    mockGlobalState = {
      get: vi.fn((key, defaultValue) => storage.get(key) ?? defaultValue),
      update: vi.fn((key, value) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
    };
    notifications = new ProtectionNotifications(mockGlobalState);
  });

  it('should show notification for new protection', async () => {
    await notifications.showProtectionLevelNotification(
      '/path/to/.snapbackrc',
      'warn',
      true // new protection
    );

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('.snapbackrc'),
      'Got it'
    );
  });

  it('should not show notification if already acknowledged', async () => {
    // First call - acknowledge with "Don't show again"
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce(
      "Don't show again" as any
    );
    await notifications.showProtectionLevelNotification('/path/file.ts', 'warn', false);

    // Reset mock
    vi.clearAllMocks();

    // Second call - should not show
    await notifications.showProtectionLevelNotification('/path/file.ts', 'warn', false);
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('should always show notification for new protection regardless of acknowledgment', async () => {
    // Acknowledge existing
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce(
      "Don't show again" as any
    );
    await notifications.showProtectionLevelNotification('/path/file.ts', 'warn', false);

    vi.clearAllMocks();

    // New protection should still show
    await notifications.showProtectionLevelNotification('/path/file.ts', 'warn', true);
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
});Fix 3: Enable Basic Rate Limiting (1 hour)3.1 Check if SmartDismissalManager Existsbash# Find existing rate limiting infrastructure
grep -rn "SmartDismissalManager\|RateLimit\|Dedup" apps/vscode/src/ --include="*.ts" -l3.2 Create Simple Rate Limiter (if none exists)typescript// apps/vscode/src/notifications/rateLimiter.ts

/**
 * Simple rate limiter for notifications.
 * Prevents the same notification from firing multiple times rapidly.
 */
export class NotificationRateLimiter {
  private readonly recentNotifications = new Map<string, number>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly minIntervalMs: number = 5000, // 5 seconds default
    private readonly maxEntries: number = 100
  ) {
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a notification should be shown based on rate limiting.
   * @param notificationKey Unique key for the notification (e.g., "protection:file.ts:warn")
   * @returns true if notification should be shown, false if rate-limited
   */
  shouldShow(notificationKey: string): boolean {
    const now = Date.now();
    const lastShown = this.recentNotifications.get(notificationKey);

    if (lastShown && (now - lastShown) < this.minIntervalMs) {
      return false; // Too soon, rate-limited
    }

    return true;
  }

  /**
   * Mark a notification as shown (call after showing).
   */
  markShown(notificationKey: string): void {
    // Enforce max entries to prevent memory leak
    if (this.recentNotifications.size >= this.maxEntries) {
      this.cleanup();
    }

    this.recentNotifications.set(notificationKey, Date.now());
  }

  /**
   * Convenience method: check and mark in one call.
   * @returns true if notification was shown, false if rate-limited
   */
  tryShow(notificationKey: string): boolean {
    if (this.shouldShow(notificationKey)) {
      this.markShown(notificationKey);
      return true;
    }
    return false;
  }

  /**
   * Reset rate limiting for a specific notification.
   */
  reset(notificationKey: string): void {
    this.recentNotifications.delete(notificationKey);
  }

  /**
   * Clear all rate limiting state.
   */
  resetAll(): void {
    this.recentNotifications.clear();
  }

  /**
   * Dispose of the rate limiter (stop cleanup interval).
   */
  dispose(): void {
    clearInterval(this.cleanupInterval);
    this.recentNotifications.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const expireTime = this.minIntervalMs * 2; // Keep for 2x the interval

    for (const [key, timestamp] of this.recentNotifications) {
      if (now - timestamp > expireTime) {
        this.recentNotifications.delete(key);
      }
    }
  }
}

// Singleton instance for easy access
let rateLimiterInstance: NotificationRateLimiter | null = null;

export function getNotificationRateLimiter(): NotificationRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new NotificationRateLimiter();
  }
  return rateLimiterInstance;
}

export function disposeNotificationRateLimiter(): void {
  rateLimiterInstance?.dispose();
  rateLimiterInstance = null;
}3.3 Wire Into Notificationstypescript// Update ProtectionNotifications to use rate limiter

import { getNotificationRateLimiter } from './rateLimiter';

export class ProtectionNotifications {
  // ... existing code ...

  async showProtectionLevelNotification(
    filePath: string,
    level: ProtectionLevel,
    isNewProtection: boolean = false
  ): Promise<void> {
    const notificationId = 'protection-level';
    const scope = `${filePath}:${level}`;

    // Check acknowledgment
    if (!isNewProtection && this.ack.isAcknowledged(notificationId, scope)) {
      return;
    }

    // Check rate limiting
    const rateLimiter = getNotificationRateLimiter();
    const rateLimitKey = `protection:${scope}`;
    if (!rateLimiter.tryShow(rateLimitKey)) {
      return; // Rate limited, skip
    }

    // ... rest of notification logic ...
  }
}3.4 Add Cleanup on Deactivationtypescript// In extension.ts

import { disposeNotificationRateLimiter } from './notifications/rateLimiter';

export function deactivate() {
  disposeNotificationRateLimiter();
  // ... other cleanup ...
}Validation ChecklistAfter implementing all three fixes, verify:Fix 1: Non-Blocking Activation
bash# Run activation timing test
cd apps/vscode
pnpm test -- --grep "Non-Blocking"

# Manual test: Extension should activate immediately
# 1. Close VS Code
# 2. Open VS Code with SnapBack installed
# 3. Check Output > SnapBack - should see activation time <500ms
# 4. Workspace warning appears AFTER extension is readyFix 2: Acknowledgment Persistence
bash# Run acknowledgment tests
pnpm test -- --grep "Acknowledgment\|Protection"

# Manual test:
# 1. Open a workspace with .snapbackrc
# 2. See protection notification, click "Don't show again"
# 3. Close and reopen VS Code
# 4. Notification should NOT appear again
# 5. Run command: "SnapBack: Reset Notification Preferences"
# 6. Close and reopen VS Code
# 7. Notification should appear againFix 3: Rate Limiting
bash# Run rate limiter tests
pnpm test -- --grep "RateLimit"

# Manual test:
# 1. Open a workspace with multiple protected files
# 2. Trigger save on all files rapidly
# 3. Should see max 1 notification per 5 seconds per file
# 4. Should NOT see notification spamFiles Created/Modified SummaryNew Files
apps/vscode/src/notifications/
├── acknowledgment.ts         # Acknowledgment persistence helper
├── protectionNotifications.ts # Protection-specific notifications
└── rateLimiter.ts            # Rate limiting for notifications

apps/vscode/test/unit/notifications/
├── acknowledgment.test.ts
├── protectionNotifications.test.ts
└── rateLimiter.test.ts

apps/vscode/test/unit/activation/
└── non-blocking.test.tsModified Files
apps/vscode/src/extension.ts
├── Remove await from blocking notifications
├── Add showDeferredActivationWarnings()
└── Add showWorkspaceTrustWarning()

apps/vscode/package.json
└── Add "snapback.resetNotificationAcknowledgments" commandSuccess MetricsAfter these fixes, you should see:MetricBeforeAfterExtension activation time28+ seconds<500msRepeated popups on launchEvery timeOnly if not acknowledgedNotification spam during multi-file ops10+ rapid notificationsMax 1 per 5 secondsUser control over notificationsNone"Don't show again" + reset command
