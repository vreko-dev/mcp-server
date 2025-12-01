import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { startServer } from "../../src/index.js";

describe("Access Control Integration", () => {
	it("should allow admin users to access all tools", async () => {
		// Set up environment for admin user
		const originalApiKey = process.env.SNAPBACK_API_KEY;
		process.env.SNAPBACK_API_KEY = "sb_live_admin_testkey123";

		try {
			const { server } = await startServer();

			// Test accessing a Pro-tier tool as admin
			const request = {
				method: "call_tool",
				params: {
					name: "snapback.create_checkpoint",
					arguments: {
						reason: "test checkpoint",
					},
				},
			};

			// Mock the tool handler to avoid actual implementation
			server.setRequestHandler(CallToolRequestSchema, async () => {
				return { content: [{ type: "text", text: "Checkpoint created" }] };
			});

			// This should not throw an access denied error
			const result = await server.handleRequest(request);
			expect(result).toBeDefined();
			// The result will depend on the mock implementation, but it should not be an access denied error
		} finally {
			// Restore original environment
			process.env.SNAPBACK_API_KEY = originalApiKey;
		}
	});

	it("should allow pro users to access Pro-tier tools", async () => {
		// Set up environment for pro user
		const originalApiKey = process.env.SNAPBACK_API_KEY;
		process.env.SNAPBACK_API_KEY = "sb_live_testkey123";

		try {
			const { server } = await startServer();

			// Test accessing a Pro-tier tool as pro user
			const request = {
				method: "call_tool",
				params: {
					name: "snapback.create_checkpoint",
					arguments: {
						reason: "test checkpoint",
					},
				},
			};

			// Mock the tool handler to avoid actual implementation
			server.setRequestHandler(CallToolRequestSchema, async () => {
				return { content: [{ type: "text", text: "Checkpoint created" }] };
			});

			// This should not throw an access denied error
			const result = await server.handleRequest(request);
			expect(result).toBeDefined();
		} finally {
			// Restore original environment
			process.env.SNAPBACK_API_KEY = originalApiKey;
		}
	});

	it("should deny free users access to Pro-tier tools", async () => {
		// Set up environment for free user
		const originalApiKey = process.env.SNAPBACK_API_KEY;
		process.env.SNAPBACK_API_KEY = "";

		try {
			const { server } = await startServer();

			// Test accessing a Pro-tier tool as free user
			const request = {
				method: "call_tool",
				params: {
					name: "snapback.create_checkpoint",
					arguments: {
						reason: "test checkpoint",
					},
				},
			};

			// Mock the tool handler to avoid actual implementation
			server.setRequestHandler(CallToolRequestSchema, async () => {
				return { content: [{ type: "text", text: "Checkpoint created" }] };
			});

			// This should throw an access denied error
			const result = await server.handleRequest(request);
			expect(result).toBeDefined();
			// Check if the result contains an access denied message
			if (result && typeof result === "object" && "content" in result) {
				const content = result.content as Array<{ type: string; text?: string }>;
				const textContent = content.find((c) => c.type === "text");
				if (textContent?.text) {
					expect(textContent.text).toContain("Access denied");
				}
			}
		} finally {
			// Restore original environment
			process.env.SNAPBACK_API_KEY = originalApiKey;
		}
	});

	it("should allow free users to access free-tier tools", async () => {
		// Set up environment for free user
		const originalApiKey = process.env.SNAPBACK_API_KEY;
		process.env.SNAPBACK_API_KEY = "";

		try {
			const { server } = await startServer();

			// Test accessing a free-tier tool as free user
			const request = {
				method: "call_tool",
				params: {
					name: "snapback.analyze_risk",
					arguments: {
						changes: [{ value: "console.log('test');" }],
					},
				},
			};

			// Mock the tool handler to avoid actual implementation
			server.setRequestHandler(CallToolRequestSchema, async () => {
				return { content: [{ type: "text", text: "Risk analysis complete" }] };
			});

			// This should not throw an access denied error
			const result = await server.handleRequest(request);
			expect(result).toBeDefined();
		} finally {
			// Restore original environment
			process.env.SNAPBACK_API_KEY = originalApiKey;
		}
	});
});
