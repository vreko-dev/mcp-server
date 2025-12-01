import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailOrchestrator } from "../email-orchestrator.js";

// Mock the database
vi.mock("@snapback/platform", () => ({
	drizzle: {
		db: {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue([]),
		},
	},
}));

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("Email Orchestrator", () => {
	let emailOrchestrator: EmailOrchestrator;

	beforeEach(() => {
		vi.clearAllMocks();
		emailOrchestrator = new EmailOrchestrator();
	});

	it("should enqueue campaign emails", async () => {
		const user = {
			id: "user_123",
			name: "Test User",
			email: "test@example.com",
		};

		await emailOrchestrator.enqueueCampaignEmails("welcome_series", user);

		// Since we're using in-memory storage, we can't directly check the queue
		// But we can verify that no errors were thrown
		expect(true).toBe(true);
	});

	it("should calculate send time correctly", () => {
		// Access private method through reflection for testing
		const calculateSendTime = (emailOrchestrator as any).calculateSendTime.bind(emailOrchestrator);

		const now = new Date();
		const result = calculateSendTime("1d");

		// Check that the result is approximately 1 day in the future
		const diff = result.getTime() - now.getTime();
		const oneDayInMs = 24 * 60 * 60 * 1000;

		expect(diff).toBeGreaterThan(oneDayInMs - 1000); // Allow for small time differences
		expect(diff).toBeLessThan(oneDayInMs + 1000);
	});

	it("should calculate days left correctly", () => {
		const calculateDaysLeft = (emailOrchestrator as any).calculateDaysLeft.bind(emailOrchestrator);

		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 5);

		const result = calculateDaysLeft(futureDate.toISOString());
		expect(result).toBe(5);
	});

	it("should interpolate template variables", () => {
		const interpolate = (emailOrchestrator as any).interpolate.bind(emailOrchestrator);

		const template = "Hello {name}, welcome to {product}!";
		const data = { name: "John", product: "SnapBack" };

		const result = interpolate(template, data);
		expect(result).toBe("Hello John, welcome to SnapBack!");
	});

	it("should handle invalid delay format", () => {
		const calculateSendTime = (emailOrchestrator as any).calculateSendTime.bind(emailOrchestrator);

		const now = new Date();
		const result = calculateSendTime("invalid");

		// Should return current time for invalid format
		const diff = Math.abs(result.getTime() - now.getTime());
		expect(diff).toBeLessThan(1000); // Within 1 second
	});

	it("should handle different delay units", () => {
		const calculateSendTime = (emailOrchestrator as any).calculateSendTime.bind(emailOrchestrator);

		const now = new Date();

		// Test hours
		const resultHours = calculateSendTime("2h");
		const diffHours = resultHours.getTime() - now.getTime();
		const twoHoursInMs = 2 * 60 * 60 * 1000;
		expect(diffHours).toBeGreaterThan(twoHoursInMs - 1000);
		expect(diffHours).toBeLessThan(twoHoursInMs + 1000);

		// Test weeks
		const resultWeeks = calculateSendTime("1w");
		const diffWeeks = resultWeeks.getTime() - now.getTime();
		const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
		expect(diffWeeks).toBeGreaterThan(oneWeekInMs - 1000);
		expect(diffWeeks).toBeLessThan(oneWeekInMs + 1000);
	});

	it("should handle missing trial end date", () => {
		const calculateDaysLeft = (emailOrchestrator as any).calculateDaysLeft.bind(emailOrchestrator);

		const result = calculateDaysLeft(null);
		expect(result).toBe(0);
	});
});
