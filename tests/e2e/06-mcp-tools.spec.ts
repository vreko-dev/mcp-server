/**
 * E2E Tests - MCP Tools
 * Tests MCP tool listing, execution, and error handling
 */

import { expect, test } from "@playwright/test";
import { ApiClient } from "./helpers/api";
import { createTestUser, getAuthToken, loginUser } from "./helpers/auth";

test.describe("MCP Tools", () => {
	test.describe("List Available Tools", () => {
		test("user can list available MCP tools", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// List MCP tools
			const toolsResponse = await apiClient.get("/api/v1/mcp/tools");

			// Verify response structure
			expect(toolsResponse).toHaveProperty("tools");
			expect(Array.isArray(toolsResponse.tools)).toBe(true);

			// Check that expected tools are present
			const toolNames = toolsResponse.tools.map((tool: any) => tool.name);
			expect(toolNames).toEqual(expect.arrayContaining(["create-snapshot", "restore-snapshot", "analyze-risk"]));
		});

		test("tool listing includes proper metadata", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// List MCP tools
			const toolsResponse = await apiClient.get("/api/v1/mcp/tools");

			// Verify each tool has required metadata
			for (const tool of toolsResponse.tools) {
				expect(tool).toHaveProperty("name");
				expect(tool).toHaveProperty("description");
				expect(tool).toHaveProperty("parameters");
				expect(tool).toHaveProperty("permissions");
			}
		});

		test("tool listing fails without authentication", async () => {
			// Create API client without auth token
			const apiClient = new ApiClient("http://snapback.dev");

			try {
				await apiClient.get("/api/v1/mcp/tools");
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get unauthorized error
				expect(error.message).toContain("401");
			}
		});
	});

	test.describe("Execute create-snapshot Tool", () => {
		test("user can execute create-snapshot tool with valid parameters", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute create-snapshot tool
			const snapshotResponse = await apiClient.post("/api/v1/mcp/tools/create-snapshot", {
				projectId: "test-project-123",
				filePaths: ["src/index.ts", "package.json"],
				message: "Test snapshot creation",
			});

			// Verify response
			expect(snapshotResponse).toHaveProperty("id");
			expect(snapshotResponse).toHaveProperty("projectId", "test-project-123");
			expect(snapshotResponse).toHaveProperty("status", "created");
			expect(snapshotResponse).toHaveProperty("createdAt");
		});

		test("create-snapshot fails with missing required parameters", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute create-snapshot tool without required parameters
			try {
				await apiClient.post("/api/v1/mcp/tools/create-snapshot", {
					message: "Test snapshot creation",
					// Missing projectId and filePaths
				});
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get bad request error
				expect(error.message).toContain("400");
			}
		});

		test("create-snapshot fails with invalid file paths", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute create-snapshot tool with invalid file paths
			try {
				await apiClient.post("/api/v1/mcp/tools/create-snapshot", {
					projectId: "test-project-123",
					filePaths: ["../etc/passwd", "/etc/hosts"], // Invalid paths
					message: "Test snapshot creation",
				});
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get bad request error
				expect(error.message).toContain("400");
			}
		});
	});

	test.describe("Execute restore-snapshot Tool", () => {
		test("user can execute restore-snapshot tool with valid parameters", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// First create a snapshot
			const snapshotResponse = await apiClient.post("/api/v1/mcp/tools/create-snapshot", {
				projectId: "test-project-123",
				filePaths: ["src/index.ts"],
				message: "Test snapshot for restore",
			});

			const snapshotId = snapshotResponse.id;

			// Execute restore-snapshot tool
			const restoreResponse = await apiClient.post("/api/v1/mcp/tools/restore-snapshot", {
				snapshotId: snapshotId,
				targetPath: "/tmp/restored",
			});

			// Verify response
			expect(restoreResponse).toHaveProperty("snapshotId", snapshotId);
			expect(restoreResponse).toHaveProperty("status", "restoring");
			expect(restoreResponse).toHaveProperty("startedAt");
		});

		test("restore-snapshot fails with non-existent snapshot", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute restore-snapshot tool with invalid snapshot ID
			try {
				await apiClient.post("/api/v1/mcp/tools/restore-snapshot", {
					snapshotId: "non-existent-snapshot-id",
					targetPath: "/tmp/restored",
				});
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get not found error
				expect(error.message).toContain("404");
			}
		});
	});

	test.describe("Execute analyze-risk Tool", () => {
		test("user can execute analyze-risk tool with valid parameters", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute analyze-risk tool
			const analysisResponse = await apiClient.post("/api/v1/mcp/tools/analyze-risk", {
				projectId: "test-project-123",
				filePaths: ["src/index.ts"],
				aiProvider: "openai",
				model: "gpt-4",
			});

			// Verify response
			expect(analysisResponse).toHaveProperty("analysisId");
			expect(analysisResponse).toHaveProperty("projectId", "test-project-123");
			expect(analysisResponse).toHaveProperty("status", "analyzing");
			expect(analysisResponse).toHaveProperty("startedAt");
		});

		test("analyze-risk fails with unsupported AI provider", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute analyze-risk tool with unsupported AI provider
			try {
				await apiClient.post("/api/v1/mcp/tools/analyze-risk", {
					projectId: "test-project-123",
					filePaths: ["src/index.ts"],
					aiProvider: "unsupported-provider",
					model: "test-model",
				});
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get bad request error
				expect(error.message).toContain("400");
			}
		});
	});

	test.describe("MCP Error Handling", () => {
		test("MCP returns proper error format for tool execution errors", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute a tool with parameters that will cause a server error
			try {
				await apiClient.post("/api/v1/mcp/tools/create-snapshot", {
					projectId: "test-project-123",
					filePaths: ["src/index.ts"],
					message: "Test snapshot",
					// Add an invalid parameter that will cause server error
					invalidParam: "this-will-cause-an-error",
				});
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get proper error response
				expect(error.message).toContain("500");
			}
		});

		test("MCP handles rate limiting for tool executions", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Execute many tool requests rapidly to trigger rate limiting
			const requests = [];
			for (let i = 0; i < 20; i++) {
				requests.push(
					apiClient.post("/api/v1/mcp/tools/create-snapshot", {
						projectId: `test-project-${i}`,
						filePaths: ["src/index.ts"],
						message: `Test snapshot ${i}`,
					}),
				);
			}

			try {
				await Promise.all(requests);
				// If we get here, the test should fail (some requests should be rate limited)
				expect(false).toBe(true);
			} catch (error) {
				// At least some requests should be rate limited
				expect(error.message).toContain("429");
			}
		});

		test("MCP tools respect user permissions", async ({ page, request }) => {
			const email = `test-${Date.now()}@example.com`;
			const password = "Test123!@#";

			// Create and login user
			await createTestUser(page, email, password);
			await loginUser(page, email, password);

			// Get auth token
			const authToken = await getAuthToken(page);

			// Create API client
			const apiClient = new ApiClient("http://snapback.dev", authToken);

			// Try to execute an admin-only tool with regular user permissions
			try {
				await apiClient.post("/api/v1/mcp/tools/admin-tool", {
					action: "delete-all-snapshots",
				});
				// If we get here, the test should fail
				expect(false).toBe(true);
			} catch (error) {
				// Should get forbidden error
				expect(error.message).toContain("403");
			}
		});
	});
});
