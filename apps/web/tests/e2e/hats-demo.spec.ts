// tests/e2e/hats-demo.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Protection Hats Demo", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/hats-demo");
	});

	test("should display the file tree", async ({ page }) => {
		// Check that the file tree is visible
		const fileTree = page.locator('[role="tree"]');
		await expect(fileTree).toBeVisible();
	});

	test("should have correct row height styling", async ({ page }) => {
		// Check that file rows have approximately 22px height
		const fileRow = page.locator(".file-row").first();
		await expect(fileRow).toBeVisible();

		const height = await fileRow.evaluate((el) => {
			const style = window.getComputedStyle(el);
			return Number.parseInt(style.height, 10);
		});

		// Allow for some flexibility in the height measurement
		expect(height).toBeGreaterThanOrEqual(20);
		expect(height).toBeLessThanOrEqual(24);
	});

	test("should open context menu on right-click", async ({ page }) => {
		// Right-click on a file
		const fileItem = page.locator(".file-row").first();
		await fileItem.click({ button: "right" });

		// Check that context menu is visible
		const contextMenu = page.locator(".context-menu");
		await expect(contextMenu).toBeVisible();
	});

	test("should assign hats and update activity log", async ({ page }) => {
		// Get initial activity log count
		const _initialLogCount = await page.locator(".activity-log li").count();

		// Right-click on a file and assign a hat
		const fileItem = page.locator(".file-row").first();
		await fileItem.click({ button: "right" });

		// Click on "Watched" option
		const watchedOption = page.locator("text=🧢 Watched");
		await watchedOption.click();

		// Check that activity log is updated
		const activityLog = page.locator("text=Protection:");
		await expect(activityLog).toBeVisible();

		// Check that the hat icon appears on the file
		const hatIcon = page.locator("text=🧢");
		await expect(hatIcon).toBeVisible();
	});

	test("should have visual snapshots", async ({ page }) => {
		// Take a snapshot of the default state
		await expect(page).toHaveScreenshot("hats-demo-default.png", {
			maxDiffPixelRatio: 0.01,
		});

		// Hover over a file row
		const fileRow = page.locator(".file-row").first();
		await fileRow.hover();

		// Take a snapshot of the hover state
		await expect(page).toHaveScreenshot("hats-demo-hover.png", {
			maxDiffPixelRatio: 0.01,
		});

		// Right-click to open context menu
		await fileRow.click({ button: "right" });

		// Take a snapshot of the context menu state
		await expect(page).toHaveScreenshot("hats-demo-context-menu.png", {
			maxDiffPixelRatio: 0.01,
		});
	});
});
