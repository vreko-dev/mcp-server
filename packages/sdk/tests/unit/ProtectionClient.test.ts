import { beforeEach, describe, expect, it } from "vitest";
import { ProtectionClient } from "../../src/client/ProtectionClient";
import { createMockCache, createMockHttp } from "../helpers";
import { generateTestProtectedFile } from "../setup";

describe("ProtectionClient", () => {
	let client: ProtectionClient;
	let mockHttp: any;
	let mockCache: any;

	beforeEach(() => {
		mockHttp = createMockHttp();
		mockCache = createMockCache();
		client = new ProtectionClient(mockHttp, mockCache);
	});

	describe("protect", () => {
		it("should protect file with level", async () => {
			const protectedFile = generateTestProtectedFile({
				path: "/test.ts",
				level: "block",
			});
			mockHttp.setMockResponse("POST", "protection", protectedFile);

			const result = await client.protect("/test.ts", "block");

			expect(result.level).toBe("block");
			expect(mockHttp.post).toHaveBeenCalledWith("protection", {
				json: {
					path: "/test.ts",
					level: "block",
					reason: undefined,
				},
			});
		});

		it("should protect file with reason", async () => {
			const protectedFile = generateTestProtectedFile({
				reason: "Critical config",
			});
			mockHttp.setMockResponse("POST", "protection", protectedFile);

			const result = await client.protect("/test.ts", "block", "Critical config");

			expect(result.reason).toBe("Critical config");
		});

		it("should invalidate cache after protect", async () => {
			mockCache.set("protection:list", []);

			await client.protect("/test.ts", "watch");

			expect(mockCache.delete).toHaveBeenCalledWith("protection:list");
		});
	});

	describe("unprotect", () => {
		it("should unprotect file", async () => {
			await client.unprotect("/test.ts");

			expect(mockHttp.delete).toHaveBeenCalledWith("protection", {
				json: { path: "/test.ts" },
			});
		});

		it("should invalidate cache after unprotect", async () => {
			mockCache.set("protection:/test.ts", {});
			mockCache.set("protection:list", []);

			await client.unprotect("/test.ts");

			expect(mockCache.delete).toHaveBeenCalledWith("protection:/test.ts");
			expect(mockCache.delete).toHaveBeenCalledWith("protection:list");
		});
	});

	describe("get", () => {
		it("should get protection status for file", async () => {
			const protectedFile = generateTestProtectedFile();
			mockHttp.setMockResponse("GET", "protection", protectedFile, {
				path: "/test.ts",
			});

			const result = await client.get("/test.ts");

			expect(result?.level).toBe("watch");
			expect(mockHttp.get).toHaveBeenCalledWith("protection", {
				searchParams: { path: "/test.ts" },
			});
		});

		it("should return null for unprotected file", async () => {
			mockHttp.setMockResponse("GET", "protection", null, {
				path: "/test.ts",
			});

			const result = await client.get("/test.ts");

			expect(result).toBeNull();
		});

		it("should use cache on second call", async () => {
			const protectedFile = generateTestProtectedFile();
			mockHttp.setMockResponse("GET", "protection", protectedFile, {
				path: "/test.ts",
			});

			await client.get("/test.ts");
			await client.get("/test.ts");

			expect(mockHttp.get).toHaveBeenCalledTimes(1);
		});
	});

	describe("list", () => {
		it("should list all protected files", async () => {
			const protectedFiles = [
				generateTestProtectedFile({ path: "/test1.ts" }),
				generateTestProtectedFile({ path: "/test2.ts" }),
			];
			mockHttp.setMockResponse("GET", "protection/list", protectedFiles, {});

			const result = await client.list();

			expect(result).toHaveLength(2);
		});

		it("should filter by protection level", async () => {
			await client.list({ level: "block" });

			expect(mockHttp.get).toHaveBeenCalledWith("protection/list", {
				searchParams: { level: "block" },
			});
		});

		it("should use cache on second call", async () => {
			mockHttp.setMockResponse("GET", "protection/list", [], {});

			await client.list();
			await client.list();

			expect(mockHttp.get).toHaveBeenCalledTimes(1);
		});
	});

	describe("update", () => {
		it("should update protection level", async () => {
			const updated = generateTestProtectedFile({ level: "warn" });
			mockHttp.setMockResponse("PUT", "protection", updated);

			const result = await client.update("/test.ts", "warn");

			expect(result.level).toBe("warn");
			expect(mockHttp.put).toHaveBeenCalledWith("protection", {
				json: {
					path: "/test.ts",
					level: "warn",
					reason: undefined,
				},
			});
		});

		it("should update protection reason", async () => {
			const updated = generateTestProtectedFile({ reason: "New reason" });
			mockHttp.setMockResponse("PUT", "protection", updated);

			const result = await client.update("/test.ts", "block", "New reason");

			expect(result.reason).toBe("New reason");
		});

		it("should invalidate cache after update", async () => {
			mockCache.set("protection:/test.ts", {});

			await client.update("/test.ts", "warn");

			expect(mockCache.delete).toHaveBeenCalledWith("protection:/test.ts");
		});
	});
});
