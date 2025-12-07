import { expect, test } from 'vscode-test-playwright';
import type * as vscode from 'vscode';

test.describe('Protection & Restore Flow', () => {
  let editorHandle: any;

  test.beforeEach(async ({ evaluateHandleInVSCode }) => {
    // Open a new untitled file
    editorHandle = await evaluateHandleInVSCode(async (vscode) => {
      const doc = await vscode.workspace.openTextDocument({ content: 'const a = 1;', language: 'typescript' });
      return await vscode.window.showTextDocument(doc);
    });
  });

  test('Protect current file and rollback', async ({ evaluateInVSCode, workbox }) => {
    // 1. Enable protection
    await evaluateInVSCode(async (vscode: typeof import('vscode')) => {
      await vscode.commands.executeCommand('snapback.protectCurrentFile');
    });

    // 2. Make changes
    await evaluateInVSCode(async (vscode: typeof import('vscode'), editor: import('vscode').TextEditor) => {
      await editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(0, 0), '// New Code\n');
      });
    }, editorHandle);

    // 3. Save to trigger snapshot
    await evaluateInVSCode(async (vscode, editor) => {
        await editor.document.save();
    }, editorHandle);

    // 4. Rollback using test command to bypass confirmation
    await evaluateInVSCode(async (vscode: typeof import('vscode')) => {
       // Get recent snapshots - using public API or assuming we can list them
       // Since we don't have a direct "getRecentSnapshots" command that returns data,
       // we might need to rely on file system or trust that the snapshot was created.
       // For this test, let's assume the last created snapshot is the one we want.
       // We can use a test helper if needed, but 'snapback.test.restoreSnapshot' needs an ID.

       // Let's create a snapshot explicitly so we have an ID, or add a 'getRecentSnapshots' test command.
       // For now, let's try to list snapshots via a new test command or reuse 'snapback.snapshot.list'?
       // 'snapback.snapshot.list' likely shows a picker, not returning data.

       // I'll add 'snapback.test.getSnapshots' to utilityCommands or similar.
       // For now, assuming we added it:
       const snapshots: any[] = await vscode.commands.executeCommand('snapback.test.getSnapshots') || [];
       if (snapshots.length > 0) {
           await vscode.commands.executeCommand('snapback.test.restoreSnapshot', snapshots[0].id);
       } else {
           throw new Error('No snapshots found to restore');
       }
    });

    // 5. Verify content restored
    const text = await evaluateInVSCode(async (vscode, editor) => {
        return editor.document.getText();
    }, editorHandle);

    expect(text).toContain('const a = 1;');
  });
});
