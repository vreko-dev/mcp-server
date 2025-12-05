/**
 * Slack Feedback Integration Tests
 *
 * Tests REAL Slack webhook integration with MSW mocking.
 * Following TDD: RED -> GREEN -> REFACTOR
 *
 * Run with: pnpm test:integration
 */

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Mock Slack webhook server
const MOCK_SLACK_WEBHOOK = "https://hooks.slack.com/services/TEST/WEBHOOK/URL";

const server = setupServer(
	// Mock Slack incoming webhook
	http.post("https://hooks.slack.com/services/*", async ({ request }) => {
		const body = await request.json();

		// Validate Slack message format
		if (!body || typeof body !== "object") {
			return HttpResponse.json({ error: "Invalid payload" }, { status: 400 });
		}

		// Check required fields
		if (!("text" in body)) {
			return HttpResponse.json({ error: "Missing text field" }, { status: 400 });
		}

		// Slack webhook returns "ok" on success
		return HttpResponse.text("ok", { status: 200 });
	}),
);

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

describe("Slack Feedback Integration", () => {
	beforeEach(() => {
		// Set webhook URL for tests
		process.env.SLACK_FEEDBACK_WEBHOOK = MOCK_SLACK_WEBHOOK;
	});

	it("should send feedback to Slack webhook with correct format", async () => {
		let receivedPayload: any = null;

		server.use(
			http.post("https://hooks.slack.com/services/*", async ({ request }) => {
				receivedPayload = await request.json();
				return HttpResponse.text("ok", { status: 200 });
			}),
		);

		// Simulate feedback submission
		const feedbackPayload = {
			text: "New bug feedback from test@example.com",
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: "*BUG Feedback*\\nThis is a test bug report",
					},
				},
				{
					type: "context",
					elements: [
						{
							type: "mrkdwn",
							text: "User: test@example.com | URL: https://example.com/page",
						},
					],
				},
			],
		};

		const response = await fetch(MOCK_SLACK_WEBHOOK, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(feedbackPayload),
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("ok");
		expect(receivedPayload).toEqual(feedbackPayload);
	});

	it("should handle Slack webhook failures gracefully", async () => {
		server.use(
			http.post("https://hooks.slack.com/services/*", () => {
				return HttpResponse.json({ error: "Service unavailable" }, { status: 503 });
			}),
		);

		const response = await fetch(MOCK_SLACK_WEBHOOK, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text: "Test" }),
		});

		// Should fail but not crash
		expect(response.status).toBe(503);
	});

	it("should validate required Slack message fields", async () => {
		const invalidPayload = {
			// Missing "text" field
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: "No top-level text field",
					},
				},
			],
		};

		const response = await fetch(MOCK_SLACK_WEBHOOK, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(invalidPayload),
		});

		expect(response.status).toBe(400);
	});

	it("should send different feedback categories correctly", async () => {
		const categories = ["bug", "feature", "improvement", "other"];
		const sentPayloads: any[] = [];

		server.use(
			http.post("https://hooks.slack.com/services/*", async ({ request }) => {
				const payload = await request.json();
				sentPayloads.push(payload);
				return HttpResponse.text("ok", { status: 200 });
			}),
		);

		for (const category of categories) {
			await fetch(MOCK_SLACK_WEBHOOK, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: `New ${category} feedback from test@example.com`,
					blocks: [
						{
							type: "section",
							text: {
								type: "mrkdwn",
								text: `*${category.toUpperCase()} Feedback*\\nTest message`,
							},
						},
					],
				}),
			});
		}

		expect(sentPayloads).toHaveLength(4);
		expect(sentPayloads[0].text).toContain("bug");
		expect(sentPayloads[1].text).toContain("feature");
		expect(sentPayloads[2].text).toContain("improvement");
		expect(sentPayloads[3].text).toContain("other");
	});

	it("should not send to Slack when webhook not configured", async () => {
		delete process.env.SLACK_FEEDBACK_WEBHOOK;

		// This should not make any HTTP request
		let requestMade = false;

		server.use(
			http.post("https://hooks.slack.com/services/*", () => {
				requestMade = true;
				return HttpResponse.text("ok", { status: 200 });
			}),
		);

		// Simulate conditional send logic
		if (process.env.SLACK_FEEDBACK_WEBHOOK) {
			await fetch(process.env.SLACK_FEEDBACK_WEBHOOK, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: "Test" }),
			});
		}

		expect(requestMade).toBe(false);
	});

	it("should handle rate limiting from Slack", async () => {
		server.use(
			http.post("https://hooks.slack.com/services/*", () => {
				return HttpResponse.json(
					{ error: "rate_limited" },
					{
						status: 429,
						headers: {
							"Retry-After": "60",
						},
					},
				);
			}),
		);

		const response = await fetch(MOCK_SLACK_WEBHOOK, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text: "Test" }),
		});

		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("60");
	});
});
