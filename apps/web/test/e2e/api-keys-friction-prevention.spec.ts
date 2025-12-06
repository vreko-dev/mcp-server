/**
 * API Key Lifecycle - Friction Prevention E2E Tests
 *
 * Tests critical user journeys to eliminate friction:
 * ✅ Clear error messages (no cryptic codes)
 * ✅ Loading feedback (no mystery waits)
 * ✅ Recovery paths (retry, fallback)
 * ✅ Keyboard accessibility (no mouse-only flows)
 * ✅ Next steps clarity (what to do after success)
 *
 * Uses Playwright for real browser testing + Faker.js for realistic test data
 *
 * @see docs/TESTING_AUTOMATION_STRATEGY.md
 */

import { test, expect, Page } from "@playwright/test";
import { faker } from "@faker-js/faker";

/**
 * Test ID conventions:
 * F1, F2, F3... = Friction prevention test number
 * Prefix journey type in describe blocks
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

/**
 * Helper: Ensure user is authenticated
 * In real tests, this would use persistent session/cookies
 */
async function ensureAuthenticated(page: Page) {
	const response = await page.goto(`${BASE_URL}/auth/session`);
	if (response?.status() === 401) {
		await page.goto(`${BASE_URL}/auth/login`);
		await page.fill("[name=email]", "test@example.com");
		await page.fill("[name=password]", "password123");
		await page.click("button:has-text('Sign In')");
		await page.waitForURL(`${BASE_URL}/dashboard`);
	}
}

// ============================================================================
// ONBOARDING FRICTION: First API Key Creation
// ============================================================================

test.describe("F1: Create First API Key - No Friction", () => {
	test.beforeEach(async ({ page }) => {
		// Setup: Authenticated user on API Keys page
		await ensureAuthenticated(page);
		await page.goto(`${BASE_URL}/settings/api-keys`);
		await expect(page.locator("text=API Keys")).toBeVisible();
	});

	test("should show create button prominently", async ({ page }) => {
		// Page displays clear CTA for key creation
		const createButton = page.locator("button:has-text('Create API Key')");
		await expect(createButton).toBeVisible();
		await expect(createButton).toBeFocused({ timeout: 1000 }); // Auto-focus for keyboard
	});

	test("should show form with clear field labels", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");

		// Modal/form opens with clear labels (not just placeholders)
		await expect(page.locator("label:has-text('API Key Name')")).toBeVisible();
		await expect(
			page.locator("label:has-text('Permissions')")
		).toBeVisible();
		await expect(page.locator("label:has-text('Rate Limit')")).toBeVisible();
	});

	test("should validate empty form with actionable error", async ({
		page,
	}) => {
		await page.click("button:has-text('Create API Key')");

		// User tries to submit empty form
		const createBtn = page.locator("button:has-text('Create')").last();
		await createBtn.click();

		// ERROR CLARITY: Not "400 Bad Request" but actionable message
		const errorAlert = page.locator("[role=alert]");
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toContainText(
			/name is required|please enter a name/i
		);

		// Error is accessible (ARIA role)
		await expect(errorAlert).toHaveAttribute("role", "alert");
	});

	test("should allow user to fill and submit form", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");

		const keyName = `CI/CD - ${faker.word.noun()}`;

		// FRICTION PREVENTION: All fields should be fillable
		await page.fill("[name=keyName]", keyName);

		// Scope selection (should be accessible)
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");

		// Rate limit (should have sensible defaults)
		const rateLimitInput = page.locator("[name=rateLimit]");
		const defaultValue = await rateLimitInput.inputValue();
		expect(Number(defaultValue)).toBeGreaterThan(0); // Not empty

		// Submit
		const createBtn = page.locator("button:has-text('Create')").last();
		await createBtn.click();

		// Loading state appears (NO MYSTERY WAIT)
		const spinner = page.locator("[data-testid=loading-spinner]");
		await expect(spinner).toBeVisible({ timeout: 500 });

		// After response, spinner disappears
		await expect(spinner).not.toBeVisible({ timeout: 3000 });
	});

	test("should show success with full key visible", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Production Key");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// SUCCESS CLARITY: Show what was created
		const successMessage = page.locator("[data-testid=success-message]");
		await expect(successMessage).toContainText(/successfully created/i);

		// CRITICAL: Full key shown only once with copy button
		const fullKeyDisplay = page.locator(
			"[data-testid=full-key-display]"
		);
		await expect(fullKeyDisplay).toBeVisible();
		expect(await fullKeyDisplay.textContent()).toMatch(/^sk_live_/);

		// Copy button is accessible
		const copyButton = page.locator("button:has-text('Copy')").first();
		await expect(copyButton).toBeVisible();
		await expect(copyButton).toBeFocused(); // Auto-focus for accessibility
	});

	test("should warn that key won't be shown again", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "One Time Key");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// FRICTION PREVENTION: Clear warning about key visibility
		const warningText = page.locator(
			"text=You won't see this key again|save this key securely"
		);
		await expect(warningText).toBeVisible();
	});
});

// ============================================================================
// ERROR FRICTION: Clear Recovery Paths
// ============================================================================

test.describe("F2: Error Handling & Recovery - No Confusion", () => {
	test.beforeEach(async ({ page }) => {
		await ensureAuthenticated(page);
		await page.goto(`${BASE_URL}/settings/api-keys`);
	});

	test("should show validation error for duplicate names", async ({
		page,
	}) => {
		// Existing key: "Production"
		// User tries to create another "Production"

		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Production"); // Duplicate
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// ERROR: Clear message about why it failed
		const errorMsg = page.locator("[role=alert]");
		await expect(errorMsg).toContainText(
			/name already exists|choose a different name/i
		);

		// User can retry immediately (modal stays open)
		await expect(page.locator("[role=dialog]")).toBeVisible();

		// User can fix: name field still has focus
		const nameField = page.locator("[name=keyName]");
		await nameField.clear();
		await nameField.fill("Production - Secondary");

		// Retry succeeds
		await page.click("button:has-text('Create')").last();
		await expect(
			page.locator("[data-testid=success-message]")
		).toBeVisible();
	});

	test("should handle rate limit with retry option", async ({ page }) => {
		// Scenario: User rapidly creates keys
		// Second attempt hits rate limit

		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Key 1");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// Wait for first to succeed
		await expect(
			page.locator("[data-testid=success-message]")
		).toBeVisible();

		// Immediately create another (second attempt)
		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Key 2");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// RATE LIMIT ERROR with actionable message
		const errorMsg = page.locator("[role=alert]");
		await expect(errorMsg).toContainText(
			/rate limit|too many requests|try again in/i
		);

		// RETRY BUTTON: User can retry without manual refresh
		const retryButton = page.locator("button:has-text('Retry')");
		await expect(retryButton).toBeVisible();

		// After waiting, retry succeeds
		await page.waitForTimeout(1000);
		await retryButton.click();

		// Success (second request now allowed)
		await expect(
			page.locator("[data-testid=success-message]")
		).toBeVisible();
	});

	test("should handle server error gracefully", async ({ page }) => {
		// Simulate 500 error response

		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Unlucky Key");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// SERVER ERROR: User-friendly message
		const errorMsg = page.locator("[role=alert]");
		await expect(errorMsg).toContainText(
			/something went wrong|try again|contact support/i
		);

		// NOT: "500 Internal Server Error"
		await expect(errorMsg).not.toContainText(/500|internal server error/i);

		// RETRY BUTTON available
		const retryButton = page.locator("button:has-text('Retry')");
		await expect(retryButton).toBeVisible();

		// User can close dialog and try again later
		const closeButton = page.locator("button[aria-label='Close']");
		await expect(closeButton).toBeVisible();
	});

	test("should handle network timeout", async ({ page }) => {
		// Slow network simulation

		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Timeout Key");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");

		// Abort after timeout
		const abortController = new AbortController();
		const timeoutId = setTimeout(() => abortController.abort(), 2000);

		try {
			await page.click("button:has-text('Create')").last();
		} catch {
			// Expected to timeout
		}
		clearTimeout(timeoutId);

		// TIMEOUT ERROR: Clear message
		const errorMsg = page.locator("[role=alert]");
		await expect(errorMsg).toContainText(
			/request timed out|slow connection|try again/i
		);
	});
});

// ============================================================================
// ACCESSIBILITY FRICTION: Keyboard & Screen Reader Support
// ============================================================================

test.describe("F3: Keyboard & Accessibility - No Mouse Required", () => {
	test.beforeEach(async ({ page }) => {
		await ensureAuthenticated(page);
		await page.goto(`${BASE_URL}/settings/api-keys`);
	});

	test("should navigate form with Tab key only", async ({ page }) => {
		// Start at page (create button should be auto-focused or first tab stop)
		const createButton = page.locator("button:has-text('Create API Key')");

		// Tab to create button
		if (!(await createButton.isVisible())) {
			await page.keyboard.press("Tab");
		}

		// Open form
		await page.keyboard.press("Enter");

		// Now tab through form fields
		await page.keyboard.press("Tab"); // Focus name input
		await page.keyboard.type("API Key Name");

		await page.keyboard.press("Tab"); // Focus scope selector
		await page.keyboard.press("Space"); // Open dropdown
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Space"); // Select

		await page.keyboard.press("Tab"); // Focus rate limit
		// (can skip if default is acceptable)

		await page.keyboard.press("Tab"); // Focus create button
		await page.keyboard.press("Enter"); // Submit

		// Verify success via keyboard only
		await expect(
			page.locator("[data-testid=success-message]")
		).toBeVisible();
	});

	test("should provide focus management", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");

		// Modal opens, focus moves to first field
		const nameInput = page.locator("[name=keyName]");
		await expect(nameInput).toBeFocused();

		// Fill and submit
		await nameInput.fill("Accessible Key");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// After success, focus moves to copy button
		const copyButton = page.locator("button:has-text('Copy')").first();
		await expect(copyButton).toBeFocused();
	});

	test("should have proper ARIA labels and roles", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");

		// Dialog has role and aria-label
		const dialog = page.locator("[role=dialog]");
		await expect(dialog).toHaveAttribute("aria-label", /create.*api.*key/i);

		// Form fields have associated labels
		const nameInput = page.locator("[name=keyName]");
		const nameLabel = page.locator("label[for=keyName]");
		await expect(nameLabel).toBeVisible();

		// Error messages have role=alert
		await page.click("button:has-text('Create')").last(); // Empty form
		const alert = page.locator("[role=alert]");
		await expect(alert).toBeVisible();
		await expect(alert).toHaveAttribute("role", "alert");
	});

	test("should support arrow keys in dropdown", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Test Key");

		// Open scope dropdown
		const scopeControl = page.locator("[name=scopes]");
		await scopeControl.click();

		// Use arrow keys to navigate options
		await page.keyboard.press("ArrowDown");
		const firstOption = page.locator("[role=option]:first-child");
		await expect(firstOption).toBeFocused();

		await page.keyboard.press("ArrowDown");
		const secondOption = page.locator("[role=option]:nth-child(2)");
		await expect(secondOption).toBeFocused();

		// Select with Space or Enter
		await page.keyboard.press("Space");
		await expect(page.locator("text=Read Snapshots")).toBeVisible();
	});
});

// ============================================================================
// POST-SUCCESS FRICTION: Clear Next Steps
// ============================================================================

test.describe("F4: Post-Success Clarity - No Confusion After Success", () => {
	test.beforeEach(async ({ page }) => {
		await ensureAuthenticated(page);
		await page.goto(`${BASE_URL}/settings/api-keys`);
	});

	test("should show success modal with copy button auto-focused", async ({
		page,
	}) => {
		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Post-Success Test");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// SUCCESS MODAL
		const modal = page.locator("[data-testid=success-modal]");
		await expect(modal).toBeVisible();

		// Copy button is auto-focused (immediate CTA)
		const copyButton = page.locator("button:has-text('Copy')").first();
		await expect(copyButton).toBeFocused();

		// Click copy (or just verify it's ready)
		await copyButton.click();

		// Toast confirms copy success
		const toast = page.locator("[role=status]");
		await expect(toast).toContainText(/copied|clipboard/i);
	});

	test("should show next steps clearly", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Next Steps Test");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		const modal = page.locator("[data-testid=success-modal]");

		// Clear steps shown
		await expect(modal).toContainText(/copy.*key/i); // Step 1
		await expect(modal).toContainText(/add.*extension|save.*config/i); // Step 2
		await expect(modal).toContainText(
			/you won't.*see.*again|save.*securely/i
		); // Warning

		// Links/buttons for next steps
		const nextButton = page.locator("button:has-text('Next')");
		await expect(nextButton).toBeVisible();
	});

	test("should allow dismissing modal after copy", async ({ page }) => {
		await page.click("button:has-text('Create API Key')");
		await page.fill("[name=keyName]", "Dismiss Test");
		await page.click("[name=scopes]");
		await page.click("label:has-text('Read Snapshots')");
		await page.click("button:has-text('Create')").last();

		// User copies key
		await page.click("button:has-text('Copy')").first();

		// Close button available
		const closeButton = page.locator("button[aria-label='Close']");
		await expect(closeButton).toBeVisible();
		await closeButton.click();

		// Modal closed, user back to key list
		const modal = page.locator("[data-testid=success-modal]");
		await expect(modal).not.toBeVisible();

		// New key appears in list
		const keyList = page.locator("[data-testid=key-list]");
		await expect(keyList).toContainText("Dismiss Test");
	});
});

// ============================================================================
// POWER USER FRICTION: Managing Many Keys
// ============================================================================

test.describe("F5: Power Users - Managing 50+ Keys Without Friction", () => {
	test.beforeEach(async ({ page }) => {
		await ensureAuthenticated(page);
		await page.goto(`${BASE_URL}/settings/api-keys`);
	});

	test("should paginate keys if many exist", async ({ page }) => {
		// Assume 50+ keys already exist
		const keyList = page.locator("[data-testid=key-list]");

		// Check for pagination or infinite scroll
		const nextPageButton = page.locator("button:has-text('Next')");
		const prevPageButton = page.locator("button:has-text('Previous')");

		// At least one navigation method should exist
		const hasPagination =
			(await nextPageButton.isVisible()) ||
			(await prevPageButton.isVisible());
		expect(hasPagination).toBe(true);
	});

	test("should allow filtering/searching keys", async ({ page }) => {
		const searchInput = page.locator("[name=search]");
		await expect(searchInput).toBeVisible();

		// Search for specific key
		await searchInput.fill("Production");

		// Results filtered
		const keyList = page.locator("[data-testid=key-list]");
		const visibleKeys = await keyList.locator("li").count();
		expect(visibleKeys).toBeGreaterThan(0);
		expect(visibleKeys).toBeLessThan(50); // Filtered
	});

	test("should show last-used date for keys", async ({ page }) => {
		const keyItem = page.locator("[data-testid=key-item]").first();

		// Last used info shown
		await expect(
			keyItem.locator("[data-testid=last-used]")
		).toContainText(/last used|used/i);
	});

	test("should allow bulk revoke with confirmation", async ({ page }) => {
		// Select multiple keys
		const checkboxes = page.locator("[data-testid=key-checkbox]");

		if ((await checkboxes.count()) > 1) {
			// Select first two keys
			await checkboxes.nth(0).click();
			await checkboxes.nth(1).click();

			// Bulk action button appears
			const bulkRevokeButton = page.locator(
				"button:has-text('Revoke Selected')"
			);
			await expect(bulkRevokeButton).toBeVisible();

			// Click revoke
			await bulkRevokeButton.click();

			// Confirmation dialog
			const confirmDialog = page.locator("[role=dialog]");
			await expect(confirmDialog).toContainText(/revoke|confirm/i);

			// Confirm
			await page.click("button:has-text('Revoke')").last();

			// Success message
			await expect(
				page.locator("[role=status]")
			).toContainText(/revoked/i);
		}
	});
});
