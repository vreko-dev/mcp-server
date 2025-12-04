import { beforeEach, describe, expect, it } from "vitest";
import {
	createApiKey,
	flushUsageLogs,
	getApiKey,
	getApiKeyByKey,
	getUsageLogs,
	logApiUsage,
	revokeApiKey,
	validateApiKey,
} from "../keys";

describe("AUTH1: Key service (in-memory) + usage audit (buffered)", () => {
	beforeEach(() => {
		// Clear the in-memory stores before each test
		// We'll need to access the internal stores for this
		// In a real implementation, we might want to expose a clear function for testing
	});

	it("keys-001: should create a new API key that shows once with the full key value", async () => {
		const userId = "user-123";
		const permissions = { policyEvaluation: true };

		// Create a new API key
		const apiKey = await createApiKey(userId, permissions);

		// Verify the key object has all required properties
		expect(apiKey).toBeDefined();
		expect(apiKey.id).toBeDefined();
		expect(apiKey.key).toBeDefined();
		expect(apiKey.key).toMatch(/^sb_live_/); // Should start with sb_live_
		expect(apiKey.userId).toBe(userId);
		expect(apiKey.createdAt).toBeInstanceOf(Date);
		expect(apiKey.permissions).toEqual(permissions);
		expect(apiKey.revokedAt).toBeUndefined();
		expect(apiKey.expiresAt).toBeUndefined();
		expect(apiKey.lastUsedAt).toBeUndefined();

		// Verify we can retrieve the key without the actual key value
		const retrievedKey = await getApiKey(apiKey.id);
		expect(retrievedKey).toBeDefined();
		expect(retrievedKey?.id).toBe(apiKey.id);
		expect(retrievedKey).not.toHaveProperty("key"); // Should not include the actual key

		// Verify we can retrieve the key by the key value
		const retrievedByKey = await getApiKeyByKey(apiKey.key);
		expect(retrievedByKey).toBeDefined();
		expect(retrievedByKey?.id).toBe(apiKey.id);
		expect(retrievedByKey?.key).toBe(apiKey.key);
	});

	it("keys-002: should revoke an API key and make it invalid within 60s (mock clock)", async () => {
		const userId = "user-456";
		const permissions = { policyEvaluation: false };

		// Create a new API key
		const apiKey = await createApiKey(userId, permissions);

		// Verify the key is initially valid
		const isValidBefore = await validateApiKey(apiKey.key);
		expect(isValidBefore).toBe(true);

		// Revoke the API key
		const revoked = await revokeApiKey(apiKey.id);
		expect(revoked).toBe(true);

		// Verify the key is no longer valid
		const isValidAfter = await validateApiKey(apiKey.key);
		expect(isValidAfter).toBe(false);

		// Verify the revokedAt timestamp is set
		const retrievedKey = await getApiKey(apiKey.id);
		expect(retrievedKey?.revokedAt).toBeInstanceOf(Date);
	});

	it("should log API usage and retrieve logs", async () => {
		const userId = "user-789";
		const permissions = { policyEvaluation: true };

		// Create a new API key
		const apiKey = await createApiKey(userId, permissions);

		// Log some API usage
		await logApiUsage(apiKey.id, "/api/v1/analyze", "test-agent", "127.0.0.1");
		await logApiUsage(
			apiKey.id,
			"/api/v1/policy/evaluate",
			"test-agent",
			"127.0.0.1",
		);

		// Retrieve usage logs
		const logs = await getUsageLogs(apiKey.id);
		expect(logs).toHaveLength(2);

		// Verify log properties
		expect(logs[0].apiKeyId).toBe(apiKey.id);
		expect(logs[0].endpoint).toBe("/api/v1/analyze");
		expect(logs[0].userAgent).toBe("test-agent");
		expect(logs[0].ipAddress).toBe("127.0.0.1");
		expect(logs[0].timestamp).toBeInstanceOf(Date);

		expect(logs[1].apiKeyId).toBe(apiKey.id);
		expect(logs[1].endpoint).toBe("/api/v1/policy/evaluate");

		// Flush logs and verify they're cleared
		await flushUsageLogs();
		const logsAfterFlush = await getUsageLogs(apiKey.id);
		expect(logsAfterFlush).toHaveLength(0);
	});

	it("should handle expired API keys correctly", async () => {
		const userId = "user-101";
		const permissions = { policyEvaluation: true };
		const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

		// Create a new expired API key
		const apiKey = await createApiKey(userId, permissions, expiresAt);

		// Verify the key is not valid due to expiration
		const isValid = await validateApiKey(apiKey.key);
		expect(isValid).toBe(false);
	});

	it("should update lastUsedAt when validating a key", async () => {
		const userId = "user-202";
		const permissions = { policyEvaluation: true };

		// Create a new API key
		const apiKey = await createApiKey(userId, permissions);

		// Verify lastUsedAt is initially undefined
		const initialKey = await getApiKey(apiKey.id);
		expect(initialKey?.lastUsedAt).toBeUndefined();

		// Validate the key
		await validateApiKey(apiKey.key);

		// Verify lastUsedAt is now set
		const updatedKey = await getApiKey(apiKey.id);
		expect(updatedKey?.lastUsedAt).toBeInstanceOf(Date);
	});
});
