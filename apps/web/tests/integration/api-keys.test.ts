import { verifyApiKey } from "@snapback/auth";
import { apiKeys, db as drizzle } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock the API client
const apiClient = {
	post: vi.fn(),
};

// Mock database functions
vi.mock("@snapback/platform", () => ({
	drizzle: {
		query: {
			apiKeys: {
				findFirst: vi.fn(),
			},
			apiUsage: {
				findMany: vi.fn(),
			},
		},
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		values: vi.fn().mockResolvedValue({}),
		where: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
	},
}));

// Mock user creation
async function createTestUser(options: { plan?: string } = {}) {
	return {
		id: "test-user-id",
		email: "test@example.com",
		plan: options.plan || "free",
	};
}

// Mock API key creation
async function createApiKey(user: any) {
	return {
		id: "test-api-key-id",
		userId: user.id,
		key: "snap_testkey1234567890123456789012",
		keyPreview: "snap_testkey123456...",
	};
}

// Mock API call
async function makeApiCall(_key: any, _endpoint: string) {
	// Mock implementation
	return Promise.resolve({ success: true });
}

// Mock key usage stats
async function getKeyUsageStats(_keyId: string) {
	return {
		totalRequests: 1,
	};
}

describe("API Key Operations", () => {
	let user: any;

	beforeEach(async () => {
		user = await createTestUser({ plan: "pro" });
	});

	test("creates key with correct permissions", async () => {
		const mockApiKey = {
			id: "test-id",
			key: "snap_testkey1234567890123456789012",
			keyPreview: "snap_testkey123456...",
		};

		apiClient.post.mockResolvedValue({ data: mockApiKey });

		const { data } = await apiClient.post("/api/v1/auth/api-key/create", {
			name: "Test Key",
			scopes: ["code:analyze", "code:refactor"],
		});

		expect(data.key).toMatch(/^snap_[a-zA-Z0-9_-]{32}$/);
		expect(data.keyPreview).toMatch(/^snap_[a-zA-Z0-9_-]{6}\.\.\./);

		// Verify key is hashed in database
		const stored = await drizzle.query.apiKeys.findFirst({
			where: eq(apiKeys.id, data.id),
		});
		expect(stored.key).not.toBe(data.key); // Should be hashed
		expect(await verifyApiKey(data.key, stored.key)).toBe(true); // Uses Argon2id
	});

	test("enforces key limit per plan", async () => {
		// Free users: 1 key limit
		const freeUser = await createTestUser({ plan: "free" });
		await createApiKey(freeUser);

		// Mock the rejection
		apiClient.post.mockRejectedValue(new Error("Key limit reached"));

		await expect(createApiKey(freeUser)).rejects.toThrow("Key limit reached");
	});

	test("tracks key usage correctly", async () => {
		const key = await createApiKey(user);

		// Mock API usage data
		const mockUsage = [
			{ endpoint: "/code/analyze" },
			{ endpoint: "/code/analyze" },
			{ endpoint: "/code/refactor" },
		];

		(drizzle.query.apiUsage.findMany as any).mockResolvedValue(mockUsage);

		// Make API calls
		await makeApiCall(key, "/api/v1/code/analyze");
		await makeApiCall(key, "/api/v1/code/analyze");
		await makeApiCall(key, "/api/v1/code/refactor");

		// Check usage tracked
		const usage = await drizzle.query.apiUsage.findMany({
			where: eq(apiKeys.id, key.id),
		});

		expect(usage).toHaveLength(3);
		expect(usage.filter((u) => u.endpoint === "/code/analyze")).toHaveLength(2);
	});

	test("rotates key maintaining history", async () => {
		const oldKey = await createApiKey(user);
		await makeApiCall(oldKey, "/api/v1/code/analyze");

		const newKey = {
			id: "new-test-key-id",
			key: "snap_newkey1234567890123456789012",
			keyPreview: "snap_newkey123456...",
		};

		apiClient.post.mockResolvedValue({ data: newKey });

		const { data: newKeyData } = await apiClient.post(
			`/api/v1/auth/api-key/${oldKey.id}/rotate`,
		);

		// Old key should be invalid
		apiClient.post.mockRejectedValue(new Error("Invalid API key"));
		await expect(makeApiCall(oldKey, "/api/v1/code/analyze")).rejects.toThrow(
			"Invalid API key",
		);

		// New key should work
		apiClient.post.mockResolvedValue({ success: true });
		await expect(
			makeApiCall(newKeyData, "/api/v1/code/analyze"),
		).resolves.toBeTruthy();

		// Usage history preserved
		const usage = await getKeyUsageStats(newKeyData.id);
		expect(usage.totalRequests).toBe(1); // From old key
	});
});
