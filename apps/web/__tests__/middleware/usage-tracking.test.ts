import { beforeEach, describe, expect, it, vi } from "vitest";
import { usageTrackingMiddleware } from "../../middleware/usage-tracking.js";

// Mock database client
const mockDb = {
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
};

vi.mock("@snapback/platform", () => ({
	db: mockDb,
}));

vi.mock("@snapback/platform", () => ({
	deviceTrials: {
		deviceFingerprint: "deviceFingerprint",
		checkpointsUsed: "checkpointsUsed",
		checkpointLimit: "checkpointLimit",
		apiCallsUsed: "apiCallsUsed",
	},
}));

vi.mock("drizzle-orm", () => ({
	eq: vi.fn(),
	sql: {
		template: vi.fn(),
	},
}));

describe("Usage Tracking Middleware", () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
	});

	it("should track device usage for regular endpoints", async () => {
		// Mock a NextRequest object
		const mockRequest = {
			headers: {
				get: vi.fn().mockReturnValue(
					JSON.stringify({
						type: "device",
						deviceId: "device123",
					}),
				),
			},
			nextUrl: {
				pathname: "/api/some-endpoint",
			},
		};

		// Mock database response
		mockDb.select.mockResolvedValue([
			{ checkpointsUsed: 10, checkpointLimit: 50 },
		]);

		const result = await usageTrackingMiddleware(mockRequest as any);

		expect(result.allowed).toBe(true);
		expect(mockDb.select).toHaveBeenCalled();
		expect(mockDb.update).toHaveBeenCalled();
	});

	it("should track user usage", async () => {
		// Mock a NextRequest object
		const mockRequest = {
			headers: {
				get: vi.fn().mockReturnValue(
					JSON.stringify({
						type: "user",
						userId: "user123",
					}),
				),
			},
			nextUrl: {
				pathname: "/api/some-endpoint",
			},
		};

		const result = await usageTrackingMiddleware(mockRequest as any);

		expect(result.allowed).toBe(true);
		// For user tracking, we're just incrementing counters
		expect(mockDb.update).toHaveBeenCalled();
	});

	it("should block when checkpoint limit is reached", async () => {
		// Mock a NextRequest object for checkpoint endpoint
		const mockRequest = {
			headers: {
				get: vi.fn().mockReturnValue(
					JSON.stringify({
						type: "device",
						deviceId: "device123",
					}),
				),
			},
			nextUrl: {
				pathname: "/api/v1/checkpoints",
			},
		};

		// Mock database response showing limit reached
		mockDb.select.mockResolvedValue([
			{ checkpointsUsed: 50, checkpointLimit: 50 },
		]);

		const result = await usageTrackingMiddleware(mockRequest as any);

		expect(result.allowed).toBe(false);
		expect(result.limitType).toBe("checkpoint");
		expect(result.message).toBe("Checkpoint limit reached");
	});

	it("should allow when checkpoint limit is not reached", async () => {
		// Mock a NextRequest object for checkpoint endpoint
		const mockRequest = {
			headers: {
				get: vi.fn().mockReturnValue(
					JSON.stringify({
						type: "device",
						deviceId: "device123",
					}),
				),
			},
			nextUrl: {
				pathname: "/api/v1/checkpoints",
			},
		};

		// Mock database response showing under limit
		mockDb.select.mockResolvedValue([
			{ checkpointsUsed: 25, checkpointLimit: 50 },
		]);

		const result = await usageTrackingMiddleware(mockRequest as any);

		expect(result.allowed).toBe(true);
		expect(mockDb.update).toHaveBeenCalled(); // Should increment counter
	});

	it("should handle database errors gracefully", async () => {
		// Mock a NextRequest object
		const mockRequest = {
			headers: {
				get: vi.fn().mockReturnValue(
					JSON.stringify({
						type: "device",
						deviceId: "device123",
					}),
				),
			},
			nextUrl: {
				pathname: "/api/some-endpoint",
			},
		};

		// Mock database error
		mockDb.update.mockRejectedValue(new Error("Database error"));

		const result = await usageTrackingMiddleware(mockRequest as any);

		// Should still allow the request even with database error
		expect(result.allowed).toBe(true);
	});
});
