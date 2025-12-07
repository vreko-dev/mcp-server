import { expect, test } from "vscode-test-playwright";

/**
 * SnapBack Extension Activation & Auth E2E Test
 *
 * Uses the snapback.__setTestMode command hook to explicitly control
 * the auth provider mode, bypassing config listeners and ensuring
 * synchronous control during tests.
 */
test.describe("SnapBack Activation Funnel @smoke", () => {
	test.describe.configure({ mode: "serial" });

	// @ts-expect-error
	test("Step 1: Extension activates on startup", async ({ workbox, evaluateInVSCode }) => {
		const isActive = await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			const extension = vscode.extensions.getExtension("MarcelleLabs.snapback-vscode");
			if (!extension) {
				return false;
			}
			await extension.activate();
			return extension.isActive;
		});

		expect(isActive).toBe(true);
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
		// 1. FORCE TEST MODE via explicit command hook
		// This bypasses all config listeners and provides synchronous control
		console.log("🧪 Forcing test mode via snapback.__setTestMode command...");
		const hookResult = await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			try {
				const result = await vscode.commands.executeCommand("snapback.__setTestMode", true);
				return { success: true, result };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		});

		console.log("📋 Hook result:", JSON.stringify(hookResult));
		expect(hookResult.success).toBe(true);

		// 2. Focus the SnapBack sidebar
		await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			await vscode.commands.executeCommand("setContext", "snapback.isActive", true);
			await vscode.commands.executeCommand("workbench.view.extension.snapback");
		});

		await expect(page.locator(".part.sidebar")).toBeVisible();
		await new Promise((r) => setTimeout(r, 500));

		// 3. Focus the dashboard view
		await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			await vscode.commands.executeCommand("snapback.dashboard.focus");
		});
		await new Promise((r) => setTimeout(r, 500));

		// 4. Execute the connect command (now uses MockAuthProvider!)
		console.log("🔐 Executing snapback.connect command...");
		const commandResult = await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			try {
				await vscode.commands.executeCommand("snapback.connect");
				const session = await vscode.authentication.getSession("snapback", [], { createIfNone: false });
				return {
					success: true,
					hasSession: !!session,
					sessionLabel: session?.account.label ?? null,
				};
			} catch (error) {
				return { success: false, error: String(error) };
			}
		});

		console.log("📋 Command result:", JSON.stringify(commandResult));

		if (!commandResult.success) {
			throw new Error(`Connect command failed: ${commandResult.error}`);
		}

		// 5. Wait for tree to update
		await new Promise((r) => setTimeout(r, 2000));

		// 6. Verify Workspace Safety is visible
		const safetySection = page.getByRole("treeitem", { name: /Workspace Safety/i }).first();
		try {
			await expect(safetySection).toBeVisible({ timeout: 10000 });
			console.log("✅ 'Workspace Safety' is visible!");
		} catch (e) {
			console.log("❓ Tree state after auth:");
			const items = await page.getByRole("treeitem").all();
			console.log(`Found ${items.length} tree items:`);
			for (const item of items) {
				const label = await item.getAttribute("aria-label");
				const text = await item.textContent();
				console.log(` - Text: "${text}", Label: "${label}"`);
			}
			throw e;
		}

		expect(commandResult.hasSession).toBeTruthy();
		console.log("✅ Authentication verified:", commandResult.sessionLabel);

		// 7. Cleanup: Reset test mode
		await evaluateInVSCode(async (vscode: typeof import("vscode")) => {
			await vscode.commands.executeCommand("snapback.__setTestMode", false);
		});
	});
});
