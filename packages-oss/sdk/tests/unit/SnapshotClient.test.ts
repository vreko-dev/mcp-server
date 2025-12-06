import { beforeEach, describe, expect, it } from "vitest";
import { SnapshotClient } from "../../src/client/SnapshotClient";
import { createMockCache, createMockHttp } from "../helpers";
import { generateTestSnapshot } from "../setup";

describe("SnapshotClient", () => {
	let client: SnapshotClient;
	let mockHttp: any;
	let mockCache: any;

	beforeEach(() => {
		mockHttp = createMockHttp();
		mockCache = createMockCache();
		client = new SnapshotClient(mockHttp, mockCache);
	});

	describe("create", () => {
		it("should create snapshot via API", async () => {
			const expectedSnapshot = generateTestSnapshot();
			mockHttp.setMockResponse("POST", "snapshots", expectedSnapshot);

			const snapshot = await client.create({
				filePath: "/test.ts",
				content: "test content",
			});

			expect(snapshot.id).toBe(expectedSnapshot.id);
			expect(mockHttp.post).toHaveBeenCalledWith("snapshots", {
				json: {
					filePath: "/test.ts",
					content: "test content",
					message: undefined,
					protected: undefined,
				},
			});
		});

		it("should create snapshot with message", async () => {
			const expectedSnapshot = generateTestSnapshot({
				message: "Test message",
			});
			mockHttp.setMockResponse("POST", "snapshots", expectedSnapshot);

			const snapshot = await client.create({
				filePath: "/test.ts",
				content: "test content",
				message: "Test message",
			});

			expect(snapshot.message).toBe("Test message");
		});

		it("should create protected snapshot", async () => {
			const expectedSnapshot = generateTestSnapshot({ protected: true });
			mockHttp.setMockResponse("POST", "snapshots", expectedSnapshot);

			const snapshot = await client.create({
				filePath: "/test.ts",
				content: "test content",
				protected: true,
			});

			expect(snapshot.protected).toBe(true);
		});

		it("should invalidate cache after create", async () => {
			mockCache.set("snapshots:list", []);

			await client.create({
				filePath: "/test.ts",
				content: "test",
			});

			expect(mockCache.delete).toHaveBeenCalledWith("snapshots:list");
		});

		it("should handle API errors", async () => {
			mockHttp.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(client.create({ filePath: "/test.ts", content: "test" })).rejects.toThrow("API Error");
		});
	});

	describe("list", () => {
		it("should list all snapshots", async () => {
			const snapshots = [generateTestSnapshot({ id: "1" }), generateTestSnapshot({ id: "2" })];
			mockHttp.setMockResponse("GET", "snapshots", snapshots, {});

			const result = await client.list();

			expect(result).toHaveLength(2);
			expect(mockHttp.get).toHaveBeenCalledWith("snapshots", {
				searchParams: undefined,
			});
		});

		it("should filter by file path", async () => {
			const snapshots = [generateTestSnapshot()];
			mockHttp.setMockResponse("GET", "snapshots", snapshots, {
				filePath: "/test.ts",
			});

			await client.list({ filePath: "/test.ts" });

			expect(mockHttp.get).toHaveBeenCalledWith("snapshots", {
				searchParams: { filePath: "/test.ts" },
			});
		});

		it("should filter by protected status", async () => {
			await client.list({ protected: true });

			expect(mockHttp.get).toHaveBeenCalledWith("snapshots", {
				searchParams: { protected: true },
			});
		});

		it("should filter by date range", async () => {
			const before = new Date("2025-01-01");
			const after = new Date("2024-01-01");

			await client.list({ before, after });

			expect(mockHttp.get).toHaveBeenCalledWith("snapshots", {
				searchParams: { before, after },
			});
		});

		it("should respect limit", async () => {
			await client.list({ limit: 10 });

			expect(mockHttp.get).toHaveBeenCalledWith("snapshots", {
				searchParams: { limit: 10 },
			});
		});

		it("should use cache on second call with same filters", async () => {
			const snapshots = [generateTestSnapshot()];
			mockHttp.setMockResponse("GET", "snapshots", snapshots, {});

			// First call
			await client.list();
			expect(mockHttp.get).toHaveBeenCalledTimes(1);

			// Second call (should use cache)
			await client.list();
			expect(mockHttp.get).toHaveBeenCalledTimes(1); // Still 1!
		});

		it("should not use cache with different filters", async () => {
			await client.list({ filePath: "/test1.ts" });
			await client.list({ filePath: "/test2.ts" });

			expect(mockHttp.get).toHaveBeenCalledTimes(2);
		});
	});

	describe("get", () => {
		it("should get snapshot by ID", async () => {
			const snapshot = generateTestSnapshot({ id: "snap_123" });
			mockHttp.setMockResponse("GET", "snapshots/snap_123", snapshot);

			const result = await client.get("snap_123");

			expect(result.id).toBe("snap_123");
			expect(mockHttp.get).toHaveBeenCalledWith("snapshots/snap_123");
		});

		it("should use cache on second call", async () => {
			const snapshot = generateTestSnapshot();
			mockHttp.setMockResponse("GET", `snapshots/${snapshot.id}`, snapshot);

			await client.get(snapshot.id);
			await client.get(snapshot.id);

			expect(mockHttp.get).toHaveBeenCalledTimes(1);
		});

		it("should handle not found", async () => {
			mockHttp.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("Not found")),
			});

			await expect(client.get("nonexistent")).rejects.toThrow("Not found");
		});
	});

	describe("delete", () => {
		it("should delete snapshot", async () => {
			await client.delete("snap_123");

			expect(mockHttp.delete).toHaveBeenCalledWith("snapshots/snap_123");
		});

		it("should clear cache after delete", async () => {
			mockCache.set("snapshot:snap_123", {});
			mockCache.set("snapshots:list", []);

			await client.delete("snap_123");

			expect(mockCache.delete).toHaveBeenCalledWith("snapshot:snap_123");
			expect(mockCache.delete).toHaveBeenCalledWith("snapshots:list");
		});
	});

	describe("restore", () => {
		it("should restore snapshot", async () => {
			mockHttp.setMockResponse("POST", "snapshots/snap_123/restore", {
				success: true,
				restoredFiles: ["/test.ts"],
			});

			const result = await client.restore("snap_123");

			expect(result.success).toBe(true);
			expect(result.restoredFiles).toEqual(["/test.ts"]);
			expect(mockHttp.post).toHaveBeenCalledWith("snapshots/snap_123/restore");
		});

		it("should handle restore errors", async () => {
			mockHttp.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("Restore failed")),
			});

			await expect(client.restore("snap_123")).rejects.toThrow("Restore failed");
		});
	});

	describe("update", () => {
		it("should update snapshot metadata", async () => {
			const updatedSnapshot = generateTestSnapshot({
				id: "snap_123",
				message: "Updated message",
			});
			mockHttp.setMockResponse("PUT", "snapshots/snap_123", updatedSnapshot);

			const result = await client.update("snap_123", {
				message: "Updated message",
			});

			expect(result.message).toBe("Updated message");
		});

		it("should update protected status", async () => {
			const updatedSnapshot = generateTestSnapshot({
				id: "snap_123",
				protected: true,
			});
			mockHttp.setMockResponse("PUT", "snapshots/snap_123", updatedSnapshot);

			const result = await client.update("snap_123", {
				protected: true,
			});

			expect(result.protected).toBe(true);
		});

		it("should invalidate cache after update", async () => {
			mockCache.set("snapshot:snap_123", {});

			await client.update("snap_123", { message: "Updated" });

			expect(mockCache.delete).toHaveBeenCalledWith("snapshot:snap_123");
		});
	});
});
