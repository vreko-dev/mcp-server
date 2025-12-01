import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../submit/route";

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("POST /api/feedback/submit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should accept valid feedback submission", async () => {
		const validFeedback = {
			category: "bug",
			message: "Test feedback message",
			email: "test@example.com",
			url: "https://example.com/page",
			userAgent: "Mozilla/5.0",
			metadata: { page: "dashboard", action: "click" },
		};

		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: JSON.stringify(validFeedback),
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.message).toBe("Thank you for your feedback!");
	});

	it("should accept minimal valid feedback (category + message only)", async () => {
		const minimalFeedback = {
			category: "feature",
			message: "Add dark mode please",
		};

		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: JSON.stringify(minimalFeedback),
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("should reject invalid category", async () => {
		const invalidFeedback = {
			category: "invalid-category",
			message: "Test message",
		};

		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: JSON.stringify(invalidFeedback),
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe("Invalid feedback data");
		expect(data.details).toBeDefined();
	});

	it("should reject empty message", async () => {
		const invalidFeedback = {
			category: "bug",
			message: "",
		};

		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: JSON.stringify(invalidFeedback),
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
	});

	it("should reject message longer than 5000 characters", async () => {
		const longMessage = "a".repeat(5001);
		const invalidFeedback = {
			category: "improvement",
			message: longMessage,
		};

		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: JSON.stringify(invalidFeedback),
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
	});

	it("should reject invalid email format", async () => {
		const invalidFeedback = {
			category: "bug",
			message: "Test message",
			email: "not-an-email",
		};

		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: JSON.stringify(invalidFeedback),
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
	});

	it("should reject invalid URL format", async () => {
		const invalidFeedback = {
			category: "bug",
			message: "Test message",
			url: "not-a-url",
		};

		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: JSON.stringify(invalidFeedback),
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
	});

	it("should handle malformed JSON gracefully", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/feedback/submit",
			{
				method: "POST",
				body: "{ invalid json }",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toBe("Failed to submit feedback");
	});

	it("should accept all valid categories", async () => {
		const categories = ["bug", "feature", "improvement", "other"] as const;

		for (const category of categories) {
			const feedback = {
				category,
				message: `Test message for ${category}`,
			};

			const request = new NextRequest(
				"http://localhost:3000/api/feedback/submit",
				{
					method: "POST",
					body: JSON.stringify(feedback),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		}
	});
});
