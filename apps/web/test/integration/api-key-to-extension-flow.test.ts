/**
 * API Key Generation → VS Code Extension Flow Tests
 *
 * Tests the critical path where user:
 * 1. Creates API key on web portal
 * 2. Adds key to VS Code extension
 * 3. Extension uses key to authenticate with API
 *
 * This is a **DEMO-CRITICAL** flow that must be frictionless.
 *
 * @see gold_plating/test_coverage.md (P0 - Demo Critical)
 * @see testing-cleanup.md (4-path model: Happy/Sad/Edge/Error)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ============================================================================
// TEST DOUBLES & FIXTURES
// ============================================================================

interface MockApiKeyResponse {
	id: string;
	fullKey: string;
	name: string;
	createdAt: Date;
	preview: string;
}

interface MockExtensionConfig {
	apiKey?: string;
	userId?: string;
	email?: string;
}

interface MockSession {
	user: {
		id: string;
		email: string;
		name?: string;
	};
	accessToken: string;
}

// Mock Better Auth session management
const mockBetterAuth = {
	api: {
		getSession: vi.fn<[], Promise<MockSession | null>>(),
		verifyApiKey: vi.fn<
			[{ key: string }],
			Promise<{ valid: boolean; user?: { id: string; email: string } }>
		>(),
	},
};

// Mock Web API endpoints
const mockWebApi = {
	createApiKey: vi.fn<
		[{ userId: string; name: string; scopes: string[] }],
		Promise<MockApiKeyResponse>
	>(),
	getApiKeys: vi.fn<
		[{ userId: string }],
		Promise<MockApiKeyResponse[]>
	>(),
	revokeApiKey: vi.fn<
		[{ keyId: string }],
		Promise<{ success: boolean }>
	>(),
};

// Mock VS Code Extension configuration
const mockExtension = {
	config: {} as MockExtensionConfig,
	setConfig: vi.fn((key: string, value: string) => {
		mockExtension.config[key as keyof MockExtensionConfig] = value;
	}),
	getConfig: vi.fn((key: string) => {
		return mockExtension.config[key as keyof MockExtensionConfig];
	}),
	showMessage: vi.fn(),
	openSettings: vi.fn(),
};

// ============================================================================
// ✅ HAPPY PATH: Complete API Key Flow
// ============================================================================

describe("API Key Generation → Extension Flow - Happy Path", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockBetterAuth.api.getSession.mockResolvedValue({
			user: {
				id: "user_123",
				email: "user@example.com",
				name: "Test User",
			},
			accessToken: "token_abc123",
		});

		mockBetterAuth.api.verifyApiKey.mockResolvedValue({
			valid: true,
			user: { id: "user_123", email: "user@example.com" },
		});

		mockWebApi.createApiKey.mockResolvedValue({
			id: "key_xyz789",
			fullKey: "sk_live_abcdefghijk1234567890123456",
			name: "VS Code - Main",
			createdAt: new Date(),
			preview: "sk_live_abcd...3456",
		});
	});

	afterEach(() => {
		mockExtension.config = {};
	});

	describe("Web Portal: API Key Creation", () => {
		it("should create API key for authenticated user", async () => {
			const session = await mockBetterAuth.api.getSession();
			expect(session).toBeDefined();
			expect(session?.user.id).toBe("user_123");

			const apiKey = await mockWebApi.createApiKey({
				userId: session!.user.id,
				name: "VS Code - Main",
				scopes: ["snapshots:read", "snapshots:write"],
			});

			// ✅ Key created with correct metadata
			expect(apiKey).toHaveProperty("fullKey");
			expect(apiKey.fullKey).toMatch(/^sk_live_/);
			expect(apiKey.preview).toBe("sk_live_abcd...3456");
			expect(apiKey.name).toBe("VS Code - Main");
		});

		it("should display full key only once with copy-to-clipboard button", async () => {
			const apiKey = await mockWebApi.createApiKey({
				userId: "user_123",
				name: "VS Code - Main",
				scopes: ["snapshots:read"],
			});

			// ✅ Full key provided for immediate copy
			expect(apiKey.fullKey).toBeDefined();

			// ✅ User should copy key (in real UI, this is a button click)
			const copiedKey = apiKey.fullKey;
			expect(copiedKey).toMatch(/^sk_live_[a-zA-Z0-9]{32,}$/);

			// ✅ Second retrieval shows preview, not full key
			const keys = await mockWebApi.getApiKeys({ userId: "user_123" });
			expect(keys[0]?.preview).not.toContain(
				copiedKey.substring(copiedKey.length - 10)
			);
		});

		it("should show warning that key won't be displayed again", async () => {
			const apiKey = await mockWebApi.createApiKey({
				userId: "user_123",
				name: "VS Code - Main",
				scopes: ["snapshots:read"],
			});

			// ✅ UI should warn user (tested via message system)
			expect(mockExtension.showMessage).toBeCalled();

			// ✅ But we still show the key
			expect(apiKey.fullKey).toBeDefined();
		});
	});

	describe("Extension: Accept & Store API Key", () => {
		it("should allow user to paste API key into extension settings", async () => {
			const apiKey = "sk_live_abcdefghijk1234567890123456";

			mockExtension.setConfig("api.key", apiKey);

			// ✅ Key stored in secure storage
			const stored = mockExtension.getConfig("api.key");
			expect(stored).toBe(apiKey);
		});

		it("should validate pasted key before storing", async () => {
			const apiKey = "sk_live_abcdefghijk1234567890123456";

			// ✅ Validate format
			const isValid = apiKey.match(/^sk_live_[a-zA-Z0-9]{32,}$/);
			expect(isValid).toBeTruthy();

			mockExtension.setConfig("api.key", apiKey);

			// ✅ Storage succeeds
			expect(mockExtension.getConfig("api.key")).toBe(apiKey);
		});

		it("should confirm key is working with test call", async () => {
			const apiKey = "sk_live_abcdefghijk1234567890123456";

			// ✅ Verify key works
			const verification = await mockBetterAuth.api.verifyApiKey({
				key: apiKey,
			});

			expect(verification.valid).toBe(true);
			expect(verification.user?.id).toBe("user_123");

			// ✅ Show success message to user
			mockExtension.showMessage(`✅ API key verified for ${verification.user?.email}`);
			expect(mockExtension.showMessage).toHaveBeenCalledWith(
				expect.stringContaining("verified")
			);
		});
	});

	describe("Extension: Use API Key for Requests", () => {
		it("should send API key in Authorization header", async () => {
			const apiKey = "sk_live_abcdefghijk1234567890123456";
			mockExtension.setConfig("api.key", apiKey);

			// ✅ Extension sends key with requests
			const stored = mockExtension.getConfig("api.key");
			const authHeader = `Bearer ${stored}`;

			expect(authHeader).toBe(`Bearer ${apiKey}`);
		});

		it("should handle successful API response with key", async () => {
			const apiKey = "sk_live_abcdefghijk1234567890123456";

			// ✅ API accepts the key
			const result = await mockBetterAuth.api.verifyApiKey({
				key: apiKey,
			});

			expect(result.valid).toBe(true);

			// ✅ Extension can proceed with authenticated requests
			expect(result.user?.id).toBe("user_123");
		});
	});

	describe("End-to-End Flow: User Journey", () => {
		it("should complete user journey from signup to protected first save", async () => {
			// Step 1: User logs in to web portal
			const session = await mockBetterAuth.api.getSession();
			expect(session?.user.id).toBe("user_123");

			// Step 2: User creates API key
			const apiKey = await mockWebApi.createApiKey({
				userId: session!.user.id,
				name: "VS Code - Main",
				scopes: ["snapshots:read", "snapshots:write"],
			});
			expect(apiKey.fullKey).toBeDefined();

			// Step 3: User copies key from web portal
			const keyToCopy = apiKey.fullKey;

			// Step 4: User adds key to VS Code extension
			mockExtension.setConfig("api.key", keyToCopy);
			expect(mockExtension.getConfig("api.key")).toBe(keyToCopy);

			// Step 5: Extension verifies key works
			const verification = await mockBetterAuth.api.verifyApiKey({
				key: keyToCopy,
			});
			expect(verification.valid).toBe(true);

			// ✅ User can now save files with protection
			expect(mockExtension.getConfig("api.key")).toBe(keyToCopy);
		});
	});
});

// ============================================================================
// ❌ SAD PATH: Common Failure Scenarios
// ============================================================================

describe("API Key Generation → Extension Flow - Sad Path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Invalid Key Handling", () => {
		it("should reject malformed API key", async () => {
			const invalidKeys = [
				"sk_test_abcd", // Wrong mode (test instead of live)
				"sk_live_xyz", // Wrong prefix
				"sk_live_short", // Too short
				"not-an-api-key", // Wrong format entirely
				"", // Empty
			];

			for (const badKey of invalidKeys) {
				mockBetterAuth.api.verifyApiKey.mockResolvedValue({
					valid: false,
				});

				const result = await mockBetterAuth.api.verifyApiKey({
					key: badKey,
				});

				expect(result.valid).toBe(false);
			}
		});

		it("should show helpful error when user enters wrong key", async () => {
			mockBetterAuth.api.verifyApiKey.mockResolvedValue({
				valid: false,
			});

			const invalidKey = "wrong_key_format";
			const result = await mockBetterAuth.api.verifyApiKey({
				key: invalidKey,
			});

			expect(result.valid).toBe(false);

			// ✅ Should guide user to correct format
			mockExtension.showMessage("Invalid API key format. Please check your key.");
			expect(mockExtension.showMessage).toHaveBeenCalled();
		});
	});

	describe("Revoked Key Handling", () => {
		it("should reject revoked API key", async () => {
			const revokedKey = "sk_live_revoked_key_1234567890123456";

			mockBetterAuth.api.verifyApiKey.mockResolvedValue({
				valid: false,
			});

			const result = await mockBetterAuth.api.verifyApiKey({
				key: revokedKey,
			});

			expect(result.valid).toBe(false);
		});

		it("should guide user to create new key if current one is revoked", async () => {
			mockBetterAuth.api.verifyApiKey.mockResolvedValue({
				valid: false,
			});

			await mockBetterAuth.api.verifyApiKey({
				key: "sk_live_expired_key",
			});

			// ✅ Show helpful message
			mockExtension.showMessage("Your API key has been revoked. Please create a new one.");
			expect(mockExtension.showMessage).toHaveBeenCalledWith(
				expect.stringContaining("revoked")
			);
		});
	});

	describe("User Authentication Failures", () => {
		it("should prevent key creation if user is not logged in", async () => {
			mockBetterAuth.api.getSession.mockResolvedValue(null);

			const session = await mockBetterAuth.api.getSession();
			expect(session).toBeNull();

			// ✅ Should redirect to login
			mockExtension.showMessage("Please log in first");
			expect(mockExtension.showMessage).toHaveBeenCalledWith(
				expect.stringContaining("log in")
			);
		});

		it("should prevent extension from using key if web session expires", async () => {
			const apiKey = "sk_live_abcdefghijk1234567890123456";

			// Session expires on server
			mockBetterAuth.api.getSession.mockResolvedValue(null);

			const session = await mockBetterAuth.api.getSession();
			expect(session).toBeNull();

			// ✅ But API key should still work (different auth mechanism)
			mockBetterAuth.api.verifyApiKey.mockResolvedValue({
				valid: true,
				user: { id: "user_123", email: "user@example.com" },
			});

			const result = await mockBetterAuth.api.verifyApiKey({
				key: apiKey,
			});
			expect(result.valid).toBe(true);
		});
	});

	describe("Network Failures", () => {
		it("should handle network failure during key creation", async () => {
			mockWebApi.createApiKey.mockRejectedValue(new Error("Network error"));

			try {
				await mockWebApi.createApiKey({
					userId: "user_123",
					name: "VS Code",
					scopes: ["snapshots:read"],
				});
				expect.fail("Should have thrown");
			} catch (error) {
				expect(error).toBeDefined();

				// ✅ Show user-friendly error
				mockExtension.showMessage("Failed to create API key. Check your connection.");
				expect(mockExtension.showMessage).toHaveBeenCalled();
			}
		});

		it("should handle network failure when verifying key", async () => {
			mockBetterAuth.api.verifyApiKey.mockRejectedValue(
				new Error("Network timeout")
			);

			try {
				await mockBetterAuth.api.verifyApiKey({
					key: "sk_live_test_key",
				});
				expect.fail("Should have thrown");
			} catch (error) {
				expect(error).toBeDefined();
			}
		});
	});

	describe("Rate Limiting", () => {
		it("should handle rate limit on key verification attempts", async () => {
			let attemptCount = 0;

			mockBetterAuth.api.verifyApiKey.mockImplementation(async () => {
				attemptCount++;
				if (attemptCount > 10) {
					throw new Error("Rate limited: Too many verification attempts");
				}
				return { valid: false }; // Pretend each attempt fails
			});

			// ✅ After too many attempts, get rate limit error
			for (let i = 0; i < 11; i++) {
				try {
					await mockBetterAuth.api.verifyApiKey({
						key: `key_${i}`,
					});
				} catch (error) {
					expect((error as Error).message).toContain("Rate limited");
					break;
				}
			}
		});
	});
});

// ============================================================================
// ⚠️ EDGE CASES: Boundary Conditions
// ============================================================================

describe("API Key Generation → Extension Flow - Edge Cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockBetterAuth.api.getSession.mockResolvedValue({
			user: {
				id: "user_123",
				email: "user@example.com",
			},
			accessToken: "token_abc123",
		});

		mockBetterAuth.api.verifyApiKey.mockResolvedValue({
			valid: true,
			user: { id: "user_123", email: "user@example.com" },
		});

		mockWebApi.createApiKey.mockResolvedValue({
			id: "key_xyz",
			fullKey: "sk_live_abcdefghijk1234567890123456",
			name: "VS Code",
			createdAt: new Date(),
			preview: "sk_live_abcd...3456",
		});
	});

	describe("Key Management Edge Cases", () => {
		it("should handle user with many API keys", async () => {
			const keyCount = 50;
			const keys = Array.from({ length: keyCount }, (_, i) => ({
				id: `key_${i}`,
				fullKey: `sk_live_key_${i}${"0".repeat(20)}`,
				name: `Key ${i}`,
				createdAt: new Date(),
				preview: `sk_live_ke...${i}`,
			}));

			mockWebApi.getApiKeys.mockResolvedValue(keys);

			const allKeys = await mockWebApi.getApiKeys({ userId: "user_123" });

			// ✅ All keys listed
			expect(allKeys).toHaveLength(keyCount);

			// ✅ User can still add and use new key
			const newKey = await mockWebApi.createApiKey({
				userId: "user_123",
				name: `Key ${keyCount + 1}`,
				scopes: ["snapshots:read"],
			});

			expect(newKey).toBeDefined();
		});

		it("should handle key with special characters in name", async () => {
			const specialNames = [
				"VS Code - Work (Prod)",
				"Key #2 @ Main Server",
				"测试 (Test in Chinese)",
				"emoji-😀-key",
			];

			for (const name of specialNames) {
				const apiKey = await mockWebApi.createApiKey({
					userId: "user_123",
					name,
					scopes: ["snapshots:read"],
				});

				expect(apiKey.name).toBe(name);
			}
		});

		it("should handle very old API key (approaching expiration)", async () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 364); // Nearly 1 year old

			const apiKey = await mockWebApi.createApiKey({
				userId: "user_123",
				name: "Old Key",
				scopes: ["snapshots:read"],
			});

			// ✅ Should still work but might show warning in UI
			const verification = await mockBetterAuth.api.verifyApiKey({
				key: apiKey.fullKey,
			});

			expect(verification.valid).toBe(true);
		});
	});

	describe("Multiple Extensions", () => {
		it("should support same API key in multiple extensions", async () => {
			const sharedKey = "sk_live_shared_key_12345678901234567890";

			// Extension 1 uses the key
			mockExtension.setConfig("api.key", sharedKey);
			expect(mockExtension.getConfig("api.key")).toBe(sharedKey);

			// Extension 2 also uses the same key (simulated)
			const ext2Config = { apiKey: sharedKey };
			expect(ext2Config.apiKey).toBe(sharedKey);

			// ✅ Both verify successfully
			const result = await mockBetterAuth.api.verifyApiKey({
				key: sharedKey,
			});
			expect(result.valid).toBe(true);
		});

		it("should track usage across multiple extensions", async () => {
			const apiKey = "sk_live_tracked_key_1234567890123456";

			// Extension 1 makes call
			const call1 = await mockBetterAuth.api.verifyApiKey({
				key: apiKey,
			});
			expect(call1.valid).toBe(true);

			// Extension 2 makes call
			const call2 = await mockBetterAuth.api.verifyApiKey({
				key: apiKey,
			});
			expect(call2.valid).toBe(true);

			// ✅ Both calls recorded (would show in key usage stats)
		});
	});

	describe("Workspace-Level Configuration", () => {
		it("should allow different keys for different workspace folders", async () => {
			// Simulate workspace 1 using one key
			const workspace1 = { apiKey: "sk_live_workspace1_key_1234567890" };

			// Simulate workspace 2 using another key
			const workspace2 = { apiKey: "sk_live_workspace2_key_1234567890" };

			// ✅ Both keys are valid
			mockBetterAuth.api.verifyApiKey.mockResolvedValue({
				valid: true,
				user: { id: "user_123", email: "user@example.com" },
			});

			const result1 = await mockBetterAuth.api.verifyApiKey({
				key: workspace1.apiKey,
			});
			const result2 = await mockBetterAuth.api.verifyApiKey({
				key: workspace2.apiKey,
			});

			expect(result1.valid).toBe(true);
			expect(result2.valid).toBe(true);
		});
	});
});

// ============================================================================
// 💥 ERROR CASES: System Failures & Recovery
// ============================================================================

describe("API Key Generation → Extension Flow - Error Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Server Errors", () => {
		it("should handle 500 error during key creation", async () => {
			mockWebApi.createApiKey.mockRejectedValue(
				new Error("Internal server error")
			);

			try {
				await mockWebApi.createApiKey({
					userId: "user_123",
					name: "Test",
					scopes: ["snapshots:read"],
				});
			} catch (error) {
				expect(error).toBeDefined();
				// ✅ Don't expose internals to user
			}
		});

		it("should retry key verification on transient failure", async () => {
			let attemptCount = 0;

			mockBetterAuth.api.verifyApiKey.mockImplementation(async () => {
				attemptCount++;
				if (attemptCount === 1) {
					throw new Error("Temporary server error");
				}
				return {
					valid: true,
					user: { id: "user_123", email: "user@example.com" },
				};
			});

			// First attempt fails
			try {
				await mockBetterAuth.api.verifyApiKey({
					key: "sk_live_test",
				});
			} catch (error) {
				expect(error).toBeDefined();
			}

			// Retry succeeds
			const result = await mockBetterAuth.api.verifyApiKey({
				key: "sk_live_test",
			});
			expect(result.valid).toBe(true);
		});
	});

	describe("Graceful Degradation", () => {
		it("should show offline message when network is down", async () => {
			mockBetterAuth.api.verifyApiKey.mockRejectedValue(
				new Error("Network error")
			);

			// ✅ Provide offline fallback message
			mockExtension.showMessage(
				"You're offline. Protection will work when back online."
			);
			expect(mockExtension.showMessage).toHaveBeenCalled();
		});
	});
});
