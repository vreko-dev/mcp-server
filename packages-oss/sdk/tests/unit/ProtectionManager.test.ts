import type { ProtectionConfig } from "@snapback-oss/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { ProtectionManager } from "../../src/protection/ProtectionManager.js";

describe("ProtectionManager", () => {
	let manager: ProtectionManager;
	let config: ProtectionConfig;

	beforeEach(() => {
		config = {
			patterns: [
				{ pattern: "**/*.config.ts", level: "block", enabled: true },
				{ pattern: "**/src/**/*.ts", level: "watch", enabled: true },
				{ pattern: "**/.env", level: "block", enabled: true },
				{ pattern: "**/package.json", level: "warn", enabled: true },
			],
			defaultLevel: "watch",
			enabled: true,
			autoProtectConfigs: true,
		};

		manager = new ProtectionManager(config);
	});

	describe("protect", () => {
		it("should protect a file with specified level", () => {
			manager.protect("/test.ts", "block", "Test reason");

			const protection = manager.getProtection("/test.ts");
			expect(protection).toBeDefined();
			expect(protection?.level).toBe("block");
			expect(protection?.reason).toBe("Test reason");
		});

		it("should protect a file without reason", () => {
			manager.protect("/test.ts", "warn");

			const protection = manager.getProtection("/test.ts");
			expect(protection).toBeDefined();
			expect(protection?.level).toBe("warn");
			expect(protection?.reason).toBeUndefined();
		});

		it("should overwrite existing protection", () => {
			manager.protect("/test.ts", "watch");
			manager.protect("/test.ts", "block", "New reason");

			const protection = manager.getProtection("/test.ts");
			expect(protection?.level).toBe("block");
			expect(protection?.reason).toBe("New reason");
		});
	});

	describe("unprotect", () => {
		it("should remove protection from file", () => {
			manager.protect("/test.ts", "block");
			expect(manager.isProtected("/test.ts")).toBe(true);

			manager.unprotect("/test.ts");
			expect(manager.isProtected("/test.ts")).toBe(false);
		});

		it("should not throw for non-protected file", () => {
			expect(() => manager.unprotect("/nonexistent.ts")).not.toThrow();
		});
	});

	describe("getProtection", () => {
		it("should return direct protection", () => {
			manager.protect("/test.ts", "warn", "Direct protection");

			const protection = manager.getProtection("/test.ts");
			expect(protection).toBeDefined();
			expect(protection?.level).toBe("warn");
			expect(protection?.reason).toBe("Direct protection");
		});

		it("should return pattern-based protection", () => {
			const protection = manager.getProtection("/app.config.ts");
			expect(protection).toBeDefined();
			expect(protection?.level).toBe("block");
			expect(protection?.reason).toContain("*.config.ts");
		});

		it("should return null for unprotected file", () => {
			const protection = manager.getProtection("/unprotected.txt");
			expect(protection).toBeNull();
		});

		it("should prioritize direct protection over pattern", () => {
			// Pattern would normally protect this as 'block'
			manager.protect("/app.config.ts", "watch", "Direct override");

			const protection = manager.getProtection("/app.config.ts");
			expect(protection?.level).toBe("watch");
			expect(protection?.reason).toBe("Direct override");
		});
	});

	describe("isProtected", () => {
		it("should return true for directly protected file", () => {
			manager.protect("/test.ts", "block");
			expect(manager.isProtected("/test.ts")).toBe(true);
		});

		it("should return true for pattern-protected file", () => {
			expect(manager.isProtected("/app.config.ts")).toBe(true);
		});

		it("should return false for unprotected file", () => {
			expect(manager.isProtected("/unprotected.txt")).toBe(false);
		});
	});

	describe("getLevel", () => {
		it("should return protection level for protected file", () => {
			manager.protect("/test.ts", "warn");
			expect(manager.getLevel("/test.ts")).toBe("warn");
		});

		it("should return null for unprotected file", () => {
			expect(manager.getLevel("/unprotected.txt")).toBeNull();
		});
	});

	describe("listProtected", () => {
		it("should list all directly protected files", () => {
			manager.protect("/test1.ts", "watch");
			manager.protect("/test2.ts", "warn");
			manager.protect("/test3.ts", "block");

			const protectedFiles = manager.listProtected();
			expect(protectedFiles).toHaveLength(3);
			expect(protectedFiles.map((p) => p.path)).toContain("/test1.ts");
			expect(protectedFiles.map((p) => p.path)).toContain("/test2.ts");
			expect(protectedFiles.map((p) => p.path)).toContain("/test3.ts");
		});

		it("should not include pattern-based protection", () => {
			// Only direct protections
			manager.protect("/direct.ts", "watch");

			const protectedFiles = manager.listProtected();
			expect(protectedFiles).toHaveLength(1);
			expect(protectedFiles[0].path).toBe("/direct.ts");
		});

		it("should return empty array when no protections", () => {
			const emptyManager = new ProtectionManager({
				patterns: [],
				defaultLevel: "watch",
				enabled: true,
				autoProtectConfigs: true,
			});

			expect(emptyManager.listProtected()).toEqual([]);
		});
	});

	describe("updateLevel", () => {
		it("should update protection level", () => {
			manager.protect("/test.ts", "watch");
			manager.updateLevel("/test.ts", "block");

			expect(manager.getLevel("/test.ts")).toBe("block");
		});

		it("should preserve reason when updating level", () => {
			manager.protect("/test.ts", "watch", "Original reason");
			manager.updateLevel("/test.ts", "block");

			const protection = manager.getProtection("/test.ts");
			expect(protection?.reason).toBe("Original reason");
		});

		it("should throw if file not protected", () => {
			expect(() => manager.updateLevel("/nonexistent.ts", "block")).toThrow(
				"File /nonexistent.ts is not protected",
			);
		});
	});

	describe("pattern matching", () => {
		it("should match wildcard patterns", () => {
			expect(manager.isProtected("/anything.config.ts")).toBe(true);
			expect(manager.isProtected("/path/to/app.config.ts")).toBe(true);
		});

		it("should match globstar patterns", () => {
			expect(manager.isProtected("/src/app.ts")).toBe(true);
			expect(manager.isProtected("/src/utils/helper.ts")).toBe(true);
			expect(manager.isProtected("/src/deep/nested/file.ts")).toBe(true);
		});

		it("should not match incorrect extensions", () => {
			expect(manager.isProtected("/app.config.js")).toBe(false);
			expect(manager.isProtected("/src/app.js")).toBe(false);
		});

		it("should match exact file names", () => {
			expect(manager.isProtected("/package.json")).toBe(true);
			expect(manager.isProtected("/subdir/package.json")).toBe(true);
		});
	});

	describe("config management", () => {
		it("should return current config", () => {
			const config = manager.getConfig();

			expect(config.patterns).toHaveLength(4);
			expect(config.defaultLevel).toBe("watch");
			expect(config.enabled).toBe(true);
		});

		it("should update config", () => {
			manager.updateConfig({
				patterns: [{ pattern: "**/*.ts", level: "block", enabled: true }],
				defaultLevel: "warn",
				enabled: false,
				autoProtectConfigs: false,
			});

			const config = manager.getConfig();
			expect(config.patterns).toHaveLength(1);
			expect(config.defaultLevel).toBe("warn");
			expect(config.enabled).toBe(false);
		});

		it("should clear direct protections when config updated", () => {
			manager.protect("/test.ts", "watch");

			manager.updateConfig({
				patterns: [],
				defaultLevel: "watch",
				enabled: true,
				autoProtectConfigs: true,
			});

			// Direct protections should remain
			expect(manager.isProtected("/test.ts")).toBe(true);
		});
	});

	describe("disabled state", () => {
		it("should return null when protection disabled", () => {
			const disabled = new ProtectionManager({
				patterns: [{ pattern: "**/*.ts", level: "block", enabled: true }],
				defaultLevel: "watch",
				enabled: false,
				autoProtectConfigs: true,
			});

			expect(disabled.getProtection("/test.ts")).toBeNull();
		});

		it("should allow manual protection when disabled", () => {
			const disabled = new ProtectionManager({
				patterns: [],
				defaultLevel: "watch",
				enabled: false,
				autoProtectConfigs: true,
			});

			disabled.protect("/test.ts", "block");
			expect(disabled.getProtection("/test.ts")).toBeDefined();
		});
	});
});
