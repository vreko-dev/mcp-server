import { expect, test } from 'vscode-test-playwright';
import type * as vscode from 'vscode';

test.describe('SnapBack Activation Funnel', () => {
  test.describe.configure({ mode: 'serial' });

  test('Step 1: Extension activates on startup', async ({ workbox, evaluateInVSCode }) => {
    // Wait for extension to activate
    const isActive = await evaluateInVSCode(async (vscode: typeof import('vscode')) => {
      // Replace with your actual extension ID
      const extension = vscode.extensions.getExtension('MarcelleLabs.snapback-vscode');
      if (!extension) return false;

      await extension.activate();
      return extension.isActive;
    });

    expect(isActive).toBe(true);

    // Check for status bar item
    await expect(workbox.getByLabel(/SnapBack/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Step 2: Authentication flow', async ({ evaluateInVSCode }) => {
    // Check initial state
    const initialState = await evaluateInVSCode(async (vscode) => {
      return await vscode.commands.executeCommand('snapback.getAuthState');
    });

    // Expect not authenticated initially (or handle if already auth'd)
    console.log('Initial Auth State:', initialState);

    if (!(initialState as any)?.authenticated) {
        // Trigger auth
        await evaluateInVSCode(async (vscode) => {
             await vscode.commands.executeCommand('snapback.authenticate');
        });

        // In E2E, we might need to mock the token or use a test command
        // For now, assume a test command exists or we verify it fails (RED)
    }
  });
});
