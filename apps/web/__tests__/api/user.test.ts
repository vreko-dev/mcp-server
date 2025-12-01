import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../app/api/v1/user/me/route";

// Mock dependencies
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@snapback/auth", () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
};

vi.mock("@snapback/platform", () => ({
	db: mockDb,
	snapbackSchema: {
		deviceTrials: {
			deviceFingerprint: "deviceFingerprint",
		},
	},
	eq: vi.fn((a, b) => ({ a, b })),
}));

describe("GET /api/v1/user/me", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Device Trial Users", () => {
		it("should return device trial data successfully", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device-123",
				snapshotLimit: 50,
				snapshotsUsed: 25,
				apiCallLimit: 100,
				apiCallsUsed: 30,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device-123",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.deviceId).toBe("test-device-123");
			expect(data.plan).toBe("free");
			expect(data.limits.snapshots).toBe(50);
			expect(data.usage.snapshots).toBe(25);
		});

		it("should calculate usage percentages correctly", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotLimit: 100,
				snapshotsUsed: 50,
				apiCallLimit: 1000,
				apiCallsUsed: 500,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.usage.snapshots).toBe(50);
			expect(data.limits.snapshots).toBe(100);
		});

		it("should include upgrade prompt when near snapshot limit", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotLimit: 50,
				snapshotsUsed: 45, // 90% usage
				apiCallLimit: 100,
				apiCallsUsed: 20,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.upgradePrompt).toBeDefined();
			expect(data.upgradePrompt.message).toContain("unlimited");
			expect(data.upgradePrompt.cta).toBe("Upgrade to Pro");
			expect(data.upgradePrompt.ctaUrl).toBe("/pricing");
		});

		it("should include upgrade prompt when near API call limit", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotLimit: 50,
				snapshotsUsed: 10,
				apiCallLimit: 100,
				apiCallsUsed: 85, // 85% usage
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.upgradePrompt).toBeDefined();
		});

		it("should not include upgrade prompt when usage is low", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotLimit: 50,
				snapshotsUsed: 10, // 20% usage
				apiCallLimit: 100,
				apiCallsUsed: 20, // 20% usage
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.upgradePrompt).toBeUndefined();
		});

		it("should return 404 when device trial not found", async () => {
			vi.mocked(mockDb.where).mockResolvedValueOnce([]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "unknown-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("Device trial not found");
		});

		it("should handle zero limits gracefully", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotLimit: 0,
				snapshotsUsed: 0,
				apiCallLimit: 0,
				apiCallsUsed: 0,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.limits.snapshots).toBe(0);
			expect(data.usage.snapshots).toBe(0);
		});

		it("should return zero storage for device trials", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotLimit: 50,
				snapshotsUsed: 25,
				apiCallLimit: 100,
				apiCallsUsed: 30,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.limits.storage).toBe(0);
			expect(data.usage.storage).toBe(0);
		});
	});

	describe("Authenticated Users", () => {
		it("should return authenticated user data", async () => {
			const { auth } = await import("@snapback/auth");

			const mockSession = {
				user: {
					id: "user-123",
					email: "test@example.com",
					name: "Test User",
				},
			};

			vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "user",
						userId: "user-123",
						plan: "solo",
						permissions: {
							maxSnapshots: 1000,
							cloudBackup: true,
						},
					}),
					authorization: "Bearer valid-token",
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.userId).toBe("user-123");
			expect(data.email).toBe("test@example.com");
			expect(data.plan).toBe("solo");
		});

		it("should include user permissions in response", async () => {
			const { auth } = await import("@snapback/auth");

			const mockSession = {
				user: {
					id: "user-123",
					email: "test@example.com",
				},
			};

			const mockPermissions = {
				maxSnapshots: 1000,
				cloudBackup: true,
				advancedDetection: true,
			};

			vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "user",
						userId: "user-123",
						plan: "solo",
						permissions: mockPermissions,
					}),
					authorization: "Bearer valid-token",
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.limits).toEqual(mockPermissions);
		});

		it("should reject invalid session tokens", async () => {
			const { auth } = await import("@snapback/auth");
			vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "user",
						userId: "user-123",
						plan: "solo",
					}),
					authorization: "Bearer invalid-token",
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Invalid session");
		});

		it("should handle different subscription plans", async () => {
			const { auth } = await import("@snapback/auth");

			const mockSession = {
				user: {
					id: "user-enterprise",
					email: "enterprise@example.com",
				},
			};

			vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "user",
						userId: "user-enterprise",
						plan: "enterprise",
						permissions: {
							maxSnapshots: undefined,
							cloudBackup: true,
							advancedDetection: true,
							customRules: true,
							teamSharing: true,
						},
					}),
					authorization: "Bearer valid-token",
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.plan).toBe("enterprise");
			expect(data.limits.customRules).toBe(true);
			expect(data.limits.teamSharing).toBe(true);
		});
	});

	describe("Validation", () => {
		it("should require authentication context", async () => {
			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Authentication required");
		});

		it("should handle malformed auth context", async () => {
			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": "invalid json{",
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Internal server error");
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors for device trials", async () => {
			vi.mocked(mockDb.where).mockRejectedValueOnce(
				new Error("Database connection error"),
			);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Failed to retrieve device trial info");
		});

		it("should handle auth service errors", async () => {
			const { auth } = await import("@snapback/auth");
			vi.mocked(auth.api.getSession).mockRejectedValueOnce(
				new Error("Auth service unavailable"),
			);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "user",
						userId: "user-123",
						plan: "solo",
					}),
					authorization: "Bearer valid-token",
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Failed to retrieve user info");
		});

		it("should handle database unavailability", async () => {
			const { db } = await import("@snapback/platform");
			// Temporarily set db to null
			const originalDb = db;
			(global as any).db = null;

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			// Restore db
			(global as any).db = originalDb;

			expect(response.status).toBe(500);
			expect(data.error).toBe("Database not available");
		});
	});

	describe("Edge Cases", () => {
		it("should handle device trial with maximum usage", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotLimit: 50,
				snapshotsUsed: 50,
				apiCallLimit: 100,
				apiCallsUsed: 100,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "device",
						deviceId: "test-device",
					}),
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.usage.snapshots).toBe(50);
			expect(data.limits.snapshots).toBe(50);
			expect(data.upgradePrompt).toBeDefined();
		});

		it("should handle user with no usage data", async () => {
			const { auth } = await import("@snapback/auth");

			const mockSession = {
				user: {
					id: "new-user",
					email: "new@example.com",
				},
			};

			vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any);

			const request = new Request("http://localhost/api/v1/user/me", {
				method: "GET",
				headers: {
					"x-auth-context": JSON.stringify({
						type: "user",
						userId: "new-user",
						plan: "free",
						permissions: {
							maxSnapshots: 100,
							cloudBackup: false,
						},
					}),
					authorization: "Bearer valid-token",
				},
			}) as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.usage.checkpoints).toBe(0);
			expect(data.usage.requestsThisHour).toBe(0);
			expect(data.usage.storage).toBe(0);
		});
	});
});
