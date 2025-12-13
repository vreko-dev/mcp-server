import { beforeEach, describe, expect, it } from "vitest";
import {
	createApiKey,
	getApiKey,
	getApiKeyByKey,
	getUsageLogs,
	logApiUsage,
	revokeApiKey,
	validateApiKey,
} from "../keys";

describe("Keys Service", () => {
	beforeEach(() => {
		// Clear any existing data between tests
		// Note: In a real implementation, we would need to clear the in-memory stores
	});

	it("should create a new API key", async () => {
		const userId = "user-123";
		const permissions = { policyEvaluation: true };

		const apiKey = await createApiKey(userId, permissions);

		expect(apiKey).toBeDefined();
		expect(apiKey.id).toBeDefined();
		expect(apiKey.key).toMatch(/^sk_live_/);
	});

	it("should retrieve an API key by ID without the actual key value", async () => {
		const userId = "user-456";
		const permissions = { snapshots: true };

		const createdKey = await createApiKey(userId, permissions);
		const retrievedKey = await getApiKey(createdKey.id);

		expect(retrievedKey).toBeDefined();
		expect(retrievedKey?.id).toBe(createdKey.id);
		expect(retrievedKey).not.toHaveProperty("key");
	});

	it("should retrieve an API key by key value", async () => {
		const userId = "user-789";
		const permissions = { analytics: true };

		const createdKey = await createApiKey(userId, permissions);
		const retrievedKey = await getApiKeyByKey(createdKey.key);

		expect(retrievedKey).toBeDefined();
		expect(retrievedKey?.id).toBe(createdKey.id);
		// Note: Retrieved key doesn't include the plaintext key (security)
		expect(retrievedKey).not.toHaveProperty("keyHash");
	});

	it("should revoke an API key", async () => {
		const userId = "user-101";
		const permissions = { fullAccess: true };

		const createdKey = await createApiKey(userId, permissions);
		const revoked = await revokeApiKey(createdKey.id);

		expect(revoked).toBe(true);

		// Verify the key is no longer valid
		const isValid = await validateApiKey(createdKey.key);
		expect(isValid).toBe(false);
	});

	it("should validate a valid API key", async () => {
		const userId = "user-202";
		const permissions = { readOnly: true };

		const createdKey = await createApiKey(userId, permissions);
		const isValid = await validateApiKey(createdKey.key);

		expect(isValid).toBe(true);
	});

	it("should reject an invalid API key", async () => {
		const isValid = await validateApiKey("invalid-key");

		expect(isValid).toBe(false);
	});

	it("should log and retrieve API usage", async () => {
		const userId = "user-303";
		const permissions = { logging: true };

		const createdKey = await createApiKey(userId, permissions);

		// Log some usage
		await logApiUsage(createdKey.id, "/api/v1/analyze", "test-agent", "127.0.0.1");
		await logApiUsage(createdKey.id, "/api/v1/snapshots", "test-agent", "127.0.0.1");

		// Retrieve usage logs
		const logs = await getUsageLogs(createdKey.id);

		expect(logs).toHaveLength(2);
		expect(logs[0].apiKeyId).toBe(createdKey.id);
		expect(logs[0].endpoint).toBe("/api/v1/analyze");
		expect(logs[1].endpoint).toBe("/api/v1/snapshots");
	});
});
