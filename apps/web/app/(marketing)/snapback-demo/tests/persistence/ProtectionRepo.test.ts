import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../persistence/db.js";
import { ProtectionRepo } from "../../persistence/ProtectionRepo.js";

describe("ProtectionRepo", () => {
	let protectionRepo: ProtectionRepo;

	beforeEach(async () => {
		protectionRepo = new ProtectionRepo();
		// Clear the database before each test
		await db.protectedFiles.clear();
	});

	describe("save", () => {
		it("should create a new protected file", async () => {
			const protectedFileData = {
				path: "src/index.ts",
				protectionLevel: "watch" as const,
			};

			const protectedFile = await protectionRepo.save(protectedFileData);

			expect(protectedFile.id).toBeDefined();
			expect(protectedFile.path).toBe(protectedFileData.path);
			expect(protectedFile.protectionLevel).toBe(
				protectedFileData.protectionLevel,
			);
		});

		it("should update an existing protected file", async () => {
			const protectedFileData = {
				path: "src/index.ts",
				protectionLevel: "watch" as const,
			};

			const createdFile = await protectionRepo.save(protectedFileData);

			const updatedFile = await protectionRepo.save({
				id: createdFile.id,
				path: "src/index.ts",
				protectionLevel: "block",
			});

			expect(updatedFile.id).toBe(createdFile.id);
			expect(updatedFile.protectionLevel).toBe("block");
		});
	});

	describe("getByPath", () => {
		it("should retrieve a protected file by path", async () => {
			const protectedFileData = {
				path: "src/index.ts",
				protectionLevel: "warn" as const,
			};

			const createdFile = await protectionRepo.save(protectedFileData);
			const retrievedFile = await protectionRepo.getByPath("src/index.ts");

			expect(retrievedFile).toEqual(createdFile);
		});

		it("should return undefined for non-existent file", async () => {
			const protectedFile = await protectionRepo.getByPath("non-existent.ts");
			expect(protectedFile).toBeUndefined();
		});
	});

	describe("getAll", () => {
		it("should retrieve all protected files", async () => {
			// Create test protected files
			await protectionRepo.save({
				path: "src/index.ts",
				protectionLevel: "watch",
			});

			await protectionRepo.save({
				path: "src/utils/helpers.ts",
				protectionLevel: "warn",
			});

			const protectedFiles = await protectionRepo.getAll();

			expect(protectedFiles).toHaveLength(2);
			expect(protectedFiles.some((f) => f.path === "src/index.ts")).toBe(true);
			expect(
				protectedFiles.some((f) => f.path === "src/utils/helpers.ts"),
			).toBe(true);
		});
	});

	describe("updateProtectionLevel", () => {
		it("should update protection level for existing file", async () => {
			const protectedFileData = {
				path: "src/index.ts",
				protectionLevel: "watch" as const,
			};

			await protectionRepo.save(protectedFileData);
			await protectionRepo.updateProtectionLevel("src/index.ts", "block");

			const updatedFile = await protectionRepo.getByPath("src/index.ts");

			expect(updatedFile?.protectionLevel).toBe("block");
		});

		it("should create new protected file if it does not exist", async () => {
			await protectionRepo.updateProtectionLevel("src/new-file.ts", "warn");

			const newFile = await protectionRepo.getByPath("src/new-file.ts");

			expect(newFile).toBeDefined();
			expect(newFile?.protectionLevel).toBe("warn");
		});
	});

	describe("removeProtection", () => {
		it("should remove protection from a file", async () => {
			const protectedFileData = {
				path: "src/index.ts",
				protectionLevel: "watch" as const,
			};

			await protectionRepo.save(protectedFileData);
			await protectionRepo.removeProtection("src/index.ts");

			const removedFile = await protectionRepo.getByPath("src/index.ts");

			expect(removedFile).toBeUndefined();
		});

		it("should do nothing for non-existent file", async () => {
			// Should not throw an error
			await expect(
				protectionRepo.removeProtection("non-existent.ts"),
			).resolves.toBeUndefined();
		});
	});
});
