import { expect, test } from "@playwright/test";

test.describe("Mobile Menu", () => {
	test.beforeEach(async ({ page }) => {
		// Set viewport to mobile size
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/");
	});

	test("should toggle mobile menu visibility", async ({ page }) => {
		// Mobile menu button should be visible
		const menuButton = page.locator("#mobile-menu-button");
		await expect(menuButton).toBeVisible();

		// Mobile menu should be hidden initially
		const mobileMenu = page.locator("#mobile-menu");
		await expect(mobileMenu).not.toBeVisible();

		// Click menu button to open
		await menuButton.click();

		// Mobile menu should be visible after clicking
		await expect(mobileMenu).toBeVisible();

		// Menu button should now show close icon
		const closeIcon = page.locator(
			"#mobile-menu-button svg:has(path[d='M18 6 6 18'])",
		);
		await expect(closeIcon).toBeVisible();

		// Click menu button again to close
		await menuButton.click();

		// Mobile menu should be hidden again
		await expect(mobileMenu).not.toBeVisible();
	});

	test("should close menu when clicking outside", async ({ page }) => {
		// Open menu
		const menuButton = page.locator("#mobile-menu-button");
		await menuButton.click();

		const mobileMenu = page.locator("#mobile-menu");
		await expect(mobileMenu).toBeVisible();

		// Click outside the menu (on backdrop)
		await page.locator("body").click({ position: { x: 10, y: 10 } });

		// Menu should be closed
		await expect(mobileMenu).not.toBeVisible();
	});

	test("should close menu when clicking navigation items", async ({ page }) => {
		// Open menu
		const menuButton = page.locator("#mobile-menu-button");
		await menuButton.click();

		const mobileMenu = page.locator("#mobile-menu");
		await expect(mobileMenu).toBeVisible();

		// Click on a navigation item
		const featuresLink = page.locator("a[href='#features']");
		await featuresLink.click();

		// Menu should be closed after clicking link
		await expect(mobileMenu).not.toBeVisible();
	});

	test("should show correct icon based on menu state", async ({ page }) => {
		const menuButton = page.locator("#mobile-menu-button");

		// Initially should show menu icon (hamburger)
		const menuIcon = page.locator(
			"#mobile-menu-button svg:has(path[d='M3 12h18'])",
		);
		await expect(menuIcon).toBeVisible();

		// Click to open menu
		await menuButton.click();

		// Should now show close icon (X)
		const closeIcon = page.locator(
			"#mobile-menu-button svg:has(path[d='M18 6 6 18'])",
		);
		await expect(closeIcon).toBeVisible();

		// Click to close menu
		await menuButton.click();

		// Should show menu icon again
		await expect(menuIcon).toBeVisible();
	});
});

test.describe("Desktop Navigation", () => {
	test.beforeEach(async ({ page }) => {
		// Set viewport to desktop size
		await page.setViewportSize({ width: 1200, height: 800 });
		await page.goto("/");
	});

	test("should hide mobile menu on desktop", async ({ page }) => {
		const menuButton = page.locator("#mobile-menu-button");
		await expect(menuButton).not.toBeVisible();

		const desktopNav = page.locator(".hidden.lg\\:flex.items-center.space-x-8");
		await expect(desktopNav).toBeVisible();
	});
});
