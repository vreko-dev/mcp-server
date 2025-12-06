import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleInAppMessage } from "../inapp-messaging";

// Mock the database
vi.mock("@snapback/platform", () => {
	return {
		drizzle: {
			db: {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockImplementation(() => {
					// Mock implementation that returns different results based on what table is being queried
					return Promise.resolve([]);
				}),
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

// Mock the AI module
vi.mock("@snapback/ai", () => ({
	textModel: {
		specification: {
			name: "gpt-4o-mini",
		},
	},
}));

vi.mock("ai", () => ({
	streamText: vi.fn().mockResolvedValue({
		text: vi.fn().mockResolvedValue('{"title": "Test Title", "content": "Test Content"}'),
	}),
}));

describe("In-App Messaging", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Clear the in-memory message queues
		// We can't easily access the internal messageQueues array, so we'll just note that
		// in a real implementation, we'd reset any shared state here
	});

	it("should handle user not found", async () => {
		const result = await scheduleInAppMessage("nonexistent_user", {
			title: "Test Message",
			content: "This should fail",
		});

		expect(result).toBe(false);
	});
});
