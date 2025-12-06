/**
 * API Key Scope Middleware Integration Tests
 *
 * Tests database-backed API key permission validation.
 * Following TDD: RED -> GREEN -> REFACTOR
 *
 * Run with: pnpm test:integration
 */

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../../src/services/database";
import { apiKeyScopeMiddleware } from "../../../src/middleware/security-api-key-scope";

describe("API Key Scope Middleware Integration", () => {
	let testApiKeyId: string;
	const db = getDb();

	beforeEach(async () => {
		// Create test API key with permissions
		const [inserted] = await db
			.insert(db._.schema.apiKeys)
			.values({
				userId: "test-user-id",
				name: "Test Key",
				key: "hashed-key-value",
				keyPreview: "sk_test",
				permissions: {
					cloudBackup: true,
					advancedDetection: false,
					customRules: true,
					teamSharing: false,
					maxSnapshots: 100,
				},
			})
			.returning({ id: db._.schema.apiKeys.id });

		testApiKeyId = inserted.id;
	});

	afterEach(async () => {
		// Cleanup
		await db.delete(db._.schema.apiKeys).where(eq(db._.schema.apiKeys.id, testApiKeyId));
	});

	it("should allow access with sufficient permissions", async () => {
		const middleware = apiKeyScopeMiddleware(["snapshots:backup", "snapshots:read"]);

		const mockContext = {
			req: {
				header: (name: string) => {
					if (name === "Authorization") {
						return `Bearer ${testApiKeyId}`;
					}
					return undefined;
				},
				path: "/test",
			},
			set: (key: string, value: any) => {
				// Store context
			},
		};

		let nextCalled = false;
		const mockNext = async () => {
			nextCalled = true;
		};

		await middleware(mockContext as any, mockNext);
		expect(nextCalled).toBe(true);
	});

	it("should deny access with insufficient permissions", async () => {
		const middleware = apiKeyScopeMiddleware(["detection:advanced"]);

		const mockContext = {
			req: {
				header: (name: string) => {
					if (name === "Authorization") {
						return `Bearer ${testApiKeyId}`;
					}
					return undefined;
				},
				path: "/test",
			},
			set: (key: string, value: any) => {},
		};

		const mockNext = async () => {
			throw new Error("Next should not be called");
		};

		await expect(middleware(mockContext as any, mockNext)).rejects.toThrow();
	});

	it("should reject revoked API keys", async () => {
		// Revoke the key
		await db
			.update(db._.schema.apiKeys)
			.set({ revokedAt: new Date() })
			.where(eq(db._.schema.apiKeys.id, testApiKeyId));

		const middleware = apiKeyScopeMiddleware(["snapshots:read"]);

		const mockContext = {
			req: {
				header: (name: string) => {
					if (name === "Authorization") {
						return `Bearer ${testApiKeyId}`;
					}
					return undefined;
				},
				path: "/test",
			},
			set: (key: string, value: any) => {},
		};

		const mockNext = async () => {
			throw new Error("Next should not be called");
		};

		await expect(middleware(mockContext as any, mockNext)).rejects.toThrow("revoked");
	});

	it("should reject expired API keys", async () => {
		// Expire the key
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		await db
			.update(db._.schema.apiKeys)
			.set({ expiresAt: yesterday })
			.where(eq(db._.schema.apiKeys.id, testApiKeyId));

		const middleware = apiKeyScopeMiddleware(["snapshots:read"]);

		const mockContext = {
			req: {
				header: (name: string) => {
					if (name === "Authorization") {
						return `Bearer ${testApiKeyId}`;
					}
					return undefined;
				},
				path: "/test",
			},
			set: (key: string, value: any) => {},
		};

		const mockNext = async () => {
			throw new Error("Next should not be called");
		};

		await expect(middleware(mockContext as any, mockNext)).rejects.toThrow("expired");
	});

	it("should reject invalid API key format", async () => {
		const middleware = apiKeyScopeMiddleware(["snapshots:read"]);

		const mockContext = {
			req: {
				header: (name: string) => {
					if (name === "Authorization") {
						return "Bearer short"; // Too short
					}
					return undefined;
				},
				path: "/test",
			},
			set: (key: string, value: any) => {},
		};

		const mockNext = async () => {
			throw new Error("Next should not be called");
		};

		await expect(middleware(mockContext as any, mockNext)).rejects.toThrow("Invalid API key format");
	});

	it("should reject missing Authorization header", async () => {
		const middleware = apiKeyScopeMiddleware(["snapshots:read"]);

		const mockContext = {
			req: {
				header: (name: string) => undefined,
				path: "/test",
			},
			set: (key: string, value: any) => {},
		};

		const mockNext = async () => {
			throw new Error("Next should not be called");
		};

		await expect(middleware(mockContext as any, mockNext)).rejects.toThrow(
			"Missing or invalid API key",
		);
	});

	it("should convert permissions to scopes correctly", async () => {
		const middleware = apiKeyScopeMiddleware(["rules:custom"]);

		const mockContext = {
			req: {
				header: (name: string) => {
					if (name === "Authorization") {
						return `Bearer ${testApiKeyId}`;
					}
					return undefined;
				},
				path: "/test",
			},
			set: (key: string, value: any) => {},
		};

		let nextCalled = false;
		const mockNext = async () => {
			nextCalled = true;
		};

		await middleware(mockContext as any, mockNext);
		expect(nextCalled).toBe(true);
	});
});
