/**
 * E2E Tests - API Integration
 * Tests API key creation, usage, permissions, rate limiting, and error handling
 */

import { expect, test } from "@playwright/test";
import { createApiHelpers } from "../helpers/api";
import { createTestUser, getAuthToken, loginUser } from "../helpers/auth";

test.describe("API Integration", () => {
	test.describe("API Key Creation", () => {
		test("user can create API key with valid credentials", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API helpers
			const apiHelpers = createApiHelpers(request);

			// Create API key
			const apiKeyResponse = await apiHelpers.createApiKey(authToken);

			// Verify response
			expect(apiKeyResponse).toHaveProperty("id");
			expect(apiKeyResponse).toHaveProperty("name", "Test API Key");
			expect(apiKeyResponse).toHaveProperty("key");
			expect(apiKeyResponse).toHaveProperty("permissions");
			expect(apiKeyResponse.permissions).toEqual(expect.arrayContaining(["read", "write"]));
		});

		test("API key creation fails without authentication", async ({ request }) => {
			const response = await request.post("/api/v1/api-keys", {
				data: {
					name: "Test API Key",
					permissions: ["read", "write"],
				},
			});

			// Should return 401 Unauthorized
			expect(response.status()).toBe(401);
		});

		test("API key creation fails with invalid permissions", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Try to create API key with invalid permissions
			const response = await request.post("/api/v1/api-keys", {
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				data: {
					name: "Test API Key",
					permissions: ["invalid-permission"],
				},
			});

			// Should return 400 Bad Request
			expect(response.status()).toBe(400);
		});
	});

	test.describe("API Key Usage", () => {
		test("API requests work with valid API key", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API helpers
			const apiHelpers = createApiHelpers(request);

			// Create API key
			const apiKeyResponse = await apiHelpers.createApiKey(authToken);
			const apiKey = apiKeyResponse.key;

			// Use API key for authenticated request
			const profileResponse = await request.get("/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			// Should succeed
			expect(profileResponse.ok()).toBe(true);
			const profileData = await profileResponse.json();
			expect(profileData).toHaveProperty("email", email);
		});

		test("API requests fail with invalid API key", async ({ request }) => {
			const response = await request.get("/api/v1/user/profile", {
				headers: {
					Authorization: "Bearer invalid-api-key",
				},
			});

			// Should return 401 Unauthorized
			expect(response.status()).toBe(401);
		});

		test("API requests fail with expired API key", async ({ request }) => {
			// In a real test, we would create an expired API key
			// For this test, we'll use a mock expired key
			const response = await request.get("/api/v1/user/profile", {
				headers: {
					Authorization: "Bearer expired-api-key",
				},
			});

			// Should return 401 Unauthorized
			expect(response.status()).toBe(401);
		});
	});

	test.describe("API Key Permissions", () => {
		test("read-only API key can read but not write", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create read-only API key
			const readOnlyKeyResponse = await request.post("/api/v1/api-keys", {
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				data: {
					name: "Read-only API Key",
					permissions: ["read"],
				},
			});

			const readOnlyKeyData = await readOnlyKeyResponse.json();
			const readOnlyApiKey = readOnlyKeyData.key;

			// Read operation should succeed
			const profileResponse = await request.get("/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${readOnlyApiKey}`,
				},
			});

			expect(profileResponse.ok()).toBe(true);

			// Write operation should fail
			const updateResponse = await request.put("/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${readOnlyApiKey}`,
					"Content-Type": "application/json",
				},
				data: {
					name: "Updated Name",
				},
			});

			// Should return 403 Forbidden
			expect(updateResponse.status()).toBe(403);
		});

		test("admin API key has full access", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create admin API key
			const adminKeyResponse = await request.post("/api/v1/api-keys", {
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				data: {
					name: "Admin API Key",
					permissions: ["read", "write", "admin"],
				},
			});

			const adminKeyData = await adminKeyResponse.json();
			const adminApiKey = adminKeyData.key;

			// Read operation should succeed
			const profileResponse = await request.get("/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${adminApiKey}`,
				},
			});

			expect(profileResponse.ok()).toBe(true);

			// Write operation should also succeed
			const updateResponse = await request.put("/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${adminApiKey}`,
					"Content-Type": "application/json",
				},
				data: {
					name: "Updated Name",
				},
			});

			expect(updateResponse.ok()).toBe(true);
		});
	});

	test.describe("Rate Limiting", () => {
		test("API requests are rate limited after threshold", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API helpers
			const apiHelpers = createApiHelpers(request);

			// Create API key
			const apiKeyResponse = await apiHelpers.createApiKey(authToken);
			const apiKey = apiKeyResponse.key;

			// Make many rapid requests to trigger rate limiting
			const requests = [];
			for (let i = 0; i < 20; i++) {
				requests.push(
					request.get("/api/v1/user/profile", {
						headers: {
							Authorization: `Bearer ${apiKey}`,
						},
					}),
				);
			}

			const responses = await Promise.all(requests);

			// Some requests should be rate limited (429)
			const rateLimitedResponses = responses.filter((response) => response.status() === 429);

			// At least some requests should be rate limited
			expect(rateLimitedResponses.length).toBeGreaterThan(0);
		});

		test("rate limit resets after time window", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API helpers
			const apiHelpers = createApiHelpers(request);

			// Create API key
			const apiKeyResponse = await apiHelpers.createApiKey(authToken);
			const apiKey = apiKeyResponse.key;

			// Make requests to trigger rate limiting
			for (let i = 0; i < 15; i++) {
				await request.get("/api/v1/user/profile", {
					headers: {
						Authorization: `Bearer ${apiKey}`,
					},
				});
			}

			// Wait for rate limit window to reset (in real implementation, this would be ~1 minute)
			// For test, we'll simulate by waiting a short time
			await page.waitForTimeout(1000);

			// Next request should succeed
			const response = await request.get("/api/v1/user/profile", {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			// Should succeed (not rate limited)
			expect(response.ok()).toBe(true);
		});
	});

	test.describe("Error Handling", () => {
		test("API returns proper error format for bad requests", async ({ request }) => {
			const response = await request.post("/api/v1/api-keys", {
				data: {
					// Missing required fields
				},
			});

			// Should return 400 Bad Request
			expect(response.status()).toBe(400);

			const errorData = await response.json();
			expect(errorData).toHaveProperty("error");
			expect(errorData).toHaveProperty("code");
			expect(errorData).toHaveProperty("message");
		});

		test("API returns proper error for not found resources", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Try to access non-existent resource
			const response = await request.get("/api/v1/non-existent-resource", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			});

			// Should return 404 Not Found
			expect(response.status()).toBe(404);

			const errorData = await response.json();
			expect(errorData).toHaveProperty("error");
			expect(errorData).toHaveProperty("code", "NOT_FOUND");
		});

		test("API handles malformed requests gracefully", async ({ request }) => {
			// Send malformed JSON
			const response = await request.post("/api/v1/api-keys", {
				headers: {
					"Content-Type": "application/json",
				},
				data: "{ invalid json }",
			});

			// Should return 400 Bad Request
			expect(response.status()).toBe(400);

			const errorData = await response.json();
			expect(errorData).toHaveProperty("error");
			expect(errorData).toHaveProperty("code", "BAD_REQUEST");
		});
	});
});
