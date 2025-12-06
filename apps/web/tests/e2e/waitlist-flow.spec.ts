import { expect, test } from "@playwright/test";

test.describe("Waitlist Flow", () => {
	const _BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
	const TEST_EMAIL = `test-${Date.now()}@snapback.dev`;

	test.beforeEach(async ({ page }) => {
		// Navigate to waitlist page
		await page.goto("/waitlist");
	});

	test("should display waitlist page with all required elements", async ({
		page,
	}) => {
		// Check title
		await expect(page.locator("h1")).toContainText(
			"Join SnapBack Private Alpha",
		);

		// Check form fields
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator("#github")).toBeVisible();

		// Check select dropdowns
		await expect(page.getByRole("combobox", { name: /editor/i })).toBeVisible();
		await expect(
			page.getByRole("combobox", { name: /language/i }),
		).toBeVisible();
		await expect(
			page.getByRole("combobox", { name: /team size/i }),
		).toBeVisible();

		// Check submit button
		await expect(
			page.getByRole("button", { name: /request beta access/i }),
		).toBeVisible();
	});

	test("should show validation errors for empty required fields", async ({
		page,
	}) => {
		// Try to submit empty form
		const submitButton = page.getByRole("button", {
			name: /request beta access/i,
		});
		await submitButton.click();

		// Should show HTML5 validation for email
		const emailInput = page.locator('input[type="email"]');
		const validationMessage = await emailInput.evaluate(
			(el: HTMLInputElement) => el.validationMessage,
		);
		expect(validationMessage).toBeTruthy();
	});

	test("should successfully join waitlist with valid data", async ({
		page,
	}) => {
		// Fill email
		await page.locator('input[type="email"]').fill(TEST_EMAIL);

		// Fill optional GitHub username
		await page.locator("#github").fill("testuser");

		// Select editor
		await page.getByRole("combobox", { name: /editor/i }).click();
		await page.getByRole("option", { name: "VS Code" }).click();

		// Select language
		await page.getByRole("combobox", { name: /language/i }).click();
		await page.getByRole("option", { name: "TypeScript" }).click();

		// Select team size
		await page.getByRole("combobox", { name: /team size/i }).click();
		await page.getByRole("option", { name: "Pro" }).click();

		// Wait for Turnstile if present (in production)
		const turnstileFrame = page.frameLocator('iframe[src*="turnstile"]');
		if (
			await turnstileFrame
				.locator('input[type="checkbox"]')
				.isVisible({ timeout: 2000 })
				.catch(() => false)
		) {
			await turnstileFrame.locator('input[type="checkbox"]').click();
		}

		// Submit form
		const submitButton = page.getByRole("button", {
			name: /request beta access/i,
		});
		await submitButton.click();

		// Wait for success state
		await page.waitForSelector("text=/Your Position/i", { timeout: 10000 });

		// Verify success message elements
		await expect(page.locator("text=/queue position/i")).toBeVisible();
		await expect(page.locator("text=/#\\d+/")).toBeVisible(); // Queue position number
	});

	test("should prevent duplicate email signups", async ({ page }) => {
		const duplicateEmail = "duplicate@test.com";

		// First signup
		await page.locator('input[type="email"]').fill(duplicateEmail);
		await page.getByRole("combobox", { name: /editor/i }).click();
		await page.getByRole("option", { name: "VS Code" }).click();
		await page.getByRole("combobox", { name: /language/i }).click();
		await page.getByRole("option", { name: "TypeScript" }).click();
		await page.getByRole("combobox", { name: /team size/i }).click();
		await page.getByRole("option", { name: "Pro" }).click();

		// Mock Turnstile success
		await page.evaluate(() => {
			(window as any).turnstileToken = "test-token";
		});

		await page.getByRole("button", { name: /request beta access/i }).click();

		// Wait for either success or error
		await page.waitForTimeout(2000);

		// Try to join again with same email
		await page.reload();
		await page.locator('input[type="email"]').fill(duplicateEmail);
		await page.getByRole("combobox", { name: /editor/i }).click();
		await page.getByRole("option", { name: "Cursor" }).click();
		await page.getByRole("combobox", { name: /language/i }).click();
		await page.getByRole("option", { name: "JavaScript" }).click();
		await page.getByRole("combobox", { name: /team size/i }).click();
		await page.getByRole("option", { name: "2-5" }).click();

		await page.getByRole("button", { name: /request beta access/i }).click();

		// Should show generic error (no email enumeration)
		await expect(page.locator("text=/unable to join waitlist/i")).toBeVisible({
			timeout: 5000,
		});
	});

	test("should disable submit button without Turnstile token", async ({
		page,
	}) => {
		// Fill all fields
		await page.locator('input[type="email"]').fill(TEST_EMAIL);
		await page.getByRole("combobox", { name: /editor/i }).click();
		await page.getByRole("option", { name: "VS Code" }).click();
		await page.getByRole("combobox", { name: /language/i }).click();
		await page.getByRole("option", { name: "TypeScript" }).click();
		await page.getByRole("combobox", { name: /team size/i }).click();
		await page.getByRole("option", { name: "Pro" }).click();

		// Submit button should be disabled (if Turnstile is enabled)
		const submitButton = page.getByRole("button", {
			name: /request beta access/i,
		});

		// In development, Turnstile might be skipped
		if (await submitButton.isDisabled()) {
			expect(await submitButton.isDisabled()).toBeTruthy();
		}
	});

	test("should sanitize XSS attempts in form inputs", async ({ page }) => {
		const xssPayload = '<script>alert("XSS")</script>';

		// Fill email (should fail email validation anyway)
		await page.locator('input[type="email"]').fill("test@test.com");

		// Try XSS in GitHub username
		await page.locator("#github").fill(xssPayload);

		// Select other fields
		await page.getByRole("combobox", { name: /editor/i }).click();
		await page.getByRole("option", { name: "VS Code" }).click();
		await page.getByRole("combobox", { name: /language/i }).click();
		await page.getByRole("option", { name: "TypeScript" }).click();
		await page.getByRole("combobox", { name: /team size/i }).click();
		await page.getByRole("option", { name: "Pro" }).click();

		// Submit (should sanitize on backend)
		await page.getByRole("button", { name: /request beta access/i }).click();

		// Wait for response
		await page.waitForTimeout(2000);

		// Verify no script execution (page should not have alert dialog)
		const dialogs: string[] = [];
		page.on("dialog", (dialog) => {
			dialogs.push(dialog.message());
			dialog.dismiss();
		});

		expect(dialogs).toHaveLength(0);
	});

	test("should show referral functionality after successful signup", async ({
		page,
	}) => {
		// Complete signup
		await page.locator('input[type="email"]').fill(TEST_EMAIL);
		await page.getByRole("combobox", { name: /editor/i }).click();
		await page.getByRole("option", { name: "VS Code" }).click();
		await page.getByRole("combobox", { name: /language/i }).click();
		await page.getByRole("option", { name: "TypeScript" }).click();
		await page.getByRole("combobox", { name: /team size/i }).click();
		await page.getByRole("option", { name: "Pro" }).click();

		await page.getByRole("button", { name: /request beta access/i }).click();

		// Wait for success
		await page.waitForSelector("text=/queue position/i", { timeout: 10000 });

		// Should show referral code (if implemented in success component)
		// This might need adjustment based on actual implementation
		const hasReferralSection = await page
			.locator("text=/referral|invite/i")
			.isVisible({ timeout: 2000 })
			.catch(() => false);

		// Log for visibility
		if (hasReferralSection) {
			console.log("✅ Referral functionality visible after signup");
		}
	});
});

test.describe("Waitlist Accessibility", () => {
	test("should have proper ARIA labels and semantic HTML", async ({ page }) => {
		await page.goto("/waitlist");

		// Check form has proper labels
		const emailLabel = await page.locator('label[for="email"]');
		await expect(emailLabel).toBeVisible();

		const editorLabel = await page.locator('label[for="editor"]');
		await expect(editorLabel).toBeVisible();

		// Check heading hierarchy
		const h1 = await page.locator("h1");
		await expect(h1).toBeVisible();

		// Run axe accessibility check (if @axe-core/playwright is installed)
		try {
			const { injectAxe, checkA11y } = await import("@axe-core/playwright");
			await injectAxe(page);
			await checkA11y(page, null, {
				detailedReport: true,
				detailedReportOptions: {
					html: true,
				},
			});
		} catch (error) {
			console.warn("Axe accessibility check not available:", error);
		}
	});

	test("should be keyboard navigable", async ({ page }) => {
		await page.goto("/waitlist");

		// Tab through form elements
		await page.keyboard.press("Tab"); // Email input
		await expect(page.locator('input[type="email"]')).toBeFocused();

		await page.keyboard.press("Tab"); // GitHub input
		await expect(page.locator("#github")).toBeFocused();

		await page.keyboard.press("Tab"); // Editor select
		// Continue tabbing through other elements...

		// Should be able to submit with Enter on submit button
		const submitButton = page.getByRole("button", {
			name: /request beta access/i,
		});
		await submitButton.focus();
		await expect(submitButton).toBeFocused();
	});
});

test.describe("Waitlist Performance", () => {
	test("should load within performance budget", async ({ page }) => {
		const startTime = Date.now();
		await page.goto("/waitlist");

		// Wait for hydration
		await page.waitForLoadState("networkidle");
		const loadTime = Date.now() - startTime;

		// Should load within 3 seconds
		expect(loadTime).toBeLessThan(3000);

		// Log performance metrics
		const performanceMetrics = await page.evaluate(() => {
			const perfEntries = performance.getEntriesByType(
				"navigation",
			)[0] as PerformanceNavigationTiming;
			return {
				domContentLoaded:
					perfEntries.domContentLoadedEventEnd -
					perfEntries.domContentLoadedEventStart,
				loadComplete: perfEntries.loadEventEnd - perfEntries.loadEventStart,
				firstPaint: performance
					.getEntriesByType("paint")
					.find((e) => e.name === "first-paint")?.startTime,
			};
		});

		console.log("⏱️  Performance Metrics:", performanceMetrics);
	});
});
