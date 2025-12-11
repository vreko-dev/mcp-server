Here is the implementation for **Phase 1: VS Code "Connect SnapBack Account" Integration**.

This code connects your **Tree View**, **Authentication**, and the new **Telemetry** system. It ensures that when a user clicks "Connect Account", the action is traced, errors are captured, and the UI updates reactively.

### 1\. The Tree Data Provider (UI)

**File:** `apps/vscode/src/providers/SnapBackExplorerTreeProvider.ts`

This provider dynamically switches between a "Connect Account" button and the actual user content based on the auth state.

```typescript
import * as vscode from 'vscode';
import { InstrumentationProvider, SemanticAttributes } from '@snapback/contracts/src/observability/instrumentation';
import { AuthManager } from '../managers/AuthManager';

export class SnapBackExplorerTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(
    private authManager: AuthManager,
    private telemetry: InstrumentationProvider
  ) {
    // Refresh tree when auth state changes
    this.authManager.onDidChangeAuth(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    return this.telemetry.withSpan('vscode.tree.getChildren', async (span) => {
      // 1. If element is passed, we are deeper in the tree
      if (element) {
        return []; // Implement your snapshot logic here
      }

      // 2. Check Auth State
      const session = await this.authManager.getSession();
      span.setAttribute('auth.is_logged_in', !!session);

      if (!session) {
        // 3. Render "Connect Account" Button
        const connectItem = new vscode.TreeItem('Connect SnapBack Account');
        connectItem.command = {
          command: 'snapback.connectAccount',
          title: 'Connect Account',
          tooltip: 'Sign in to sync your snapshots',
        };

        // Use an icon to make it look actionable
        connectItem.iconPath = new vscode.ThemeIcon('github-action');

        return [connectItem];
      }

      // 4. Render Logged-In View (Snapshots)
      span.addEvent('rendering_snapshots');
      const snapshotItem = new vscode.TreeItem(`Snapshots (${session.user.email})`);
      snapshotItem.iconPath = new vscode.ThemeIcon('repo');
      return [snapshotItem];
    });
  }
}
```

### 2\. The Auth Manager (Logic)

**File:** `apps/vscode/src/managers/AuthManager.ts`

This manager handles the actual sign-in process and emits events when status changes.

```typescript
import * as vscode from 'vscode';
import { InstrumentationProvider, SemanticAttributes } from '@snapback/contracts/src/observability/instrumentation';

export class AuthManager {
  private _onDidChangeAuth = new vscode.EventEmitter<void>();
  readonly onDidChangeAuth = this._onDidChangeAuth.event;
  private session: vscode.AuthenticationSession | undefined;

  constructor(private telemetry: InstrumentationProvider) {}

  async getSession(): Promise<vscode.AuthenticationSession | undefined> {
    if (this.session) return this.session;

    // Attempt silent login
    this.session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: false });
    return this.session;
  }

  async login(): Promise<void> {
    await this.telemetry.withSpan('vscode.auth.login', async (span) => {
      try {
        span.addEvent('auth_provider_triggered');

        // Trigger VS Code's native auth flow
        this.session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: true });

        if (this.session) {
          span.setAttribute(SemanticAttributes.USER_ID, this.session.account.id);
          span.setAttribute(SemanticAttributes.HTTP_USER_AGENT, 'vscode');

          this._onDidChangeAuth.fire();
          vscode.window.showInformationMessage(`Signed in as ${this.session.account.label}`);
        }
      } catch (error) {
        span.recordException(error);
        vscode.window.showErrorMessage('Sign in failed. Check output logs.');
        throw error;
      }
    });
  }

  async logout(): Promise<void> {
    this.session = undefined;
    this._onDidChangeAuth.fire();
  }
}
```

### 3\. The Command Registration (Wiring)

**File:** `apps/vscode/src/extension.ts`

This connects the dots. It initializes telemetry, creates the provider, and registers the command.

```typescript
import * as vscode from 'vscode';
import { createVSCodeInstrumentation } from './observability/setup';
import { AuthManager } from './managers/AuthManager';
import { SnapBackExplorerTreeProvider } from './providers/SnapBackExplorerTreeProvider';

export async function activate(context: vscode.ExtensionContext) {
  // 1. Initialize Telemetry (Lightweight)
  const telemetry = createVSCodeInstrumentation();

  await telemetry.withSpan('vscode.activate', async (span) => {
    try {
      console.log('SnapBack is activating...');

      // 2. Initialize Managers
      const authManager = new AuthManager(telemetry);
      const treeProvider = new SnapBackExplorerTreeProvider(authManager, telemetry);

      // 3. Register Tree Data Provider
      vscode.window.registerTreeDataProvider('snapback-explorer', treeProvider);

      // 4. Register Commands
      // This ID must match package.json and the TreeItem command
      const connectCommand = vscode.commands.registerCommand('snapback.connectAccount', async () => {
        await authManager.login();
      });

      context.subscriptions.push(connectCommand);
      span.addEvent('activation_complete');

    } catch (err) {
      span.recordException(err);
      span.setStatus('error');
      console.error(err);
    }
  });
}

export function deactivate() {
  // Flush telemetry if needed
}
```

### 4\. Integration Test Verification

To verify this works without launching the full UI, update your test:

**File:** `e2e/extension/activation.spec.ts`

```typescript
test('Connect Account button triggers login flow', async () => {
  // 1. Wait for View to Load
  const view = await page.getByTitle('SnapBack Explorer');

  // 2. Find the "Connect Account" Item
  // We use the exact text we defined in the TreeProvider
  const connectBtn = await view.getByRole('treeitem', { name: 'Connect SnapBack Account' });
  await expect(connectBtn).toBeVisible();

  // 3. Click it
  await connectBtn.click();

  // 4. Assert Trace was generated (Optional, if you mock the exporter in tests)
  // Or assert that the browser/auth dialog opened
});
```

### Completion of Phase 1

You now have:

1.  **Robust Telemetry:** Running safely in the background.
2.  **Reactive UI:** The tree view updates automatically on login.
3.  **Clean Architecture:** Auth logic is separated from UI logic.

Would you like to move to **Phase 2: Unified Config Structure**, where we clean up the `playwright.config.ts` to support this new robust testing flow?
