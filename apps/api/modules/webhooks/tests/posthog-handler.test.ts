import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handlePostHogWebhook } from "../posthog-handler";

// Mock the HubSpot service
vi.mock("../hubspot-service", () => ({
	createOrUpdateHubSpotContact: vi.fn().mockResolvedValue("contact_123"),
	triggerHubSpotWorkflow: vi.fn().mockResolvedValue(true),
	addContactToList: vi.fn().mockResolvedValue(true),
}));

// Mock the email orchestrator
vi.mock("../email-orchestrator", () => {
	const mockEnqueueCampaignEmails = vi.fn().mockResolvedValue(undefined);
	const mockProcessEmailQueue = vi.fn().mockResolvedValue(undefined);

	return {
		EmailOrchestrator: vi.fn().mockImplementation(() => ({
			enqueueCampaignEmails: mockEnqueueCampaignEmails,
			processEmailQueue: mockProcessEmailQueue,
		})),
	};
});

// Mock the database
vi.mock("@snapback/platform", () => {
	const mockUsersResult = [{ id: "user_123", email: "test@example.com", name: "Test User" }];
	const mockSubscriptionsResult = [{ userId: "user_123", plan: "free", status: "active" }];

	const mockSelect = vi.fn().mockReturnThis();
	const mockFrom = vi.fn().mockReturnThis();
	const mockWhere = vi.fn().mockReturnThis();
	const mockLimit = vi.fn();

	// Mock the chained methods to return appropriate data
	mockFrom.mockImplementation((table) => {
		mockWhere.mockImplementation(() => {
			mockLimit.mockImplementation(() => {
				if (table.name === "user") {
					return Promise.resolve(mockUsersResult);
				}
				if (table.name === "subscriptions") {
					return Promise.resolve(mockSubscriptionsResult);
				}
				return Promise.resolve([]);
			});
			return { limit: mockLimit };
		});
		return { where: mockWhere };
	});

	return {
		drizzle: {
			db: {
				select: mockSelect,
				from: mockFrom,
			},
		},
	};
});

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("PostHog Webhook Handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set environment variables for testing
		process.env.HUBSPOT_ACCESS_TOKEN = "test-token";
	});

	afterEach(() => {
		// Clean up environment variables
		delete process.env.HUBSPOT_ACCESS_TOKEN;
		delete process.env.POSTHOG_WEBHOOK_SECRET;
	});

	it("should return 400 for invalid event format", async () => {
		const mockRequest = new Request("https://example.com/webhook", {
			method: "POST",
			body: JSON.stringify({ invalid: "data" }),
			headers: {
				"Content-Type": "application/json",
			},
		}) as unknown as NextRequest;

		const response = await handlePostHogWebhook(mockRequest);
		expect(response.status).toBe(400);
	});

	it("should handle cohort entry events", async () => {
		const mockEvent = {
			event: "user_entered_cohort",
			properties: {
				cohort: "High Intent Free Users",
				cohort_id: 123,
				cohort_name: "High Intent Free Users",
			},
			person: {
				id: "user_123",
				created_at: "2023-01-01T00:00:00Z",
				properties: {},
				distinct_ids: ["user_123"],
			},
			timestamp: "2023-01-01T00:00:00Z",
			uuid: "event_123",
		};

		// Create a proper mock request with JSON body
		const mockRequest = new Request("https://example.com/webhook", {
			method: "POST",
			body: JSON.stringify(mockEvent),
			headers: {
				"Content-Type": "application/json",
			},
		}) as unknown as NextRequest;

		const response = await handlePostHogWebhook(mockRequest);
		expect(response.status).toBe(200);
	});

	it("should handle feature flag events", async () => {
		const mockEvent = {
			event: "$feature_flag_called",
			properties: {
				$feature_flag: "test_flag",
				$feature_flag_response: "variant_a",
			},
			person: {
				id: "user_123",
				created_at: "2023-01-01T00:00:00Z",
				properties: {},
				distinct_ids: ["user_123"],
			},
			timestamp: "2023-01-01T00:00:00Z",
			uuid: "event_123",
		};

		const mockRequest = new Request("https://example.com/webhook", {
			method: "POST",
			body: JSON.stringify(mockEvent),
			headers: {
				"Content-Type": "application/json",
			},
		}) as unknown as NextRequest;

		const response = await handlePostHogWebhook(mockRequest);
		expect(response.status).toBe(200);
	});

	it("should handle errors gracefully", async () => {
		// Create a mock request that will throw an error when json() is called
		const mockRequest = new Request("https://example.com/webhook", {
			method: "POST",
			body: "invalid json",
			headers: {
				"Content-Type": "application/json",
			},
		}) as unknown as NextRequest;

		const response = await handlePostHogWebhook(mockRequest);
		expect(response.status).toBe(400);
	});

	it("should reject request with missing signature when secret is configured", async () => {
		// Set the webhook secret
		process.env.POSTHOG_WEBHOOK_SECRET = "test-secret";

		const mockEvent = {
			event: "test_event",
			properties: {},
			person: {
				id: "user_123",
				created_at: "2023-01-01T00:00:00Z",
				properties: {},
				distinct_ids: ["user_123"],
			},
			timestamp: "2023-01-01T00:00:00Z",
			uuid: "event_123",
		};

		const mockRequest = new Request("https://example.com/webhook", {
			method: "POST",
			body: JSON.stringify(mockEvent),
			headers: {
				"Content-Type": "application/json",
				// No X-Hub-Signature header
			},
		}) as unknown as NextRequest;

		const response = await handlePostHogWebhook(mockRequest);
		expect(response.status).toBe(401);
	});

	it("should reject request with invalid signature", async () => {
		// Set the webhook secret
		process.env.POSTHOG_WEBHOOK_SECRET = "test-secret";

		const mockEvent = {
			event: "test_event",
			properties: {},
			person: {
				id: "user_123",
				created_at: "2023-01-01T00:00:00Z",
				properties: {},
				distinct_ids: ["user_123"],
			},
			timestamp: "2023-01-01T00:00:00Z",
			uuid: "event_123",
		};

		const mockRequest = new Request("https://example.com/webhook", {
			method: "POST",
			body: JSON.stringify(mockEvent),
			headers: {
				"Content-Type": "application/json",
				"X-Hub-Signature": "sha256=invalid-signature",
			},
		}) as unknown as NextRequest;

		const response = await handlePostHogWebhook(mockRequest);
		expect(response.status).toBe(401);
	});

	it("should accept request with valid signature", async () => {
		// Set the webhook secret
		process.env.POSTHOG_WEBHOOK_SECRET = "test-secret";

		const mockEvent = {
			event: "test_event",
			properties: {},
			person: {
				id: "user_123",
				created_at: "2023-01-01T00:00:00Z",
				properties: {},
				distinct_ids: ["user_123"],
			},
			timestamp: "2023-01-01T00:00:00Z",
			uuid: "event_123",
		};

		// Create valid signature
		const body = JSON.stringify(mockEvent);
		const expectedSignature = crypto.createHmac("sha256", "test-secret").update(body).digest("hex");

		const mockRequest = new Request("https://example.com/webhook", {
			method: "POST",
			body: body,
			headers: {
				"Content-Type": "application/json",
				"X-Hub-Signature": `sha256=${expectedSignature}`,
			},
		}) as unknown as NextRequest;

		const response = await handlePostHogWebhook(mockRequest);
		expect(response.status).toBe(200);
	});
});
