import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/checkpoints/metadata/route";

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

describe("POST /api/v1/checkpoints/metadata", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Device Trial Checkpoints", () => {
		it("should create device trial checkpoint successfully", async () => {
			const mockDeviceTrial = {
				deviceFingerprint: "test-device",
				snapshotsUsed: 10,
				snapshotLimit: 50,
				blockedUntil: null,
			};

			const mockCheckpoint = {
				id: "checkpoint-123",
				name: "Feature Complete",
				description: "Completed user authentication feature",
				projectPath: "/workspace/my-app",
				createdAt: new Date("2024-01-01"),
				metadata: {
					tags: ["feature", "auth"],
					clientVersion: "1.0.0",
					ideVersion: "vscode-1.85",
					platform: "darwin",
				},
			};

			vi.mocked(mockDb.where).mockResolvedValueOnce([mockDeviceTrial]);
			vi.mocked(mockDb.returning).mockResolvedValueOnce([mockCheckpoint]);
			vi.mocked(mockDb.where).mockResolvedValueOnce([]);

			const request = new Request(
				"http://localhost/api/v1/checkpoints/metadata",
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
						name: "Feature Complete",
						description: "Completed user authentication feature",
						projectPath: "/workspace/my-app",
						tags: ["feature", "auth"],
						clientVersion: "1.0.0",
						ideVersion: "vscode-1.85",
						platform: "darwin",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.checkpointId).toBe("checkpoint-123");
			expect(data.metadata.name).toBe("Feature Complete");
			expect(data.metadata.tags).toEqual(["feature", "auth"]);
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
				"http://localhost/api/v1/checkpoints/metadata",
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
						name: "Test Checkpoint",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(402);
			expect(data.error).toBe("Snapshot limit reached");
			expect(data.upgradePrompt).toBeDefined();
		});

		it("should return 404 when device trial not found", async () => {
			vi.mocked(mockDb.where).mockResolvedValueOnce([]);

			const request = new Request(
				"http://localhost/api/v1/checkpoints/metadata",
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
						name: "Test Checkpoint",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("Device trial not found");
		});
	});

	describe("Validation", () => {
		it("should require authentication context", async () => {
			const request = new Request(
				"http://localhost/api/v1/checkpoints/metadata",
				{
					method: "POST",
					body: JSON.stringify({
						name: "Test Checkpoint",
						projectPath: "/test/project",
					}),
				},
			) as NextRequest;

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Authentication required");
		});

		it("should validate request body requires at least one field", async () => {
			const request = new Request(
				"http://localhost/api/v1/checkpoints/metadata",
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
	});
});
