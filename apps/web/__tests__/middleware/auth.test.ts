import { verify } from "@node-rs/argon2";
import { auth } from "@snapback/auth";
import { apiKeys, db, snapbackSchema } from "@snapback/platform";

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMiddleware } from "../../app/middleware/auth";

// Mock dependencies
vi.mock("@node-rs/argon2");
vi.mock("@snapback/auth");
vi.mock("@snapback/platform");
vi.mock("@snapback/platform");
vi.mock("@snapback/platform");
vi.mock("drizzle-orm");

describe("Authentication Middleware", () => {
	beforeEach(() => {
		// Reset all mocks
		vi.resetAllMocks();
	});

	it("should reject requests without Authorization header", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockReturnValue(null),
			},
		};

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(401);
		expect(responseBody.error).toBe("Missing Authorization header");
	});

	it("should reject requests with invalid Authorization header format", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockReturnValue("InvalidFormat"),
			},
		};

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(401);
		expect(responseBody.error).toBe("Invalid Authorization header format");
	});

	it("should authenticate valid API key requests", async () => {
		// Mock a valid API key request
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer test-api-key-1234567890";
					}
					return null;
				}),
			},
		};

		// Mock database response for valid API key
		const mockDb = {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([
				{
					id: "key-123",
					userId: "user-123",
					key: "hashed-test-api-key-1234567890",
					keyPreview: "test-api",
				},
			]),
		};

		// Mock argon2 verify to return true for valid key
		(verify as any).mockResolvedValue(true);

		// Mock db to return our mock
		(db as any).select = vi.fn().mockReturnValue(mockDb);

		// Mock eq function
		(eq as any).mockReturnValue("mock-eq-result");

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);

		// Should allow the request (NextResponse.next() returns status 200)
		// But we need to check if it's a NextResponse.next() response
		expect(response.status).toBe(200);

		// Check that auth context was set
		const authContextHeader = response.headers.get("x-auth-context");
		expect(authContextHeader).toBeDefined();

		if (authContextHeader) {
			const authContext = JSON.parse(authContextHeader);
			expect(authContext.plan).toBe("free"); // Default plan
			expect(authContext.type).toBe("user"); // Default type for regular API keys
		}
	});

	it("should reject invalid API keys", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer invalid-api-key";
					}
					return null;
				}),
			},
		};

		// Mock database response with no matching keys
		const mockDb = {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([]),
		};

		// Mock db to return our mock
		(db as any).select = vi.fn().mockReturnValue(mockDb);

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(401);
		expect(responseBody.error).toBe("Invalid API key");
	});

	it("should authenticate valid JWT tokens", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
					}
					return null;
				}),
			},
		};

		// Mock auth session
		const mockSession = {
			user: {
				id: "user-123",
				email: "test@example.com",
			},
		};

		(auth.api.getSession as any).mockResolvedValue(mockSession);

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);

		expect(response.status).toBe(200);

		// Check that auth context was set
		const authContextHeader = response.headers.get("x-auth-context");
		expect(authContextHeader).toBeDefined();

		if (authContextHeader) {
			const authContext = JSON.parse(authContextHeader);
			expect(authContext.type).toBe("user");
			expect(authContext.userId).toBe("user-123");
			expect(authContext.plan).toBe("free"); // Default plan
		}
	});

	it("should reject invalid JWT tokens", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
					}
					return null;
				}),
			},
		};

		// Mock auth to return null (expired/invalid token)
		(auth.api.getSession as any).mockResolvedValue(null);

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(401);
		expect(responseBody.error).toBe("Invalid or expired JWT token");
	});

	it("should authenticate valid device trial API keys", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer device-trial-key-1234567890";
					}
					return null;
				}),
			},
		};

		// Mock database response for valid device trial API key
		const mockDb = {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockImplementation((table) => {
				if (table === apiKeys) {
					return mockDb;
				}
				if (table === snapbackSchema.deviceTrials) {
					return mockDb;
				}
				return mockDb;
			}),
			where: vi.fn().mockImplementation(() => {
				// First call is for apiKeys, second call is for snapbackSchema.deviceTrials
				if ((mockDb.where as any).mock.calls.length <= 1) {
					return Promise.resolve([
						{
							id: "device-key-123",
							userId: "user-123",
							key: "hashed-device-trial-key-1234567890",
							keyPreview: "device-t",
						},
					]);
				}
				return Promise.resolve([
					{
						deviceFingerprint: "device-fingerprint-123",
						apiKeyId: "device-key-123",
						checkpointLimit: 50,
						blockedUntil: null,
					},
				]);
			}),
		};

		// Mock argon2 verify to return true for valid key
		(verify as any).mockResolvedValue(true);

		// Mock db to return our mock
		(db as any).select = vi.fn().mockReturnValue(mockDb);

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);

		expect(response.status).toBe(200);

		// Check that auth context was set with device trial info
		const authContextHeader = response.headers.get("x-auth-context");
		expect(authContextHeader).toBeDefined();

		if (authContextHeader) {
			const authContext = JSON.parse(authContextHeader);
			expect(authContext.type).toBe("device");
			expect(authContext.deviceId).toBe("device-fingerprint-123");
			expect(authContext.plan).toBe("free");
			expect(authContext.checkpointLimit).toBe(50);
		}
	});

	it("should reject blocked device trials", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer blocked-device-key-1234567890";
					}
					return null;
				}),
			},
		};

		// Mock database response for blocked device trial
		const mockDb = {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockImplementation((table) => {
				if (table === apiKeys) {
					return mockDb;
				}
				if (table === snapbackSchema.deviceTrials) {
					return mockDb;
				}
				return mockDb;
			}),
			where: vi.fn().mockImplementation(() => {
				// First call is for apiKeys, second call is for snapbackSchema.deviceTrials
				if ((mockDb.where as any).mock.calls.length <= 1) {
					return Promise.resolve([
						{
							id: "blocked-key-123",
							userId: "user-123",
							key: "hashed-blocked-device-key-1234567890",
							keyPreview: "blocked-",
						},
					]);
				}
				// Future date means device is blocked
				const futureDate = new Date();
				futureDate.setDate(futureDate.getDate() + 1);

				return Promise.resolve([
					{
						deviceFingerprint: "blocked-device-fingerprint-123",
						apiKeyId: "blocked-key-123",
						checkpointLimit: 50,
						blockedUntil: futureDate,
					},
				]);
			}),
		};

		// Mock argon2 verify to return true for valid key
		(verify as any).mockResolvedValue(true);

		// Mock db to return our mock
		(db as any).select = vi.fn().mockReturnValue(mockDb);

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(403);
		expect(responseBody.error).toBe("Device trial has been blocked");
	});

	it("should reject expired API keys", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer expired-api-key-1234567890";
					}
					return null;
				}),
			},
		};

		// Mock database response for expired API key
		const mockDb = {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([
				{
					id: "expired-key-123",
					userId: "user-123",
					key: "hashed-expired-api-key-1234567890",
					keyPreview: "expired-",
					expiresAt: new Date(Date.now() - 86400000), // Yesterday
				},
			]),
		};

		// Mock argon2 verify to return true for valid key
		(verify as any).mockResolvedValue(true);

		// Mock db to return our mock
		(db as any).select = vi.fn().mockReturnValue(mockDb);

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(401);
		expect(responseBody.error).toBe("API key has expired");
	});

	it("should reject revoked API keys", async () => {
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "Authorization") {
						return "Bearer revoked-api-key-1234567890";
					}
					return null;
				}),
			},
		};

		// Mock database response for revoked API key
		const mockDb = {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([
				{
					id: "revoked-key-123",
					userId: "user-123",
					key: "hashed-revoked-api-key-1234567890",
					keyPreview: "revoked-",
					revokedAt: new Date(Date.now() - 86400000), // Yesterday
				},
			]),
		};

		// Mock argon2 verify to return true for valid key
		(verify as any).mockResolvedValue(true);

		// Mock db to return our mock
		(db as any).select = vi.fn().mockReturnValue(mockDb);

		const response = await authMiddleware(
			mockRequest as unknown as NextRequest,
		);
		const responseBody = await response.json();

		expect(response.status).toBe(401);
		expect(responseBody.error).toBe("API key has been revoked");
	});
});
