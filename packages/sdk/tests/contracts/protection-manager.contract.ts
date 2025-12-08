/**
 * Contract Test: ProtectionManager
 *
 * Per arch_remediation.md Task 1.2: This test defines the EXPECTED interface
 * that all consumers (VSCode, MCP, CLI) can rely on. If this test passes,
 * consumers can trust the interface won't break.
 *
 * The SDK ProtectionManager is the Single Source of Truth (SSOT) for:
 * - isProtected() decisions
 * - getLevel() decisions
 * - Protection registration/unregistration
 */

import type { ProtectionConfig, ProtectionLevel } from "@snapback/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { ProtectionManager } from "../../src/protection/ProtectionManager";

describe("Contract: SDK ProtectionManager", () => {
	let manager: ProtectionManager;
	let defaultConfig: ProtectionConfig;

	beforeEach(() => {
		defaultConfig = {
			patterns: [],
			defaultLevel: "watch",
			enabled: true,
			autoProtectConfigs: true,
		};
		manager = new ProtectionManager(defaultConfig);
	});

	describe("Interface Compliance", () => {
		it("should implement protect(path: string, level: ProtectionLevel): void", () => {
			expect(typeof manager.protect).toBe("function");

			// Should not throw
			expect(() => {
				manager.protect("/src/index.ts", "watch");
			}).not.toThrow();
		});

		it("should implement unprotect(path: string): void", () => {
			expect(typeof manager.unprotect).toBe("function");

			// Should not throw even for non-existent file
			expect(() => {
				manager.unprotect("/nonexistent.ts");
			}).not.toThrow();
		});

		it("should implement isProtected(path: string): boolean", () => {
			expect(typeof manager.isProtected).toBe("function");
			expect(manager.isProtected.length).toBe(1); // Takes 1 arg

			const result = manager.isProtected("/any/path");
			expect(typeof result).toBe("boolean");
		});

		it("should implement getLevel(path: string): ProtectionLevel | null", () => {
			expect(typeof manager.getLevel).toBe("function");

			// Unregistered file should return null
			const result = manager.getLevel("/unregistered.ts");
			expect(result).toBeNull();
		});

		it("should implement listProtected(): ProtectedFile[]", () => {
			expect(typeof manager.listProtected).toBe("function");

			const result = manager.listProtected();
			expect(Array.isArray(result)).toBe(true);
		});

		it("should implement getProtection(path: string): ProtectedFile | null", () => {
			expect(typeof manager.getProtection).toBe("function");

			// Unregistered file should return null
			const result = manager.getProtection("/unregistered.ts");
			expect(result).toBeNull();
		});
	});

	describe("Behavioral Guarantees", () => {
		it("isProtected should return true after protect()", () => {
			const path = "/src/important.ts";

			expect(manager.isProtected(path)).toBe(false);
			manager.protect(path, "watch");
			expect(manager.isProtected(path)).toBe(true);
		});

		it("isProtected should return false after unprotect()", () => {
			const path = "/src/important.ts";

			manager.protect(path, "watch");
			expect(manager.isProtected(path)).toBe(true);

			manager.unprotect(path);
			expect(manager.isProtected(path)).toBe(false);
		});

		it("getLevel should return registered level", () => {
			const path = "/src/critical.ts";

			manager.protect(path, "block");
			expect(manager.getLevel(path)).toBe("block");

			// Re-protect with different level should update
			manager.protect(path, "watch");
			expect(manager.getLevel(path)).toBe("watch");
		});

		it("listProtected should include all registered files", () => {
			manager.protect("/src/a.ts", "watch");
			manager.protect("/src/b.ts", "warn");

			const files = manager.listProtected();
			const paths = files.map((f) => f.path);

			expect(paths).toContain("/src/a.ts");
			expect(paths).toContain("/src/b.ts");
		});

		it("listProtected should NOT include unregistered files", () => {
			manager.protect("/src/a.ts", "watch");
			manager.protect("/src/b.ts", "warn");
			manager.unprotect("/src/a.ts");

			const files = manager.listProtected();
			const paths = files.map((f) => f.path);

			expect(paths).not.toContain("/src/a.ts");
			expect(paths).toContain("/src/b.ts");
		});
	});

	describe("Determinism Guarantees", () => {
		it("isProtected should be deterministic for same state", () => {
			manager.protect("/src/index.ts", "watch");

			const result1 = manager.isProtected("/src/index.ts");
			const result2 = manager.isProtected("/src/index.ts");

			expect(result1).toBe(result2);
		});

		it("getLevel should be deterministic for same state", () => {
			manager.protect("/src/index.ts", "block");

			const result1 = manager.getLevel("/src/index.ts");
			const result2 = manager.getLevel("/src/index.ts");

			expect(result1).toBe(result2);
		});
	});

	describe("Pattern-Based Protection", () => {
		it("should match files by pattern when enabled", () => {
			const configWithPatterns: ProtectionConfig = {
				patterns: [
					{ pattern: "**/*.env*", level: "block", enabled: true },
					{ pattern: "**/package.json", level: "warn", enabled: true },
				],
				defaultLevel: "watch",
				enabled: true,
				autoProtectConfigs: true,
			};

			const patternManager = new ProtectionManager(configWithPatterns);

			// Should match pattern
			expect(patternManager.isProtected("/project/.env")).toBe(true);
			expect(patternManager.isProtected("/project/.env.local")).toBe(true);
			expect(patternManager.isProtected("/project/package.json")).toBe(true);

			// Should return correct levels from patterns
			expect(patternManager.getLevel("/project/.env")).toBe("block");
			expect(patternManager.getLevel("/project/package.json")).toBe("warn");
		});

		it("should respect disabled patterns", () => {
			const configWithDisabled: ProtectionConfig = {
				patterns: [{ pattern: "**/*.ts", level: "warn", enabled: false }],
				defaultLevel: "watch",
				enabled: true,
				autoProtectConfigs: true,
			};

			const disabledManager = new ProtectionManager(configWithDisabled);

			// Should NOT match disabled pattern
			expect(disabledManager.isProtected("/src/index.ts")).toBe(false);
		});

		it("explicit protection should take precedence over patterns", () => {
			const configWithPatterns: ProtectionConfig = {
				patterns: [{ pattern: "**/*.ts", level: "watch", enabled: true }],
				defaultLevel: "watch",
				enabled: true,
				autoProtectConfigs: true,
			};

			const precedenceManager = new ProtectionManager(configWithPatterns);

			// First, file matches pattern at 'watch'
			expect(precedenceManager.getLevel("/src/critical.ts")).toBe("watch");

			// Explicitly protect at 'block'
			precedenceManager.protect("/src/critical.ts", "block");

			// Explicit protection should take precedence
			expect(precedenceManager.getLevel("/src/critical.ts")).toBe("block");
		});
	});

	describe("Edge Cases (Consumer Safety)", () => {
		it("should handle empty string path", () => {
			expect(() => manager.isProtected("")).not.toThrow();
			expect(manager.isProtected("")).toBe(false);
		});

		it("should handle paths with special characters", () => {
			const weirdPath = "/path/with spaces/and$pecial#chars.ts";

			expect(() => manager.protect(weirdPath, "watch")).not.toThrow();
			expect(manager.isProtected(weirdPath)).toBe(true);
		});

		it("should handle relative paths", () => {
			const relativePath = "src/index.ts";

			expect(() => manager.protect(relativePath, "watch")).not.toThrow();
			expect(manager.isProtected(relativePath)).toBe(true);
		});

		it("should handle Windows-style paths", () => {
			const windowsPath = "C:\\Users\\dev\\project\\src\\index.ts";

			expect(() => manager.protect(windowsPath, "watch")).not.toThrow();
			expect(manager.isProtected(windowsPath)).toBe(true);
		});

		it("should handle very long paths", () => {
			const longPath = `/a${"/a".repeat(499)}/file.ts`;

			expect(() => manager.protect(longPath, "watch")).not.toThrow();
			expect(manager.isProtected(longPath)).toBe(true);
		});
	});

	describe("Protection Levels", () => {
		const validLevels: ProtectionLevel[] = ["watch", "warn", "block"];

		for (const level of validLevels) {
			it(`should accept '${level}' as a valid protection level`, () => {
				const path = `/src/${level}-test.ts`;

				expect(() => manager.protect(path, level)).not.toThrow();
				expect(manager.getLevel(path)).toBe(level);
			});
		}

		it("should return exact level that was registered", () => {
			manager.protect("/src/block.ts", "block");
			manager.protect("/src/warn.ts", "warn");
			manager.protect("/src/watch.ts", "watch");

			expect(manager.getLevel("/src/block.ts")).toBe("block");
			expect(manager.getLevel("/src/warn.ts")).toBe("warn");
			expect(manager.getLevel("/src/watch.ts")).toBe("watch");
		});
	});

	describe("Config Management", () => {
		it("should return config via getConfig()", () => {
			const config = manager.getConfig();

			expect(config).toEqual(defaultConfig);
		});

		it("should update config via updateConfig()", () => {
			const newConfig: Partial<ProtectionConfig> = {
				enabled: false,
			};

			manager.updateConfig(newConfig as ProtectionConfig);
			const config = manager.getConfig();

			expect(config.enabled).toBe(false);
		});
	});
});
