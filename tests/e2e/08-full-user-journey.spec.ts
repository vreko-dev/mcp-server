/**
 * E2E Tests - Full User Journey
 * Tests complete user flow from signup to using all major features
 */

import { expect, test } from "@playwright/test";
import { ApiClient } from "./helpers/api";
import { getAuthToken } from "./helpers/auth";

test.describe("Full User Journey", () => {
	test.describe("Complete flow: signup → verify → login → create API key → use MCP → view analytics → search docs", () => {
		test("new user can complete entire workflow", async ({ page, request }) => {
			const email = `journey-${Date.now()}@example.com`;
			const password = "Test123!@#";
			const projectName = "test-project-journey";

			// Step 1: Sign up
			await page.goto("/signup");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password", { exact: true }).fill(password);
			await page.getByLabel("Confirm Password").fill(password);
			await page.getByRole("button", { name: "Sign Up" }).click();

			// Should redirect to verification page
			await expect(page).toHaveURL(/.*verify-email/);
			await expect(page.getByText("Check your email")).toBeVisible();

			// For testing purposes, we'll assume email verification happens automatically
			// In a real test, we would extract the verification token from the email

			// Step 2: Login
			await page.goto("/login");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill(password);
			await page.getByRole("button", { name: "Log In" }).click();

			// Should redirect to dashboard
			await expect(page).toHaveURL(/.*dashboard/);
			await expect(page.getByText("Welcome back")).toBeVisible();

			// Step 3: Create API key
			// Navigate to API keys page
			await page.click('[data-testid="nav-api-keys"]');

			// Create new API key
			await page.click('[data-testid="create-api-key-button"]');
			await page.fill('[data-testid="api-key-name"]', "Journey Test Key");
			await page.check('[data-testid="permission-read"]');
			await page.check('[data-testid="permission-write"]');
			await page.click('[data-testid="create-api-key-submit"]');

			// Get the API key value (in a real test, this would only be shown once)
			const apiKey = await page.locator('[data-testid="api-key-value"]').textContent();
			expect(apiKey).toBeTruthy();

			// Close the modal
			await page.click('[data-testid="close-api-key-modal"]');

			// Step 4: Use MCP tools
			// Navigate to MCP tools page
			await page.click('[data-testid="nav-mcp-tools"]');

			// Create a snapshot
			await page.click('[data-testid="tool-create-snapshot"]');
			await page.fill('[data-testid="project-id"]', projectName);
			await page.fill('[data-testid="file-paths"]', "src/index.ts,package.json");
			await page.fill('[data-testid="snapshot-message"]', "Initial snapshot for journey test");
			await page.click('[data-testid="execute-snapshot"]');

			// Should show success message
			await expect(page.getByText("Snapshot created successfully")).toBeVisible();

			// Check that snapshot appears in list
			await page.click('[data-testid="nav-snapshots"]');
			await expect(page.locator(`[data-testid="snapshot-${projectName}"]`)).toBeVisible();

			// Step 5: View analytics
			// Navigate to analytics page
			await page.click('[data-testid="nav-analytics"]');

			// Should show analytics dashboard
			await expect(page.getByText("Analytics Dashboard")).toBeVisible();
			await expect(page.locator('[data-testid="snapshot-count"]')).toBeVisible();
			await expect(page.locator('[data-testid="api-usage-chart"]')).toBeVisible();

			// Step 6: Search documentation
			// Navigate to docs
			await page.click('[data-testid="nav-docs"]');

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Search for relevant documentation
			await page.locator('[data-testid="search-input"]').fill("api keys");

			// Click first result
			await page.locator('[data-testid="search-result-item"]').first().click();

			// Should navigate to docs page
			await page.waitForURL(/.*docs/);
			await expect(page.getByText("API Keys")).toBeVisible();

			// Verify the journey is complete
			console.log("Full user journey completed successfully!");
		});

		test("user can navigate between services seamlessly", async ({ page }) => {
			const email = `navigation-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Login first (assuming user already exists for this test)
			await page.goto("/login");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill(password);
			await page.getByRole("button", { name: "Log In" }).click();

			// Should redirect to dashboard
			await expect(page).toHaveURL(/.*dashboard/);

			// Navigate to Web App
			await page.click('[data-testid="nav-web-app"]');
			await expect(page).toHaveURL("http://snapback.dev");

			// Navigate to Console
			await page.click('[data-testid="nav-console"]');
			await expect(page).toHaveURL("http://console.snapback.dev");

			// Navigate to Docs
			await page.click('[data-testid="nav-docs"]');
			await expect(page).toHaveURL("http://docs.snapback.dev");

			// Navigate to API (direct link)
			await page.goto("http://api.snapback.dev/health");
			await expect(page.getByText("healthy")).toBeVisible();

			// Navigate to MCP
			await page.goto("http://mcp.snapback.dev/health");
			await expect(page.getByText("healthy")).toBeVisible();
		});
	});

	test.describe("Multi-page journey", () => {
		test("user workflow spans multiple pages and sessions", async ({ page, context }) => {
			const email = `multipage-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Part 1: Initial setup in first session
			await page.goto("/signup");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password", { exact: true }).fill(password);
			await page.getByLabel("Confirm Password").fill(password);
			await page.getByRole("button", { name: "Sign Up" }).click();

			// Verify email and login
			await page.goto("/login");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill(password);
			await page.getByRole("button", { name: "Log In" }).click();

			// Create a project
			await page.click('[data-testid="create-project-button"]');
			await page.fill('[data-testid="project-name"]', "Multipage Test Project");
			await page.click('[data-testid="create-project-submit"]');

			// Store project ID for later use
			const projectId = await page.locator('[data-testid="project-id"]').textContent();

			// Part 2: Return in new session
			// Create new context (simulates new browser session)
			const newContext = await browser.newContext();
			const newPage = await newContext.newPage();

			// Login in new session
			await newPage.goto("/login");
			await newPage.getByLabel("Email").fill(email);
			await newPage.getByLabel("Password").fill(password);
			await newPage.getByRole("button", { name: "Log In" }).click();

			// Project should still exist
			await expect(newPage.locator(`[data-testid="project-${projectId}"]`)).toBeVisible();

			// Create snapshot in new session
			await newPage.click(`[data-testid="project-${projectId}"]`);
			await newPage.click('[data-testid="create-snapshot-button"]');
			await newPage.fill('[data-testid="snapshot-message"]', "Snapshot from new session");
			await newPage.click('[data-testid="execute-snapshot"]');

			// Should succeed
			await expect(newPage.getByText("Snapshot created successfully")).toBeVisible();
		});
	});

	test.describe("Cross-service integration", () => {
		test("data flows correctly between web, API, MCP, and Docs", async ({ page, request }) => {
			const email = `integration-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Login
			await page.goto("/login");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill(password);
			await page.getByRole("button", { name: "Log In" }).click();

			// Get auth token for API calls
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Create project via API
			const projectResponse = await apiClient.post("/api/v1/projects", {
				name: "Integration Test Project",
				description: "Testing cross-service integration",
			});

			const projectId = projectResponse.id;

			// Create snapshot via MCP tool
			const snapshotResponse = await apiClient.post("/api/v1/mcp/tools/create-snapshot", {
				projectId: projectId,
				filePaths: ["src/index.ts"],
				message: "Integration test snapshot",
			});

			const snapshotId = snapshotResponse.id;

			// Verify snapshot appears in web UI
			await page.goto("/dashboard");
			await page.click(`[data-testid="project-${projectId}"]`);
			await expect(page.locator(`[data-testid="snapshot-${snapshotId}"]`)).toBeVisible();

			// Verify documentation references the workflow
			await page.click('[data-testid="nav-docs"]');

			// Search for documentation about snapshots
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			await page.locator('[data-testid="search-input"]').fill("create snapshot");
			await expect(page.locator('[data-testid="search-result-item"]')).toBeVisible();

			// Click documentation result
			await page.locator('[data-testid="search-result-item"]').first().click();

			// Documentation should mention the API and MCP integration
			const docContent = await page.textContent("body");
			expect(docContent).toContain("API");
			expect(docContent).toContain("MCP");
		});
	});

	test.describe("End-to-end validation", () => {
		test("all services report healthy status throughout journey", async ({ page, request }) => {
			// Check initial health status of all services
			const services = [
				{ name: "Web", url: "http://snapback.dev/health" },
				{ name: "API", url: "http://api.snapback.dev/health" },
				{ name: "MCP", url: "http://mcp.snapback.dev/health" },
				{ name: "Docs", url: "http://docs.snapback.dev/health" },
			];

			for (const service of services) {
				const response = await request.get(service.url);
				expect(response.ok()).toBe(true);

				const healthData = await response.json();
				expect(healthData.status).toBe("healthy");
			}

			// Perform user journey
			const email = `health-${Date.now()}@example.com`;
			const password = "Test123!@#";

			await page.goto("/signup");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password", { exact: true }).fill(password);
			await page.getByLabel("Confirm Password").fill(password);
			await page.getByRole("button", { name: "Sign Up" }).click();

			// Check health status again after user actions
			for (const service of services) {
				const response = await request.get(service.url);
				expect(response.ok()).toBe(true);

				const healthData = await response.json();
				expect(healthData.status).toBe("healthy");
			}

			// Login and perform more actions
			await page.goto("/login");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill(password);
			await page.getByRole("button", { name: "Log In" }).click();

			// Create API key
			await page.click('[data-testid="nav-api-keys"]');
			await page.click('[data-testid="create-api-key-button"]');
			await page.fill('[data-testid="api-key-name"]', "Health Test Key");
			await page.check('[data-testid="permission-read"]');
			await page.click('[data-testid="create-api-key-submit"]');
			await page.click('[data-testid="close-api-key-modal"]');

			// Final health check
			for (const service of services) {
				const response = await request.get(service.url);
				expect(response.ok()).toBe(true);

				const healthData = await response.json();
				expect(healthData.status).toBe("healthy");
			}
		});

		test("user data is consistent across all services", async ({ page, request }) => {
			const email = `consistency-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Sign up and login
			await page.goto("/signup");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password", { exact: true }).fill(password);
			await page.getByLabel("Confirm Password").fill(password);
			await page.getByRole("button", { name: "Sign Up" }).click();

			await page.goto("/login");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill(password);
			await page.getByRole("button", { name: "Log In" }).click();

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create project in web UI
			const projectName = "Consistency Test Project";
			await page.click('[data-testid="create-project-button"]');
			await page.fill('[data-testid="project-name"]', projectName);
			await page.click('[data-testid="create-project-submit"]');

			// Get project ID from UI
			const projectIdElement = await page.locator('[data-testid="project-id"]').first();
			const projectId = await projectIdElement.textContent();

			// Verify project exists via API
			const apiClient = new ApiClient("http://snapback.dev", authToken);
			const projectsResponse = await apiClient.get("/api/v1/projects");

			const projectExists = projectsResponse.projects.some(
				(project: any) => project.id === projectId && project.name === projectName,
			);
			expect(projectExists).toBe(true);

			// Create snapshot via MCP
			await apiClient.post("/api/v1/mcp/tools/create-snapshot", {
				projectId: projectId,
				filePaths: ["src/index.ts"],
				message: "Consistency test snapshot",
			});

			// Verify snapshot appears in web UI
			await page.reload();
			await page.click(`[data-testid="project-${projectId}"]`);
			await expect(page.locator('[data-testid="snapshot-item"]')).toBeVisible();

			// Verify user profile is consistent
			const profileResponse = await apiClient.get("/api/v1/user/profile");
			expect(profileResponse.email).toBe(email);

			// Verify in web UI
			await page.click('[data-testid="user-menu"]');
			const userEmail = await page.locator('[data-testid="user-email"]').textContent();
			expect(userEmail).toBe(email);
		});
	});
});
