import { expect, type Page, test } from "@playwright/test";

/**
 * TDD Cycle 5: Dashboard & API Key Management
 *
 * Comprehensive E2E tests for stellar DX/UX covering:
 * - First-time user onboarding
 * - API key lifecycle (create, list, revoke)
 * - Usage metrics & plan limits
 * - Dashboard overview
 * - Activity tracking
 * - Subscription management
 * - Error states & edge cases
 * - Accessibility
 */

test.describe("Dashboard & API Key Management E2E", () => {
	test.beforeEach(async ({ page, context }) => {
		// Setup: Mock authenticated session
		// In real implementation, Better Auth sets session cookies
		await context.addCookies([
			{
				name: "better-auth.session_token",
				value: "mock-session-token-12345",
				domain: "localhost",
				path: "/",
				httpOnly: true,
				secure: false,
				sameSite: "Lax",
			},
		]);

		// Mock user session API response
		await page.route("**/api/auth/session", (route) => {
			route.fulfill({
				status: 200,
				body: JSON.stringify({
					user: {
						id: "user_test_123",
						email: "test@example.com",
						name: "Test User",
					},
					session: {
						id: "session_123",
						userId: "user_test_123",
						expiresAt: new Date(
							Date.now() + 30 * 24 * 60 * 60 * 1000,
						).toISOString(),
					},
				}),
			});
		});
	});

	test.describe("First-Time User Onboarding", () => {
		test("should show empty state with CTA when no API keys exist", async ({
			page,
		}) => {
			// GIVEN: User with no API keys
			await mockUserWithNoKeys(page);
			await page.reload();

			// THEN: Should show empty state
			await expect(page.getByText("No API Keys Yet")).toBeVisible();
			await expect(page.getByText(/create your first API key/i)).toBeVisible();

			// AND: Should have prominent CTA
			const createButton = page.getByRole("button", {
				name: /create api key/i,
			});
			await expect(createButton).toBeVisible();
			await expect(createButton).toHaveClass(/bg-snapback-green/);
		});

		test("should guide user through first API key creation", async ({
			page,
		}) => {
			// GIVEN: User clicks create API key
			await page.getByRole("button", { name: /create api key/i }).click();

			// THEN: Should open modal with form
			await expect(page.getByRole("dialog")).toBeVisible();
			await expect(page.getByText("Create API Key")).toBeVisible();

			// AND: Should have helpful description
			await expect(
				page.getByText(/will be used to authenticate/i),
			).toBeVisible();

			// WHEN: User names the key
			await page.fill('[name="keyName"]', "My First Key");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should show success with full key
			await expect(
				page.getByText(/api key created successfully/i),
			).toBeVisible();
			const keyDisplay = page.getByTestId("api-key-display");
			await expect(keyDisplay).toBeVisible();
			await expect(keyDisplay).toHaveText(/^sb_[a-zA-Z0-9]{32}$/);

			// AND: Should have copy button
			const copyButton = page.getByRole("button", { name: /copy/i });
			await expect(copyButton).toBeVisible();

			// AND: Should show warning about saving
			await expect(page.getByText(/save this key securely/i)).toBeVisible();
			await expect(
				page.getByText(/you won't be able to see it again/i),
			).toBeVisible();
		});

		test("should copy API key to clipboard", async ({ page }) => {
			// GIVEN: User has created API key
			await createApiKey(page, "Test Key");

			// WHEN: User clicks copy button
			await page.getByRole("button", { name: /copy/i }).click();

			// THEN: Should show success notification
			await expect(page.getByText(/copied to clipboard/i)).toBeVisible();

			// AND: Should change button text temporarily
			await expect(
				page.getByRole("button", { name: /copied!/i }),
			).toBeVisible();

			// AND: Should revert after timeout
			await page.waitForTimeout(2000);
			await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
		});

		test("should show setup instructions after first key creation", async ({
			page,
		}) => {
			// GIVEN: User created first API key
			await createApiKey(page, "VS Code Key");
			await page.getByRole("button", { name: /done/i }).click();

			// THEN: Should show onboarding checklist
			await expect(page.getByText("Getting Started")).toBeVisible();
			await expect(page.getByText(/install vs code extension/i)).toBeVisible();
			await expect(page.getByText(/add your api key/i)).toBeVisible();
			await expect(page.getByText(/start coding/i)).toBeVisible();

			// AND: Should have quick action links
			await expect(
				page.getByRole("link", { name: /download extension/i }),
			).toBeVisible();
			await expect(
				page.getByRole("link", { name: /view docs/i }),
			).toBeVisible();
		});
	});

	test.describe("API Key Management", () => {
		test("should list all existing API keys with metadata", async ({
			page,
		}) => {
			// GIVEN: User with multiple API keys
			await mockUserWithKeys(page, [
				{
					id: "key_1",
					name: "VS Code",
					preview: "sb_abcd...",
					lastUsed: new Date("2024-01-15"),
				},
				{
					id: "key_2",
					name: "CLI Tool",
					preview: "sb_efgh...",
					lastUsed: new Date("2024-01-10"),
				},
				{
					id: "key_3",
					name: "Backup",
					preview: "sb_ijkl...",
					lastUsed: null,
				},
			]);
			await page.goto("/app/api-keys");

			// THEN: Should display all keys
			await expect(page.getByText("VS Code")).toBeVisible();
			await expect(page.getByText("CLI Tool")).toBeVisible();
			await expect(page.getByText("Backup")).toBeVisible();

			// AND: Should show key previews (not full keys)
			await expect(page.getByText("sb_abcd...")).toBeVisible();
			await expect(page.getByText("sb_efgh...")).toBeVisible();

			// AND: Should show last used timestamps
			await expect(page.getByText("5 days ago")).toBeVisible();
			await expect(page.getByText("10 days ago")).toBeVisible();
			await expect(page.getByText("Never used")).toBeVisible();
		});

		test("should create additional API key with unique name", async ({
			page,
		}) => {
			// GIVEN: User already has 1 key
			await mockUserWithKeys(page, [
				{ id: "key_1", name: "Existing Key", preview: "sb_abcd..." },
			]);
			await page.goto("/app/api-keys");

			// WHEN: User creates another key
			await page.getByRole("button", { name: /create api key/i }).click();
			await page.fill('[name="keyName"]', "Production Key");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should create successfully
			await expect(
				page.getByText(/api key created successfully/i),
			).toBeVisible();

			// AND: Should show in list after closing modal
			await page.getByRole("button", { name: /done/i }).click();
			await expect(page.getByText("Production Key")).toBeVisible();
			await expect(page.getByText("Existing Key")).toBeVisible();
		});

		test("should validate API key name requirements", async ({ page }) => {
			// GIVEN: User opens create key modal
			await page.goto("/app/api-keys");
			await page.getByRole("button", { name: /create api key/i }).click();

			// WHEN: User submits empty name
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should show validation error
			await expect(page.getByText(/name is required/i)).toBeVisible();

			// WHEN: User enters name too short
			await page.fill('[name="keyName"]', "ab");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should show length error
			await expect(page.getByText(/at least 3 characters/i)).toBeVisible();

			// WHEN: User enters valid name
			await page.fill('[name="keyName"]', "Valid Key Name");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should proceed to creation
			await expect(page.getByTestId("api-key-display")).toBeVisible();
		});

		test("should revoke API key with confirmation", async ({ page }) => {
			// GIVEN: User has API key
			await mockUserWithKeys(page, [
				{ id: "key_1", name: "Old Key", preview: "sb_abcd..." },
			]);
			await page.goto("/app/api-keys");

			// WHEN: User clicks revoke
			await page
				.getByRole("button", { name: /revoke/i })
				.first()
				.click();

			// THEN: Should show confirmation dialog
			await expect(page.getByRole("dialog")).toBeVisible();
			await expect(page.getByText(/are you sure/i)).toBeVisible();
			await expect(
				page.getByText(/this action cannot be undone/i),
			).toBeVisible();

			// WHEN: User confirms
			await page.getByRole("button", { name: /confirm revoke/i }).click();

			// THEN: Should show success and mark as revoked
			await expect(page.getByText(/api key revoked/i)).toBeVisible();
			await expect(page.getByText("Old Key")).toBeVisible();
			await expect(page.getByText(/revoked/i)).toBeVisible();

			// AND: Revoke button should be disabled
			const revokeButton = page
				.getByRole("button", { name: /revoke/i })
				.first();
			await expect(revokeButton).toBeDisabled();
		});

		test("should enforce plan-based API key limits", async ({ page }) => {
			// GIVEN: Free tier user with max keys (3)
			await mockUserPlan(page, "free");
			await mockUserWithKeys(page, [
				{ id: "key_1", name: "Key 1", preview: "sb_1..." },
				{ id: "key_2", name: "Key 2", preview: "sb_2..." },
				{ id: "key_3", name: "Key 3", preview: "sb_3..." },
			]);
			await page.goto("/app/api-keys");

			// WHEN: User tries to create another key
			await page.getByRole("button", { name: /create api key/i }).click();
			await page.fill('[name="keyName"]', "Key 4");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should show limit error
			await expect(
				page.getByText(/you've reached the limit of 3 API keys/i),
			).toBeVisible();
			await expect(page.getByText(/upgrade to solo/i)).toBeVisible();

			// AND: Should have upgrade link
			await expect(
				page.getByRole("link", { name: /upgrade plan/i }),
			).toBeVisible();
		});

		test("should allow unlimited keys for Solo/Team plans", async ({
			page,
		}) => {
			// GIVEN: Pro tier user with 5 keys
			await mockUserPlan(page, "pro");
			await mockUserWithKeys(page, [
				{ id: "key_1", name: "Key 1", preview: "sb_1..." },
				{ id: "key_2", name: "Key 2", preview: "sb_2..." },
				{ id: "key_3", name: "Key 3", preview: "sb_3..." },
				{ id: "key_4", name: "Key 4", preview: "sb_4..." },
				{ id: "key_5", name: "Key 5", preview: "sb_5..." },
			]);
			await page.goto("/app/api-keys");

			// WHEN: User creates 6th key
			await page.getByRole("button", { name: /create api key/i }).click();
			await page.fill('[name="keyName"]', "Key 6");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should succeed (no limit)
			await expect(page.getByTestId("api-key-display")).toBeVisible();
			await page.getByRole("button", { name: /done/i }).click();
			await expect(page.getByText("Key 6")).toBeVisible();
		});
	});

	test.describe("Dashboard Overview", () => {
		test("should display protection status for active user", async ({
			page,
		}) => {
			// GIVEN: User with active protection
			await mockUserMetrics(page, {
				checkpointCount: 247,
				recoveryCount: 3,
				filesProtected: 1423,
				aiDetectionRate: 94,
			});
			await page.goto("/app/dashboard");

			// THEN: Should show status banner
			await expect(page.getByText(/protection active/i)).toBeVisible();
			await expect(
				page.getByText(/your code is being monitored/i),
			).toBeVisible();

			// AND: Should display key metrics
			await expect(page.getByText("247")).toBeVisible(); // checkpoints
			await expect(page.getByText("3")).toBeVisible(); // recoveries
			await expect(page.getByText("1,423")).toBeVisible(); // files
			await expect(page.getByText("94%")).toBeVisible(); // AI detection
		});

		test("should show empty state for new user with no activity", async ({
			page,
		}) => {
			// GIVEN: New user with zero activity
			await mockUserMetrics(page, {
				checkpointCount: 0,
				recoveryCount: 0,
				filesProtected: 0,
				aiDetectionRate: 0,
			});
			await page.goto("/app/dashboard");

			// THEN: Should show welcome message
			await expect(page.getByText(/welcome to snapback/i)).toBeVisible();
			await expect(page.getByText(/no checkpoints yet/i)).toBeVisible();

			// AND: Should show getting started steps
			await expect(page.getByText(/install extension/i)).toBeVisible();
			await expect(page.getByText(/create api key/i)).toBeVisible();

			// AND: All metrics should show 0
			await expect(page.getByText("0 checkpoints")).toBeVisible();
			await expect(page.getByText("0 recoveries")).toBeVisible();
		});

		test("should display AI tool detection breakdown", async ({ page }) => {
			// GIVEN: User with AI tool activity
			await mockAIDetectionStats(page, [
				{ tool: "GitHub Copilot", count: 45, avgConfidence: 0.96 },
				{ tool: "Cursor", count: 23, avgConfidence: 0.92 },
				{ tool: "Windsurf", count: 12, avgConfidence: 0.89 },
			]);
			await page.goto("/app/dashboard");

			// THEN: Should show AI detection section
			await expect(page.getByText("AI Tools Detected")).toBeVisible();

			// AND: Should show each tool with stats
			await expect(page.getByText("GitHub Copilot")).toBeVisible();
			await expect(page.getByText("45")).toBeVisible();
			await expect(page.getByText("96% confidence")).toBeVisible();

			await expect(page.getByText("Cursor")).toBeVisible();
			await expect(page.getByText("23")).toBeVisible();
			await expect(page.getByText("92% confidence")).toBeVisible();
		});

		test("should show recent activity feed with timestamps", async ({
			page,
		}) => {
			// GIVEN: User with recent activity
			await mockRecentActivity(page, [
				{
					type: "checkpoint",
					message: "Checkpoint created",
					timestamp: "2 minutes ago",
					metadata: { files: 5 },
				},
				{
					type: "ai_detection",
					message: "GitHub Copilot detected",
					timestamp: "5 minutes ago",
					metadata: { confidence: 0.94 },
				},
				{
					type: "recovery",
					message: "Code recovered",
					timestamp: "1 hour ago",
					metadata: { checkpoint: "snap_123" },
				},
			]);
			await page.goto("/app/dashboard");

			// THEN: Should show activity feed
			await expect(page.getByText("Recent Activity")).toBeVisible();

			// AND: Should show each activity
			await expect(page.getByText("Checkpoint created")).toBeVisible();
			await expect(page.getByText("2 minutes ago")).toBeVisible();

			await expect(page.getByText("GitHub Copilot detected")).toBeVisible();
			await expect(page.getByText("5 minutes ago")).toBeVisible();

			await expect(page.getByText("Code recovered")).toBeVisible();
			await expect(page.getByText("1 hour ago")).toBeVisible();
		});

		test("should display quick action cards", async ({ page }) => {
			// GIVEN: User on dashboard
			await page.goto("/app/dashboard");

			// THEN: Should show quick actions
			await expect(page.getByText("Download VS Code Extension")).toBeVisible();
			await expect(page.getByText("Install CLI Tool")).toBeVisible();
			await expect(page.getByText("Documentation")).toBeVisible();

			// AND: Should have working links
			const vscodeLink = page.getByRole("link", {
				name: /download vs code extension/i,
			});
			await expect(vscodeLink).toHaveAttribute("href", /\/download\/vscode/);

			const cliLink = page.getByRole("link", { name: /install cli/i });
			await expect(cliLink).toBeVisible();

			const docsLink = page.getByRole("link", { name: /documentation/i });
			await expect(docsLink).toHaveAttribute("href", /\/docs/);
		});
	});

	test.describe("Usage Metrics & Plan Limits", () => {
		test("should show Free tier checkpoint limit and usage", async ({
			page,
		}) => {
			// GIVEN: Free tier user with 45/100 snapshots used
			await mockUserPlan(page, "free");
			await mockUsageLimits(page, {
				snapshotsUsed: 45,
				snapshotsLimit: 100,
				cloudStorageUsedMb: 0,
				cloudStorageLimitMb: 0,
			});
			await page.goto("/app/dashboard");

			// THEN: Should show usage progress
			await expect(page.getByText("45 / 100")).toBeVisible();
			await expect(page.getByText(/snapshots this month/i)).toBeVisible();

			// AND: Should show progress bar at 45%
			const progressBar = page.getByTestId("usage-progress");
			await expect(progressBar).toHaveAttribute("aria-valuenow", "45");
			await expect(progressBar).toHaveAttribute("aria-valuemax", "100");

			// AND: Should not show warning (under 80%)
			await expect(page.getByText(/approaching limit/i)).not.toBeVisible();
		});

		test("should warn at 80% usage threshold", async ({ page }) => {
			// GIVEN: Free tier user at 85/100 snapshots
			await mockUserPlan(page, "free");
			await mockUsageLimits(page, {
				snapshotsUsed: 85,
				snapshotsLimit: 100,
			});
			await page.goto("/app/dashboard");

			// THEN: Should show warning banner
			await expect(
				page.getByText(/approaching your snapshot limit/i),
			).toBeVisible();
			await expect(page.getByText(/85 of 100 used/i)).toBeVisible();

			// AND: Progress bar should be yellow/warning color
			const progressBar = page.getByTestId("usage-progress");
			await expect(progressBar).toHaveClass(/bg-snapback-warning/);

			// AND: Should suggest upgrade
			await expect(
				page.getByText(/upgrade to solo for unlimited/i),
			).toBeVisible();
		});

		test("should show critical warning at 95% usage", async ({ page }) => {
			// GIVEN: Free tier user at 97/100 snapshots
			await mockUserPlan(page, "free");
			await mockUsageLimits(page, {
				snapshotsUsed: 97,
				snapshotsLimit: 100,
			});
			await page.goto("/app/dashboard");

			// THEN: Should show critical warning
			await expect(
				page.getByText(/critical: only 3 snapshots remaining/i),
			).toBeVisible();

			// AND: Progress bar should be red/danger color
			const progressBar = page.getByTestId("usage-progress");
			await expect(progressBar).toHaveClass(/bg-snapback-danger/);

			// AND: Should have prominent upgrade CTA
			const upgradeButton = page.getByRole("button", {
				name: /upgrade now/i,
			});
			await expect(upgradeButton).toBeVisible();
			await expect(upgradeButton).toHaveClass(/bg-snapback-danger/);
		});

		test("should block snapshot creation at 100% limit", async ({ page }) => {
			// GIVEN: Free tier user at 100/100 snapshots
			await mockUserPlan(page, "free");
			await mockUsageLimits(page, {
				snapshotsUsed: 100,
				snapshotsLimit: 100,
			});
			await page.goto("/app/dashboard");

			// THEN: Should show limit reached message
			await expect(page.getByText(/snapshot limit reached/i)).toBeVisible();
			await expect(page.getByText(/upgrade to continue/i)).toBeVisible();

			// AND: Should show upgrade required modal
			await expect(page.getByRole("dialog")).toBeVisible();
			await expect(
				page.getByText(/you've used all 100 snapshots/i),
			).toBeVisible();

			// AND: Should suggest Pro plan
			await expect(page.getByText(/upgrade to solo/i)).toBeVisible();
			await expect(page.getByText(/unlimited snapshots/i)).toBeVisible();

			// AND: Should have upgrade button
			await expect(
				page.getByRole("button", { name: /upgrade to solo/i }),
			).toBeVisible();
		});

		test('should show "Unlimited" for Solo/Team plans', async ({ page }) => {
			// GIVEN: Pro tier user with 500 snapshots
			await mockUserPlan(page, "pro");
			await mockUsageLimits(page, {
				snapshotsUsed: 500,
				snapshotsLimit: null, // unlimited
			});
			await page.goto("/app/dashboard");

			// THEN: Should show unlimited badge
			await expect(page.getByText("Unlimited")).toBeVisible();
			await expect(page.getByText("500 snapshots this month")).toBeVisible();

			// AND: Should not show progress bar
			await expect(page.getByTestId("usage-progress")).not.toBeVisible();

			// AND: Should not show any warnings
			await expect(page.getByText(/approaching limit/i)).not.toBeVisible();
			await expect(page.getByText(/upgrade/i)).not.toBeVisible();
		});

		test("should display cloud storage usage for Solo/Team plans", async ({
			page,
		}) => {
			// GIVEN: Pro tier with cloud backup enabled
			await mockUserPlan(page, "pro");
			await mockUsageLimits(page, {
				snapshotsUsed: 150,
				snapshotsLimit: null,
				cloudStorageUsedMb: 245,
				cloudStorageLimitMb: 1000,
			});
			await page.goto("/app/dashboard");

			// THEN: Should show cloud storage metrics
			await expect(page.getByText("Cloud Storage")).toBeVisible();
			await expect(page.getByText("245 MB / 1 GB")).toBeVisible();

			// AND: Should show storage progress
			const storageProgress = page.getByTestId("storage-progress");
			await expect(storageProgress).toHaveAttribute("aria-valuenow", "245");
			await expect(storageProgress).toHaveAttribute("aria-valuemax", "1000");
		});
	});

	test.describe("Subscription Management", () => {
		test("should display current plan with features", async ({ page }) => {
			// GIVEN: User on Pro plan
			await mockSubscription(page, {
				plan: "pro",
				status: "active",
				currentPeriodEnd: new Date("2024-02-15"),
			});
			await page.goto("/app/settings/billing");

			// THEN: Should show current plan
			await expect(page.getByText("Pro Plan")).toBeVisible();
			await expect(page.getByText(/\$29\/month/i)).toBeVisible();

			// AND: Should show plan features
			await expect(page.getByText(/unlimited snapshots/i)).toBeVisible();
			await expect(page.getByText(/cloud backup/i)).toBeVisible();
			await expect(page.getByText(/advanced ai detection/i)).toBeVisible();

			// AND: Should show renewal date
			await expect(page.getByText(/renews on february 15/i)).toBeVisible();
		});

		test("should show upgrade options for Free plan users", async ({
			page,
		}) => {
			// GIVEN: Free tier user
			await mockUserPlan(page, "free");
			await page.goto("/app/settings/billing");

			// THEN: Should show Free plan badge
			await expect(page.getByText("Free Plan")).toBeVisible();

			// AND: Should show upgrade options
			await expect(page.getByText("Upgrade to Pro")).toBeVisible();
			await expect(page.getByText("Upgrade to Team")).toBeVisible();

			// AND: Should highlight recommended plan
			const proCard = page.locator('[data-plan="pro"]');
			await expect(proCard).toHaveClass(/recommended/);
			await expect(proCard.getByText("Recommended")).toBeVisible();
		});

		test("should handle upgrade flow to Pro plan", async ({ page }) => {
			// GIVEN: Free tier user
			await mockUserPlan(page, "free");
			await page.goto("/app/settings/billing");

			// WHEN: User clicks upgrade to Solo
			await page.getByRole("button", { name: /upgrade to solo/i }).click();

			// THEN: Should redirect to Stripe checkout
			await page.waitForURL(/checkout\.stripe\.com/);

			// OR: Should open Stripe modal (depending on implementation)
			// await expect(page.frameLocator('iframe[name*="stripe"]')).toBeVisible();
		});

		test("should show trial period for new Solo subscribers", async ({
			page,
		}) => {
			// GIVEN: User on Solo trial
			await mockSubscription(page, {
				plan: "pro",
				status: "trialing",
				trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
			});
			await page.goto("/app/dashboard");

			// THEN: Should show trial banner
			await expect(page.getByText(/trial active/i)).toBeVisible();
			await expect(page.getByText(/7 days remaining/i)).toBeVisible();

			// AND: Should explain trial terms
			await expect(
				page.getByText(/full access to solo features/i),
			).toBeVisible();
			await expect(page.getByText(/cancel anytime/i)).toBeVisible();
		});

		test("should handle subscription cancellation", async ({ page }) => {
			// GIVEN: User on active Pro plan
			await mockSubscription(page, {
				plan: "pro",
				status: "active",
				currentPeriodEnd: new Date("2024-02-15"),
			});
			await page.goto("/app/settings/billing");

			// WHEN: User clicks cancel subscription
			await page.getByRole("button", { name: /cancel subscription/i }).click();

			// THEN: Should show confirmation dialog
			await expect(page.getByRole("dialog")).toBeVisible();
			await expect(page.getByText(/are you sure/i)).toBeVisible();
			await expect(page.getByText(/will lose access to/i)).toBeVisible();
			await expect(page.getByText(/unlimited checkpoints/i)).toBeVisible();
			await expect(page.getByText(/cloud backup/i)).toBeVisible();

			// WHEN: User confirms cancellation
			await page.getByRole("button", { name: /confirm cancellation/i }).click();

			// THEN: Should show scheduled cancellation
			await expect(
				page.getByText(/subscription will cancel on february 15/i),
			).toBeVisible();
			await expect(
				page.getByText(/access until end of billing period/i),
			).toBeVisible();

			// AND: Should offer to reactivate
			await expect(
				page.getByRole("button", { name: /reactivate subscription/i }),
			).toBeVisible();
		});
	});

	test.describe("Error States & Edge Cases", () => {
		test("should handle API errors gracefully", async ({ page }) => {
			// GIVEN: API returns error
			await page.route("**/api/apikeys/create", (route) => {
				route.fulfill({
					status: 500,
					body: JSON.stringify({ error: "Internal server error" }),
				});
			});
			await page.goto("/app/api-keys");

			// WHEN: User tries to create API key
			await page.getByRole("button", { name: /create api key/i }).click();
			await page.fill('[name="keyName"]', "Test Key");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should show error message
			await expect(page.getByText(/something went wrong/i)).toBeVisible();
			await expect(page.getByText(/please try again/i)).toBeVisible();

			// AND: Should have retry button
			await expect(
				page.getByRole("button", { name: /try again/i }),
			).toBeVisible();
		});

		test("should show loading states during operations", async ({ page }) => {
			// GIVEN: Slow API response
			await page.route("**/api/apikeys/create", async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				route.continue();
			});
			await page.goto("/app/api-keys");

			// WHEN: User creates API key
			await page.getByRole("button", { name: /create api key/i }).click();
			await page.fill('[name="keyName"]', "Test Key");
			await page.getByRole("button", { name: /create/i }).click();

			// THEN: Should show loading state
			await expect(
				page.getByRole("button", { name: /creating.../i }),
			).toBeVisible();
			const createButton = page.getByRole("button", {
				name: /creating.../i,
			});
			await expect(createButton).toBeDisabled();

			// AND: Should show spinner
			await expect(page.getByTestId("loading-spinner")).toBeVisible();
		});

		test("should validate network connectivity", async ({ page }) => {
			// GIVEN: User goes offline
			await page.context().setOffline(true);
			await page.goto("/app/dashboard");
			await page.reload();

			// THEN: Should show offline banner
			await expect(page.getByText(/you're offline/i)).toBeVisible();
			await expect(
				page.getByText(/some features may not be available/i),
			).toBeVisible();

			// WHEN: Connection restored
			await page.context().setOffline(false);
			await page.reload();

			// THEN: Should remove offline banner
			await expect(page.getByText(/you're offline/i)).not.toBeVisible();
		});

		test("should handle expired session gracefully", async ({ page }) => {
			// GIVEN: User session expires
			await page.goto("/app/dashboard");
			await clearAuthCookies(page);

			// WHEN: User tries to perform action
			await page.getByRole("button", { name: /create api key/i }).click();

			// THEN: Should redirect to login
			await page.waitForURL("/auth/login");

			// AND: Should preserve intended action
			await expect(page.url()).toContain("returnTo=/app/api-keys");

			// AND: Should show session expired message
			await expect(page.getByText(/session expired/i)).toBeVisible();
		});
	});

	test.describe("Accessibility & UX", () => {
		test("should support keyboard navigation", async ({ page }) => {
			await page.goto("/app/api-keys");

			// WHEN: User navigates with keyboard
			await page.keyboard.press("Tab"); // Focus first element
			await page.keyboard.press("Tab"); // Focus create button

			// THEN: Create button should be focused
			const createButton = page.getByRole("button", {
				name: /create api key/i,
			});
			await expect(createButton).toBeFocused();

			// WHEN: User presses Enter
			await page.keyboard.press("Enter");

			// THEN: Modal should open with focus on name input
			await expect(page.getByRole("dialog")).toBeVisible();
			const nameInput = page.getByLabel(/key name/i);
			await expect(nameInput).toBeFocused();
		});

		test("should have proper ARIA labels and roles", async ({ page }) => {
			await page.goto("/app/dashboard");

			// THEN: Should have semantic landmarks
			await expect(page.getByRole("main")).toBeVisible();
			await expect(page.getByRole("navigation")).toBeVisible();

			// AND: Should have proper labels
			await expect(
				page.getByRole("region", { name: /usage metrics/i }),
			).toBeVisible();
			await expect(
				page.getByRole("region", { name: /recent activity/i }),
			).toBeVisible();

			// AND: Progress bars should have labels
			const progressBar = page.getByTestId("usage-progress");
			await expect(progressBar).toHaveAttribute("role", "progressbar");
			await expect(progressBar).toHaveAttribute("aria-label");
		});

		test("should support screen readers", async ({ page }) => {
			await page.goto("/app/dashboard");

			// THEN: Should have descriptive text for screen readers
			await expect(page.getByText(/247 checkpoints created/i)).toBeVisible();
			await expect(page.getByText(/3 recoveries performed/i)).toBeVisible();

			// AND: Icons should have aria-labels
			const statusIcon = page.getByTestId("status-icon");
			await expect(statusIcon).toHaveAttribute(
				"aria-label",
				/protection active/i,
			);
		});

		test("should show success notifications", async ({ page }) => {
			await page.goto("/app/api-keys");

			// WHEN: User creates API key
			await createApiKey(page, "New Key");

			// THEN: Should show toast notification
			const toast = page.getByRole("alert");
			await expect(toast).toBeVisible();
			await expect(toast).toHaveText(/api key created successfully/i);

			// AND: Should auto-dismiss after timeout
			await page.waitForTimeout(5000);
			await expect(toast).not.toBeVisible();
		});

		test("should handle mobile responsive layout", async ({ page }) => {
			// GIVEN: Mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/app/dashboard");

			// THEN: Should show mobile-optimized layout
			await expect(page.getByRole("button", { name: /menu/i })).toBeVisible();

			// AND: Metrics should stack vertically
			const metricsGrid = page.locator('[data-testid="metrics-grid"]');
			await expect(metricsGrid).toHaveCSS("grid-template-columns", /1fr/);
		});
	});
});

// Helper functions for test setup
async function mockUserWithNoKeys(page: Page) {
	await page.route("**/api/apikeys/list", (route) => {
		route.fulfill({ status: 200, body: JSON.stringify({ keys: [] }) });
	});
}

async function mockUserWithKeys(page: Page, keys: any[]) {
	await page.route("**/api/apikeys/list", (route) => {
		route.fulfill({ status: 200, body: JSON.stringify({ keys }) });
	});
}

async function mockUserPlan(page: Page, plan: "free" | "pro" | "team") {
	await page.route("**/api/user/subscription", (route) => {
		route.fulfill({
			status: 200,
			body: JSON.stringify({ plan, status: "active" }),
		});
	});
}

async function mockUsageLimits(page: Page, limits: any) {
	await page.route("**/api/usage/limits", (route) => {
		route.fulfill({ status: 200, body: JSON.stringify(limits) });
	});
}

async function mockUserMetrics(page: Page, metrics: any) {
	await page.route("**/api/metrics", (route) => {
		route.fulfill({ status: 200, body: JSON.stringify(metrics) });
	});
}

async function mockAIDetectionStats(page: Page, stats: any[]) {
	await page.route("**/api/metrics/ai-detection", (route) => {
		route.fulfill({ status: 200, body: JSON.stringify(stats) });
	});
}

async function mockRecentActivity(page: Page, activities: any[]) {
	await page.route("**/api/activity/recent", (route) => {
		route.fulfill({ status: 200, body: JSON.stringify({ activities }) });
	});
}

async function mockSubscription(page: Page, subscription: any) {
	await page.route("**/api/user/subscription", (route) => {
		route.fulfill({ status: 200, body: JSON.stringify(subscription) });
	});
}

async function createApiKey(page: Page, name: string) {
	await page.getByRole("button", { name: /create api key/i }).click();
	await page.fill('[name="keyName"]', name);
	await page.getByRole("button", { name: /create/i }).click();
	await page.waitForSelector('[data-testid="api-key-display"]');
}

async function clearAuthCookies(page: Page) {
	await page.context().clearCookies();
}
