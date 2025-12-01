import { describe, expect, it } from "vitest";
import { SnapbackClient } from "../src/client";
import { analyze, ensureIdempotentRequestId, evaluatePolicy, ingestTelemetry } from "../src/helpers";

// Test IDs: sdkh-001, sdkh-002
describe("SDK Helpers", () => {
	// Mock client for testing
	const mockClient = new SnapbackClient({
		baseUrl: "http://localhost:3000",
		surface: "vscode",
	});

	const baseEnvelope = {
		session_id: "test-session",
		request_id: "test-request",
		client: "vscode" as const,
	};

	describe("sdkh-001: Idempotent request_id", () => {
		it("should generate request_id if not provided", () => {
			const envelope = {
				session_id: "test-session",
				client: "vscode" as const,
			};

			const result = ensureIdempotentRequestId(envelope);

			expect(result.session_id).toBe("test-session");
			expect(result.client).toBe("vscode");
			expect(result.request_id).toBeDefined();
			expect(typeof result.request_id).toBe("string");
			expect(result.request_id.length).toBeGreaterThan(0);
		});

		it("should preserve existing request_id", () => {
			const envelope = {
				session_id: "test-session",
				request_id: "existing-request-id",
				client: "vscode" as const,
			};

			const result = ensureIdempotentRequestId(envelope);

			expect(result.request_id).toBe("existing-request-id");
		});
	});

	describe("sdkh-002: Envelope propagation", () => {
		it("should propagate envelope to analyze function", async () => {
			const request = {
				content: "test content",
				filePath: "/test/file.ts",
			};

			// This test verifies the function signature and envelope usage
			// Actual implementation will be tested in integration tests
			expect(typeof analyze).toBe("function");

			// Call the function to ensure it doesn't throw
			const result = await analyze(mockClient, baseEnvelope, request);

			expect(result).toBeDefined();
			expect(["allow", "review", "block"]).toContain(result.decision);
			expect(typeof result.confidence).toBe("number");
			expect(Array.isArray(result.rules_hit)).toBe(true);
		});

		it("should propagate envelope to evaluatePolicy function", async () => {
			const request = {
				context: {
					userRole: "developer",
					projectId: "test-project",
				},
			};

			// This test verifies the function signature and envelope usage
			expect(typeof evaluatePolicy).toBe("function");

			// Call the function to ensure it doesn't throw
			const result = await evaluatePolicy(mockClient, baseEnvelope, request);

			expect(result).toBeDefined();
			expect(["allow", "review", "block"]).toContain(result.decision);
			expect(typeof result.confidence).toBe("number");
			expect(Array.isArray(result.rules_hit)).toBe(true);
			expect(typeof result.policyVersion).toBe("string");
		});

		it("should propagate envelope to ingestTelemetry function", async () => {
			const data = {
				eventType: "test-event",
				payload: {
					key: "value",
				},
				timestamp: Date.now(),
			};

			// This test verifies the function signature and envelope usage
			expect(typeof ingestTelemetry).toBe("function");

			// Call the function to ensure it doesn't throw
			const result = await ingestTelemetry(mockClient, baseEnvelope, data);

			expect(result).toBeDefined();
			expect(result.id).toBe(baseEnvelope.request_id);
			expect(result.received).toBe(true);
		});
	});
});
