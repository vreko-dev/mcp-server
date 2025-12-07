import { expect, test } from "vscode-test-playwright";

test.describe("SnapBack Activation Funnel @smoke", () => {
	test.describe.configure({ mode: "serial" });

	test("Step 1: Extension activates on startup", async ({ workbox, evaluateInVSCode }) => {
		// Wait for extension to activate
		const isActive = await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			// Replace with your actual extension ID
			const extension = vscode.extensions.getExtension("MarcelleLabs.snapback-vscode");
			if (!extension) return false;

			await extension.activate();
			return extension.isActive;
		});

		expect(isActive).toBe(true);

		// Check for status bar item
		await expect(workbox.getByLabel(/SnapBack/i).first()).toBeVisible({ timeout: 10000 });
	});

	test("Step 2: Authentication flow", async ({ page, workbox, evaluateInVSCode }) => {
		// 0. Focus the SnapBack view container explicitly
		// This is more robust than clicking the icon which might be hidden or moved
		await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			// Ensure the context is set
			await vscode.commands.executeCommand("setContext", "snapback.isActive", true);
			// Focus the view container (ID: snapback)
			await vscode.commands.executeCommand("workbench.view.extension.snapback");
		});

		// Wait for the side bar to open
		await expect(page.locator(".part.sidebar")).toBeVisible();

		// 1. Click "Connect SnapBack Account" in the tree view
		// Use getByRole for better accessibility and to avoid strict mode violations (matching inner labels)
		const connectItem = page.getByRole("treeitem", { name: /Connect SnapBack Account/i }).first();

		// Wait for the item with a slightly longer timeout and explicit state check
		await expect(connectItem).toBeVisible({ timeout: 10000 });

		try {
			// Ensure the side bar is visible first
			await expect(page.locator(".part.sidebar")).toBeVisible();

			await connectItem.click();
		} catch (e) {
			console.log("❌ Failed to find 'Connect SnapBack Account' item.");
			console.log("📸 Taking failure screenshot...");

			// Dump available tree items for debugging
			const treeItems = await page.locator(".monaco-list-row").all();
			console.log(`Found ${treeItems.length} tree rows. Content:`);
			for (const item of treeItems) {
				const text = await item.innerText();
				const label = await item.getAttribute("aria-label");
				console.log(` - Text: "${text}", Label: "${label}"`);
			}
			throw e;
		}

		// 2. Wait for auth to complete (MockAuthProvider returns immediately)
		// The tree view should refresh and show "Workspace Safety"
		const safetySection = page.getByRole("treeitem", { name: /Workspace Safety/i }).first();
		try {
			await expect(safetySection).toBeVisible({ timeout: 10000 });
		} catch (e) {
			console.log("❌ Failed to find 'Workspace Safety' tree item.");
			const items = await page.getByRole("treeitem").all();
			console.log(`Found ${items.length} tree rows. Content:`);
			for (const item of items) {
				const label = await item.getAttribute("aria-label");
				const text = await item.textContent();
				console.log(` - Text: "${text}", Label: "${label}"`);
			}
			throw e;
		}

		// 3. Verify context is updated
		const isAuthed = await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			// We can verify the session count too
			const sessions = await vscode.authentication.getSession("snapback", [], {});
			return !!sessions;
		});
		expect(isAuthed).toBeTruthy();
	});
});
