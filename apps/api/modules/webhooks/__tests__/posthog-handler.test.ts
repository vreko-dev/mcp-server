import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
	type PostHogHandlerDependencies,
	handlePostHogWebhook,
} from "../posthog-handler";

// Helper to create mock request
function createMockRequest(body: any, headers: Record<string, string> = {}) {
	return new Request("https://api.snapback.dev/webhooks/posthog", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
	});
}

// Helper to calculate signature
function calculateSignature(body: any, secret: string) {
	return (
		"sha256=" +
		crypto
			.createHmac("sha256", secret)
			.update(JSON.stringify(body))
			.digest("hex")
	);
}

describe("handlePostHogWebhook", () => {
	const mockLogger = {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};

	const mockEmailOrchestrator = {
		enqueueCampaignEmails: vi.fn(),
	};

	const defaultDeps: PostHogHandlerDependencies = {
		logger: mockLogger,
		emailOrchestrator: mockEmailOrchestrator,
		webhookSecret: "test-secret",
	};

	it("should return 401 if signature is missing when secret is configured", async () => {
		const req = createMockRequest({ some: "data" });
		const res = await handlePostHogWebhook(req, defaultDeps);

		expect(res.status).toBe(401);
		expect(await res.text()).toBe("Missing signature");
		expect(mockLogger.warn).toHaveBeenCalledWith(
			"PostHog webhook missing signature",
		);
	});

	it("should return 401 if signature is invalid", async () => {
		const req = createMockRequest(
			{ some: "data" },
			{ "X-Hub-Signature": "sha256=invalid" },
		);
		const res = await handlePostHogWebhook(req, defaultDeps);

		expect(res.status).toBe(401);
		expect(await res.text()).toBe("Invalid signature");
		expect(mockLogger.warn).toHaveBeenCalledWith(
			"PostHog webhook invalid signature",
		);
	});

	it("should return 400 if payload is invalid JSON", async () => {
		const req = new Request("https://api.snapback.dev/webhooks/posthog", {
			method: "POST",
			body: "invalid-json",
			headers: {
				"X-Hub-Signature": calculateSignature("invalid-json", "test-secret"),
			},
		});

		// Note: We need to bypass the signature check helper for this one case where body isn't JSON
		// Or we can just calculate signature for the string "invalid-json"
		// But in the implementation, we read text() first, verify signature, THEN parse.
		// So we actually need to validly sign the invalid json string.

		const signature =
			"sha256=" +
			crypto
				.createHmac("sha256", "test-secret")
				.update("invalid-json")
				.digest("hex");

		const reqInvalid = new Request(
			"https://api.snapback.dev/webhooks/posthog",
			{
				method: "POST",
				body: "invalid-json",
				headers: {
					"X-Hub-Signature": signature,
				},
			},
		);

		const res = await handlePostHogWebhook(reqInvalid, defaultDeps);

		expect(res.status).toBe(400); // Or whatever the JSON.parse error block returns
		expect(await res.text()).toBe("Invalid JSON");
	});

	it("should return 400 if payload format is invalid (missing event/person)", async () => {
		const payload = { event: "something" }; // Missing person
		const signature = calculateSignature(payload, "test-secret");
		const req = createMockRequest(payload, { "X-Hub-Signature": signature });

		const res = await handlePostHogWebhook(req, defaultDeps);

		expect(res.status).toBe(400);
		expect(await res.text()).toBe("Invalid payload format");
	});

	it("should process valid event and trigger email campaign", async () => {
		const payload = {
			event: "signup_completed",
			person: { distinct_ids: ["user_123"] },
			uuid: "evt_1",
		};
		const signature = calculateSignature(payload, "test-secret");
		const req = createMockRequest(payload, { "X-Hub-Signature": signature });

		const res = await handlePostHogWebhook(req, defaultDeps);

		expect(res.status).toBe(200);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Received PostHog event: signup_completed",
			expect.any(Object),
		);
		expect(mockEmailOrchestrator.enqueueCampaignEmails).toHaveBeenCalledWith(
			"welcome_series",
			{ id: "user_123" },
		);
	});

	it("should handle cohort entry event for Trial At Risk", async () => {
		const payload = {
			event: "user_entered_cohort",
			properties: { cohort_name: "Trial At Risk" },
			person: { distinct_ids: ["user_123"] },
			uuid: "evt_2",
		};
		const signature = calculateSignature(payload, "test-secret");
		const req = createMockRequest(payload, { "X-Hub-Signature": signature });

		const res = await handlePostHogWebhook(req, defaultDeps);

		expect(res.status).toBe(200);
		expect(mockEmailOrchestrator.enqueueCampaignEmails).toHaveBeenCalledWith(
			"trial_at_risk",
			{ id: "user_123" },
		);
	});

	it("should handle error gracefully", async () => {
		const payload = {
			event: "signup_completed",
			person: { distinct_ids: ["user_123"] },
		};
        const signature = calculateSignature(payload, "test-secret");
		const req = createMockRequest(payload, { "X-Hub-Signature": signature });

		// Simulate error in orchestrator
		mockEmailOrchestrator.enqueueCampaignEmails.mockRejectedValueOnce(
			new Error("Orchestrator failed"),
		);

		const res = await handlePostHogWebhook(req, defaultDeps);

		expect(res.status).toBe(500);
		expect(await res.text()).toBe("Internal Server Error");
		expect(mockLogger.error).toHaveBeenCalledWith(
			"Error handling PostHog webhook",
			expect.objectContaining({ error: "Orchestrator failed" }),
		);
	});
});
