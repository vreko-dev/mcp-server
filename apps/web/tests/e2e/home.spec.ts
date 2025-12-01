import { expect, test } from "@playwright/test";
import { config } from "@snapback/config";

test.describe("home page", () => {
	if (config.ui.marketing.enabled) {
		test("should show marketing page when enabled", async ({ page }) => {
			await page.goto("/");

			await expect(
				page.getByRole("heading", { name: "SnapBack" }),
			).toBeVisible();
		});
	} else {
		test("should redirect to login when marketing disabled", async ({
			page,
		}) => {
			await page.goto("/");

			await expect(page).toHaveURL(/\.*\/auth\/login/);
		});
	}
});
