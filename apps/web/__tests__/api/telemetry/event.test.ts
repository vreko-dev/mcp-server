// Import the new core event schemas
import { CORE_TELEMETRY_EVENTS } from "@snapback/contracts/events";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as TelemetryEventPOST } from "../../../app/api/v1/telemetry/event/route.js";

// Mock nanoid
vi.mock("nanoid", () => {
	return {
		nanoid: vi.fn().mockReturnValue("test-id-123"),
	};
});

// Mock database client
const mockDb = {
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockResolvedValue({}),
};

// Mock the platform module properly
vi.mock("@snapback/platform", async () => {
	const actual = await vi.importActual("@snapback/platform");
	return {
		...actual,
		db: mockDb,
		snapbackSchema: {
			telemetryEvents: {},
		},
	};
});

// Mock logger
const mockLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
};

vi.mock("@snapback/infrastructure", () => ({
	logger: mockLogger,
}));

// Create a proper mock for NextRequest
interface MockRequestInit {
	headers?: Record<string, string>;
	json?: () => Promise<any>;
	text?: () => Promise<string>;
}

class MockNextRequest {
	headers: {
		get: (header: string) => string | null;
	};

	constructor(init?: MockRequestInit) {
		this.headers = {
			get: (header: string) => {
				if (init?.headers && header in init.headers) {
					return init.headers[header];
				}
				return null;
			},
		};

		if (init?.json) {
			this.json = init.json;
		}

		if (init?.text) {
			this.text = init.text;
		}
	}

	async json() {
		return Promise.resolve({});
	}

	async text() {
		return Promise.resolve("");
	}
}

describe("POST /api/v1/telemetry/event", () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
	});

	it("should accept valid core telemetry event", async () => {
		// Mock a NextRequest object with valid core event
		const mockRequest = new MockNextRequest({
			headers: {
				"x-auth-context": JSON.stringify({
					userId: "user123",
					apiKeyId: "key123",
					deviceId: "device123",
				}),
			},
			json: () =>
				Promise.resolve({
					event: CORE_TELEMETRY_EVENTS.SNAPSHOT_CREATED,
					properties: {
						session_id: "session123",
						snapshot_id: "snap123",
						bytes_original: 1024,
						bytes_stored: 512,
						dedup_hit: false,
						latency_ms: 45,
					},
					timestamp: Date.now(),
				}),
		});

		const response = await TelemetryEventPOST(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(200);
		expect(responseBody.success).toBe(true);
		expect(mockDb.insert).toHaveBeenCalled();
		expect(mockLogger.info).toHaveBeenCalled();
	});

	it("should reject invalid core telemetry event", async () => {
		// Mock a NextRequest object with invalid core event
		const mockRequest = new MockNextRequest({
			headers: {
				"x-auth-context": JSON.stringify({
					userId: "user123",
					apiKeyId: "key123",
					deviceId: "device123",
				}),
			},
			json: () =>
				Promise.resolve({
					event: "invalid_event",
					properties: {
						// Missing required properties
					},
					timestamp: Date.now(),
				}),
		});

		const response = await TelemetryEventPOST(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(400);
		expect(responseBody.error).toBe("Invalid event format");
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it("should handle concurrent requests", async () => {
		// Mock a NextRequest object with valid core event
		const mockRequestInit = {
			headers: {
				"x-auth-context": JSON.stringify({
					userId: "user123",
					apiKeyId: "key123",
					deviceId: "device123",
				}),
			},
			json: () =>
				Promise.resolve({
					event: CORE_TELEMETRY_EVENTS.SNAPSHOT_CREATED,
					properties: {
						session_id: "session123",
						snapshot_id: "snap123",
						bytes_original: 1024,
						bytes_stored: 512,
						dedup_hit: false,
						latency_ms: 45,
					},
					timestamp: Date.now(),
				}),
		};

		// Simulate multiple concurrent requests
		const promises = Array(10)
			.fill(null)
			.map(() => {
				const mockRequest = new MockNextRequest(mockRequestInit);
				return TelemetryEventPOST(mockRequest as unknown as NextRequest);
			});
		const responses = await Promise.all(promises);

		// All should succeed
		responses.forEach((response) => {
			expect(response.status).toBe(200);
		});

		// Database should have been called 10 times
		expect(mockDb.insert).toHaveBeenCalledTimes(10);
	});

	it("should handle device trial context", async () => {
		// Mock a NextRequest object with device trial context and valid core event
		const mockRequest = new MockNextRequest({
			headers: {
				"x-auth-context": JSON.stringify({
					type: "device",
					deviceId: "device123",
				}),
			},
			json: () =>
				Promise.resolve({
					event: CORE_TELEMETRY_EVENTS.SESSION_FINALIZED,
					properties: {
						session_id: "session123",
						files: ["src/index.ts"],
						triggers: ["save_attempt"],
						duration_ms: 120000,
						ai_present: false,
						ai_burst: false,
						highest_severity: "low",
					},
					timestamp: Date.now(),
				}),
		});

		const response = await TelemetryEventPOST(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(200);
		expect(responseBody.success).toBe(true);
		expect(mockLogger.info).toHaveBeenCalled();
	});

	it("should handle database errors gracefully", async () => {
		// Mock database to throw an error
		mockDb.values.mockRejectedValue(new Error("Database connection failed"));

		// Mock a NextRequest object with valid core event
		const mockRequest = new MockNextRequest({
			headers: {
				"x-auth-context": JSON.stringify({
					userId: "user123",
					apiKeyId: "key123",
					deviceId: "device123",
				}),
			},
			json: () =>
				Promise.resolve({
					event: CORE_TELEMETRY_EVENTS.SNAPSHOT_CREATED,
					properties: {
						session_id: "session123",
						snapshot_id: "snap123",
						bytes_original: 1024,
						bytes_stored: 512,
						dedup_hit: false,
						latency_ms: 45,
					},
					timestamp: Date.now(),
				}),
		});

		const response = await TelemetryEventPOST(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		// Should still return success even with database error
		expect(response.status).toBe(200);
		expect(responseBody.success).toBe(true);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("should handle invalid JSON", async () => {
		// Mock a NextRequest object with invalid JSON
		const mockRequest = new MockNextRequest({
			headers: {
				"x-auth-context": JSON.stringify({
					userId: "user123",
					apiKeyId: "key123",
					deviceId: "device123",
				}),
			},
			json: () => Promise.reject(new Error("Invalid JSON")),
		});

		const response = await TelemetryEventPOST(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		// Should handle JSON parsing errors gracefully
		expect(response.status).toBe(500);
		expect(responseBody.success).toBe(true); // Still returns success to not fail the client
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
