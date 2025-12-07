import * as fs from "fs";
import * as path from "path";
import { expect, test } from "vscode-test-playwright";

// Helper: Toggle settings.json to force onDidChangeConfiguration to fire
function toggleTestMode(settingsPath: string, value: boolean) {
	let settings: Record<string, unknown> = {};
	if (fs.existsSync(settingsPath)) {
		settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
	}
	settings["snapback.testMode"] = value;
	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

test.describe("SnapBack Activation Funnel @smoke", () => {
	test.describe.configure({ mode: "serial" });

	// @ts-expect-error
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

	// @ts-expect-error
	test("Step 2: Authentication flow", async ({
		page,
		workbox,
		evaluateInVSCode,
	}: {
		page: any;
		workbox: any;
		evaluateInVSCode: any;
	}) => {
		// Path to test-workspace settings.json
		const settingsPath = path.resolve(__dirname, "../../../apps/vscode/test-workspace/.vscode/settings.json");

		// THE FIX: Toggle settings OFF -> ON to force the reactive listener to fire
		// Even if env var didn't propagate, this guarantees onDidChangeConfiguration is triggered
		console.log("🔄 Toggling test mode OFF...");
		toggleTestMode(settingsPath, false);
		await new Promise((r) => setTimeout(r, 500)); // Brief wait for watcher

		console.log("🔄 Toggling test mode ON...");
		toggleTestMode(settingsPath, true);
		await new Promise((r) => setTimeout(r, 1000)); // Wait for VS Code to detect file change

		// 1. Focus the sidebar
		await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			await vscode.commands.executeCommand("workbench.view.extension.snapback");
		});

		// Wait for the side bar to open
		await expect(page.locator(".part.sidebar")).toBeVisible();

		// 2. Click "Connect SnapBack Account" in the tree view
		const connectItem = page.getByRole("treeitem", { name: /Connect SnapBack Account/i }).first();
		await expect(connectItem).toBeVisible({ timeout: 10000 });

		try {
			await connectItem.click();
		} catch (e) {
			console.log("❌ Failed to find 'Connect SnapBack Account' item.");
			const treeItems = await page.locator(".monaco-list-row").all();
			console.log(`Found ${treeItems.length} tree rows. Content:`);
			for (const item of treeItems) {
				const text = await item.innerText();
				const label = await item.getAttribute("aria-label");
				console.log(` - Text: "${text}", Label: "${label}"`);
			}
			throw e;
		}

		// 3. Wait for auth to complete (MockAuthProvider returns immediately)
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

		// 4. Verify context is updated
		const isAuthed = await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			const sessions = await vscode.authentication.getSession("snapback", [], {});
			return !!sessions;
		});
		expect(isAuthed).toBeTruthy();
	});
});
