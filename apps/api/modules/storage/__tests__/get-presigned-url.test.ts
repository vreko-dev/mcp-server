import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockContext } from "../../../__tests__/utils/mock-context";
import { mockDb } from "../../../__tests__/utils/mock-db";
import { storageRouter } from "../router";

// Mock the platform package
vi.mock("@snapback/platform", () => ({
	db: mockDb,
}));

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
	return {
		S3Client: vi.fn().mockImplementation(() => ({
			send: vi.fn().mockResolvedValue({}),
		})),
		PutObjectCommand: vi.fn(),
		GetObjectCommand: vi.fn(),
	};
});

vi.mock("@aws-sdk/s3-request-presigner", () => {
	return {
		getSignedUrl: vi.fn().mockResolvedValue("https://mock-presigned-url.com"),
	};
});

describe("Storage Router - getPresignedUrl", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should reject unauthenticated users", async () => {
		const context = createMockContext({ user: null });

		await expect(
			storageRouter.procedures.getPresignedUrl(
				{
					snapshotId: "test-snapshot",
					operation: "upload",
				},
				context,
			),
		).rejects.toThrow("User not authenticated");
	});

	it("should reject users without cloud backup enabled", async () => {
		const context = createMockContext({
			user: {
				id: "user-123",
				cloudBackupEnabled: false,
			},
		});

		mockDb.query.user.findFirst.mockResolvedValue({
			id: "user-123",
			cloudBackupEnabled: false,
		});

		await expect(
			storageRouter.procedures.getPresignedUrl(
				{
					snapshotId: "test-snapshot",
					operation: "upload",
				},
				context,
			),
		).rejects.toThrow("Cloud backup not enabled for your account");
	});

	it("should reject users over quota when uploading", async () => {
		const context = createMockContext({
			user: {
				id: "user-123",
				cloudBackupEnabled: true,
			},
		});

		mockDb.query.user.findFirst.mockResolvedValue({
			id: "user-123",
			cloudBackupEnabled: true,
			subscriptions: [{ id: "sub-123" }],
		});

		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue([{ cloudStorageUsedMb: 100, cloudStorageLimitMb: 50 }]),
			}),
		});

		await expect(
			storageRouter.procedures.getPresignedUrl(
				{
					snapshotId: "test-snapshot",
					operation: "upload",
				},
				context,
			),
		).rejects.toThrow("Storage quota exceeded. Upgrade your plan.");
	});

	it("should generate presigned URL for valid request", async () => {
		const context = createMockContext({
			user: {
				id: "user-123",
				cloudBackupEnabled: true,
			},
		});

		mockDb.query.user.findFirst.mockResolvedValue({
			id: "user-123",
			cloudBackupEnabled: true,
			subscriptions: [{ id: "sub-123" }],
		});

		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue([{ cloudStorageUsedMb: 50, cloudStorageLimitMb: 100 }]),
			}),
		});

		const result = await storageRouter.procedures.getPresignedUrl(
			{
				snapshotId: "test-snapshot",
				operation: "upload",
			},
			context,
		);

		expect(result).toHaveProperty("url");
		expect(result).toHaveProperty("key");
		expect(result).toHaveProperty("cdnUrl");
		expect(result).toHaveProperty("expiresAt");
		expect(result.key).toBe("users/user-123/snapshots/test-snapshot.enc");
	});

	it("should allow download even when at quota limit", async () => {
		const context = createMockContext({
			user: {
				id: "user-123",
				cloudBackupEnabled: true,
			},
		});

		mockDb.query.user.findFirst.mockResolvedValue({
			id: "user-123",
			cloudBackupEnabled: true,
			subscriptions: [{ id: "sub-123" }],
		});

		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue([{ cloudStorageUsedMb: 100, cloudStorageLimitMb: 100 }]),
			}),
		});

		const result = await storageRouter.procedures.getPresignedUrl(
			{
				snapshotId: "test-snapshot",
				operation: "download",
			},
			context,
		);

		expect(result).toHaveProperty("url");
	});
});
