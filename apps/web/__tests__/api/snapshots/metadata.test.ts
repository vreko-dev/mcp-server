import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../app/api/v1/snapshots/metadata/route";

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
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	returning: vi.fn(),
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
};

vi.mock("@snapback/platform", () => ({
	db: mockDb,
	deviceTrials: {
		deviceFingerprint: "deviceFingerprint",
		snapshotsUsed: "snapshotsUsed",
		blockedUntil: "blockedUntil",
	},
	snapshots: {},
	eq: vi.fn((a, b) => ({ a, b })),
	sql: vi.fn((strings, ...values) => ({ strings, values })),
}));

describe("POST /api/v1/snapshots/metadata", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Device Trial Snapshots", () => {
		it("should create device trial snapshot successfully", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotsUsed: 25,
				snapshotLimit: 50,
				blockedUntil: null,
			};

			const mockSnapshot = {
				id: "snapshot-123",
				name: "Test Snapshot",
				description: "Test Description",
				projectPath: "/test/project",
				createdAt: new Date("2024-01-01"),
				metadata: {
					tags: ["test"],
					clientVersion: "1.0.0",
					ideVersion: "vscode-1.80",
					platform: "darwin",
				},
			};

			// Mock database calls
			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);
			vi.mocked(mockDb.returning).mockResolvedValueOnce([mockSnapshot]);
			vi.mocked(mockDb.where).mockResolvedValueOnce([]);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						description: "Test Description",
						projectPath: "/test/project",
						tags: ["test"],
						clientVersion: "1.0.0",
						ideVersion: "vscode-1.80",
						platform: "darwin",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.snapshotId).toBe("snapshot-123");
			expect(data.metadata.name).toBe("Test Snapshot");
		});

		it("should block when device trial limit reached", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotsUsed: 50,
				snapshotLimit: 50,
				blockedUntil: null,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(402);
			expect(data.error).toBe("Snapshot limit reached");
			expect(data.upgradePrompt).toBeDefined();
			expect(data.upgradePrompt.message).toContain("unlimited");
		});

		it("should block when device is blocked", async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 7);

			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotsUsed: 10,
				snapshotLimit: 50,
				blockedUntil: futureDate,
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(403);
			expect(data.error).toBe("Device trial has been blocked");
		});

		it("should return 404 when device trial not found", async () => {
			vi.mocked(mockDb.where).mockResolvedValueOnce([]);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "unknown-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("Device trial not found");
		});

		it("should increment snapshotsUsed counter", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotsUsed: 25,
				snapshotLimit: 50,
				blockedUntil: null,
			};

			const mockSnapshot = {
				id: "snapshot-123",
				name: "Test Snapshot",
				description: "",
				projectPath: "/test/project",
				createdAt: new Date(),
				metadata: {},
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);
			vi.mocked(mockDb.returning).mockResolvedValueOnce([mockSnapshot]);
			vi.mocked(mockDb.where).mockResolvedValueOnce([]);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);

			expect(response.status).toBe(201);
			expect(mockDb.update).toHaveBeenCalled();
			expect(mockDb.set).toHaveBeenCalled();
		});
	});

	describe("Authenticated User Snapshots", () => {
		it("should create authenticated user snapshot", async () => {
			const { auth } = await import("@snapback/auth");

			const mockSession = {
				user: {
					id: "user-123",
					email: "test@example.com",
				},
			};

			const mockSnapshot = {
				id: "snapshot-456",
				name: "User Snapshot",
				description: "User Description",
				projectPath: "/user/project",
				createdAt: new Date("2024-01-01"),
				metadata: {
					tags: ["feature"],
				},
			};

			vi.mocked(auth.api.getSession).mockResolvedValueOnce(mockSession as any);
			vi.mocked(mockDb.returning).mockResolvedValueOnce([mockSnapshot]);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "user",
							userId: "user-123",
							apiKeyId: "api-key-456",
						}),
						authorization: "Bearer valid-token",
					},
					body: JSON.stringify({
						name: "User Snapshot",
						description: "User Description",
						projectPath: "/user/project",
						tags: ["feature"],
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.snapshotId).toBe("snapshot-456");
			expect(data.metadata.name).toBe("User Snapshot");
		});

		it("should require authorization header for authenticated users", async () => {
			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "user",
							userId: "user-123",
							apiKeyId: "api-key-456",
						}),
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toContain("authorization");
		});

		it("should reject invalid session tokens", async () => {
			const { auth } = await import("@snapback/auth");
			vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "user",
							userId: "user-123",
							apiKeyId: "api-key-456",
						}),
						authorization: "Bearer invalid-token",
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Invalid session");
		});
	});

	describe("Validation", () => {
		it("should require authentication context", async () => {
			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Authentication required");
		});

		it("should validate request body", async () => {
			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("required");
		});

		it("should accept valid minimal request body", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotsUsed: 0,
				snapshotLimit: 50,
				blockedUntil: null,
			};

			const mockSnapshot = {
				id: "snapshot-123",
				name: "",
				description: "",
				projectPath: "/project",
				createdAt: new Date(),
				metadata: {},
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);
			vi.mocked(mockDb.returning).mockResolvedValueOnce([mockSnapshot]);
			vi.mocked(mockDb.where).mockResolvedValueOnce([]);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({
						projectPath: "/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);

			expect(response.status).toBe(201);
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors gracefully", async () => {
			vi.mocked(mockDb.where).mockRejectedValueOnce(
				new Error("Database connection error"),
			);

			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Internal server error");
		});

		it("should handle invalid JSON in request body", async () => {
			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": JSON.stringify({
							type: "device",
							deviceId: "test-device",
							apiKeyId: "api-key-123",
						}),
					},
					body: "invalid json{",
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Internal server error");
		});

		it("should handle malformed auth context", async () => {
			const request = new Request(
				"http://localhost/api/v1/snapshots/metadata",
				{
					method: "POST",
					headers: {
						"x-auth-context": "invalid json{",
					},
					body: JSON.stringify({
						name: "Test Snapshot",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Internal server error");
		});
	});
});
