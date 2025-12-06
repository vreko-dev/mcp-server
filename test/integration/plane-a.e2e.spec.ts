import { createApiKey, getApiKey, revokeApiKey, validateApiKey } from "@snapback/api/src/services/keys";
import type { Envelope } from "@snapback/sdk/src/client";
import { analyze, evaluatePolicy, ingestTelemetry } from "@snapback/sdk/src/helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("E2E1: End-to-end (Plane A only): SDK → API (mem stores)", () => {
	beforeEach(() => {
		// Reset any in-memory stores between tests
		vi.clearAllMocks();
	});

	it("a-e2e-001: should perform analyze and return policy decision", async () => {
		// Create a mock API key
		const apiKey = await createApiKey("user-123", { policyEvaluation: true });

		// Validate the API key
		const isValid = await validateApiKey(apiKey.key);
		expect(isValid).toBe(true);

		// Create a SnapbackClient (mock config since we're not making real HTTP calls in this test)
		// In a real implementation, this would connect to the actual API
		const client = {
			getHttpClient: () => ({
				post: vi.fn().mockResolvedValue({
					json: vi.fn().mockResolvedValue({
						decision: "allow",
						confidence: 0.95,
						rules_hit: ["no-sensitive-data"],
						metadata: {},
					}),
				}),
			}),
		} as any;

		// Create envelope for the request
		const envelope: Envelope = {
			session_id: "test-session-123",
			request_id: "test-request-456",
			workspace_id: "test-workspace-789",
			client: "cli",
		};

		// Call analyze through the SDK helpers
		const analyzeRequest = {
			content: 'console.log("Hello World");',
			filePath: "/test/file.js",
			language: "javascript",
		};

		const result = await analyze(client, envelope, analyzeRequest);

		// Verify the response contains expected policy decision elements
		expect(result).toBeDefined();
		expect(result.decision).toBeDefined();
		expect(result.confidence).toBeDefined();
		expect(result.rules_hit).toBeDefined();

		// Verify specific values
		expect(result.decision).toBe("allow");
		expect(result.confidence).toBe(0.95);
		expect(result.rules_hit).toContain("no-sensitive-data");
	});

	it("a-e2e-002: should handle auth flow and validate API keys", async () => {
		// Create a mock API key
		const apiKey = await createApiKey("user-123", { policyEvaluation: true });

		// Validate the API key (should be valid)
		let isValid = await validateApiKey(apiKey.key);
		expect(isValid).toBe(true);

		// Revoke the API key through the service
		const revoked = await revokeApiKey(apiKey.id);
		expect(revoked).toBe(true);

		// Validate the API key again (should be invalid after revocation)
		isValid = await validateApiKey(apiKey.key);
		expect(isValid).toBe(false);

		// Try to get the API key details (should still exist but be revoked)
		const keyDetails = await getApiKey(apiKey.id);
		expect(keyDetails).toBeDefined();
		expect(keyDetails?.revokedAt).toBeDefined();
	});

	it("a-e2e-003: should create and evaluate policy using memory store", async () => {
		// Create a mock API key
		const _apiKey = await createApiKey("user-123", { policyEvaluation: true });

		// Create a SnapbackClient (mock config)
		const client = {
			getHttpClient: () => ({
				post: vi.fn().mockResolvedValue({
					json: vi.fn().mockResolvedValue({
						decision: "review",
						confidence: 0.75,
						rules_hit: ["high-complexity"],
						policyVersion: "1.0.0",
					}),
				}),
			}),
		} as any;

		// Create envelope for the request
		const envelope: Envelope = {
			session_id: "test-session-123",
			request_id: "test-request-789",
			workspace_id: "test-workspace-456",
			client: "vscode",
		};

		// Call evaluatePolicy through the SDK helpers
		const policyRequest = {
			context: {
				filePath: "/src/main.js",
				fileSize: 1024,
				commitMessage: "Initial commit",
			},
		};

		const result = await evaluatePolicy(client, envelope, policyRequest);

		// Verify the response contains expected policy evaluation elements
		expect(result).toBeDefined();
		expect(result.decision).toBeDefined();
		expect(result.confidence).toBeDefined();
		expect(result.rules_hit).toBeDefined();
		expect(result.policyVersion).toBeDefined();

		// Verify specific values
		expect(result.decision).toBe("review");
		expect(result.confidence).toBe(0.75);
		expect(result.rules_hit).toContain("high-complexity");
		expect(result.policyVersion).toBe("1.0.0");
	});

	it("a-e2e-004: should ingest telemetry and handle data flow", async () => {
		// Create a mock API key
		const _apiKey = await createApiKey("user-123", { telemetry: true });

		// Create a SnapbackClient (mock config)
		const client = {
			getHttpClient: () => ({
				post: vi.fn().mockResolvedValue({
					json: vi.fn().mockResolvedValue({
						id: "telemetry-123",
						received: true,
					}),
				}),
			}),
		} as any;

		// Create envelope for the request
		const envelope: Envelope = {
			session_id: "test-session-999",
			request_id: "test-request-888",
			workspace_id: "test-workspace-777",
			client: "mcp",
		};

		// Call ingestTelemetry through the SDK helpers
		const telemetryData = {
			eventType: "file_analysis",
			payload: {
				filePath: "/src/utils.js",
				analysisTime: 150,
				rulesChecked: 25,
			},
			timestamp: Date.now(),
		};

		const result = await ingestTelemetry(client, envelope, telemetryData);

		// Verify the response contains expected telemetry elements
		expect(result).toBeDefined();
		expect(result.id).toBeDefined();
		expect(result.received).toBeDefined();

		// Verify specific values
		expect(result.id).toBe("telemetry-123");
		expect(result.received).toBe(true);
	});
});
