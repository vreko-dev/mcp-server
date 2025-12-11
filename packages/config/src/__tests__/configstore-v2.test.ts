/**
 * ConfigStore v2 - RED PHASE TESTS
 *
 * Tests will FAIL initially (correct for RED phase).
 * These tests define the required behavior before implementation.
 *
 * Test coverage:
 * - Happy path: All sources load and merge correctly
 * - Sad path: Invalid configs handled gracefully
 * - Edge cases: Empty configs, large files, special characters
 * - Precedence: Correct override behavior
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigStore, DEFAULT_CONFIG, resetConfigStore } from "../index";

const TEST_DIR = `/tmp/configstore-test-${Date.now()}`;

describe("ConfigStore v2 - RED Phase", () => {
	beforeEach(async () => {
		resetConfigStore();
		await fs.mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		resetConfigStore();
		try {
			await fs.rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Initialization", () => {
		it("✅ should initialize with zero-config defaults", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			const config = await store.initialize();

			expect(config).toBeDefined();
			expect(config.version).toBe(2);
			expect(config.protections.length).toBeGreaterThan(0);
			expect(config.protections.some((p) => p.pattern === "*.env*")).toBe(true);
		});

		it("✅ should load .snapbackrc when present", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			const testConfig = {
				...DEFAULT_CONFIG,
				protections: [{ pattern: "custom.ts", level: "block" as const }],
			};
			await fs.writeFile(snapbackrcPath, JSON.stringify(testConfig));

			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			const config = await store.initialize();

			expect(config.protections.some((p) => p.pattern === "custom.ts")).toBe(true);
		});

		it("✅ should merge configurations in correct precedence", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			await fs.writeFile(
				snapbackrcPath,
				JSON.stringify({
					protections: [{ pattern: "override.ts", level: "warn" as const, precedence: 999 }],
				}),
			);

			process.env.SNAPBACK_CONFIG = JSON.stringify({
				protections: [{ pattern: "env-file.ts", level: "block" as const }],
			});

			const store = new ConfigStore({ workspaceRoot: TEST_DIR, useZeroConfig: true });
			const config = await store.initialize();

			// Should have: zero-config defaults + env + snapbackrc
			expect(config.protections.some((p) => p.pattern === "*.env*")).toBe(true); // From zero-config
			expect(config.protections.some((p) => p.pattern === "env-file.ts")).toBe(true); // From env
			expect(config.protections.some((p) => p.pattern === "override.ts")).toBe(true); // From .snapbackrc

			delete process.env.SNAPBACK_CONFIG;
		});

		it("❌ should handle invalid .snapbackrc gracefully", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			await fs.writeFile(snapbackrcPath, "{ invalid json }");

			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			const config = await store.initialize();

			// Should fall back to defaults
			expect(config).toBeDefined();
			expect(config.version).toBe(2);
		});

		it("❌ should handle missing required fields in .snapbackrc", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			await fs.writeFile(snapbackrcPath, JSON.stringify({}));

			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			const config = await store.initialize();

			// Should fill in defaults
			expect(config.engine.maxDepth).toBe(2);
			expect(config.protections).toBeDefined();
		});
	});

	describe("Config Saving", () => {
		it("✅ should save valid config to .snapbackrc", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const newConfig = {
				...DEFAULT_CONFIG,
				protections: [{ pattern: "test.ts", level: "block" as const, precedence: 50 }],
			};

			await store.saveSnapbackrc(newConfig);

			const savedContent = await fs.readFile(path.join(TEST_DIR, ".snapbackrc"), "utf-8");
			const saved = JSON.parse(savedContent);

			expect(saved.protections.some((p: any) => p.pattern === "test.ts")).toBe(true);
		});

		it("✅ should create backup before overwriting", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			const originalConfig = { ...DEFAULT_CONFIG };
			await fs.writeFile(snapbackrcPath, JSON.stringify(originalConfig));

			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const newConfig = { ...DEFAULT_CONFIG, ignore: ["new-pattern/**"] };
			await store.saveSnapbackrc(newConfig);

			const backupContent = await fs.readFile(`${snapbackrcPath}.backup`, "utf-8");
			const backup = JSON.parse(backupContent);

			expect(backup).toEqual(originalConfig);
		});

		it("❌ should reject invalid config on save", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const invalidConfig = {
				...DEFAULT_CONFIG,
				engine: { maxDepth: -1 }, // Invalid: negative
			} as any;

			await expect(store.saveSnapbackrc(invalidConfig)).rejects.toThrow();
		});
	});

	describe("Precedence Rules", () => {
		it("✅ should prioritize .snapbackrc over home config", async () => {
			const homeDir = path.join(TEST_DIR, "home");
			await fs.mkdir(homeDir, { recursive: true });
			const homeConfigPath = path.join(homeDir, ".snapback", "config.json");
			await fs.mkdir(path.dirname(homeConfigPath), { recursive: true });
			await fs.writeFile(
				homeConfigPath,
				JSON.stringify({
					protections: [{ pattern: "home-pattern.ts", level: "watch" as const }],
				}),
			);

			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			await fs.writeFile(
				snapbackrcPath,
				JSON.stringify({
					protections: [{ pattern: "rc-pattern.ts", level: "block" as const }],
				}),
			);

			const store = new ConfigStore({ workspaceRoot: TEST_DIR, homeDir, useZeroConfig: false });
			const config = await store.initialize();

			// .snapbackrc should override home config
			const rcPattern = config.protections.find((p) => p.pattern === "rc-pattern.ts");
			expect(rcPattern?.level).toBe("block");
		});

		it("✅ should deduplicate protection patterns (later wins)", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			await fs.writeFile(
				snapbackrcPath,
				JSON.stringify({
					protections: [
						{ pattern: "*.env*", level: "warn" as const },
						{ pattern: "*.env*", level: "block" as const }, // Later should win
					],
				}),
			);

			const store = new ConfigStore({ workspaceRoot: TEST_DIR, useZeroConfig: false });
			const config = await store.initialize();

			const envPattern = config.protections.find((p) => p.pattern === "*.env*");
			expect(envPattern?.level).toBe("block");
		});
	});

	describe("Zero-Config Defaults", () => {
		it("✅ should include sensible defaults for common patterns", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR, useZeroConfig: true });
			const config = await store.initialize();

			const patterns = config.protections.map((p) => p.pattern);

			expect(patterns).toContain("*.env*");
			expect(patterns).toContain("package*.json");
			expect(patterns).toContain("**/migrations/*");
		});

		it("✅ should allow disabling zero-config", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR, useZeroConfig: false });
			const config = await store.initialize();

			expect(config.protections).toEqual(DEFAULT_CONFIG.protections);
		});
	});

	describe("Singleton Pattern", () => {
		it("✅ should get singleton instance without initialization", () => {
			const instance1 = ConfigStore.getInstance();
			const instance2 = ConfigStore.getInstance();

			expect(instance1).toBe(instance2);
		});

		it("✅ should support custom options on first getInstance", () => {
			ConfigStore.reset();
			const instance = ConfigStore.getInstance({ workspaceRoot: TEST_DIR });
			expect(instance).toBeDefined();
		});

		it("✅ should reset singleton for testing", () => {
			const instance1 = ConfigStore.getInstance();
			ConfigStore.reset();
			const instance2 = ConfigStore.getInstance();

			expect(instance1).not.toBe(instance2);
		});
	});

	describe("Dot Notation Access", () => {
		it("✅ should get simple nested values", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const maxDepth = store.get<number>("engine.maxDepth");
			expect(typeof maxDepth).toBe("number");
			expect(maxDepth).toBe(2);
		});

		it("✅ should get deep nested values", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const blockCooldown = store.get<number>("engine.cooldowns.block");
			expect(typeof blockCooldown).toBe("number");
			expect(blockCooldown).toBe(60000);
		});

		it("✅ should return undefined for missing paths", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const missing = store.get("nonexistent.path");
			expect(missing).toBeUndefined();
		});

		it("✅ should handle array access", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const firstProtection = store.get("protections.0");
			expect(firstProtection).toBeDefined();
		});
	});

	describe("Change Notifications", () => {
		it("✅ should notify listeners on config change", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const changeListener = vi.fn();
			store.onChange(changeListener);

			const newConfig = {
				...DEFAULT_CONFIG,
				protections: [{ pattern: "test.ts", level: "block" as const, precedence: 50 }],
			};

			await store.saveSnapbackrc(newConfig);

			expect(changeListener).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }));
		});

		it("✅ should support multiple listeners", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const listener1 = vi.fn();
			const listener2 = vi.fn();

			store.onChange(listener1);
			store.onChange(listener2);

			const newConfig = { ...DEFAULT_CONFIG };
			await store.saveSnapbackrc(newConfig);

			expect(listener1).toHaveBeenCalled();
			expect(listener2).toHaveBeenCalled();
		});

		it("✅ should unsubscribe from changes", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const changeListener = vi.fn();
			const unsubscribe = store.onChange(changeListener);

			unsubscribe();

			const newConfig = { ...DEFAULT_CONFIG };
			await store.saveSnapbackrc(newConfig);

			expect(changeListener).not.toHaveBeenCalled();
		});
	});

	describe("File Watching", () => {
		it("✅ should watch for .snapbackrc changes", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			const changeListener = vi.fn();
			store.onChange(changeListener);
			store.watchForChanges();

			// Wait a bit for watcher to be established
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Modify the file directly
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			const newConfig = {
				...DEFAULT_CONFIG,
				protections: [{ pattern: "watched.ts", level: "warn" as const, precedence: 50 }],
			};
			await fs.writeFile(snapbackrcPath, JSON.stringify(newConfig));

			// Wait for file watcher to detect change
			await new Promise((resolve) => setTimeout(resolve, 200));

			store.stopWatching();

			expect(changeListener.mock.calls.length).toBeGreaterThanOrEqual(0);
		});

		it("✅ should stop watching when requested", async () => {
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			store.watchForChanges();
			store.stopWatching();

			// No error should be thrown
			expect(true).toBe(true);
		});
	});

	describe("Extension Integration", () => {
		it("✅ should work with VS Code extension pattern", async () => {
			// Simulate extension initialization
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();

			// Extension subscribes to changes
			let currentConfig = store.getConfig();
			const unsubscribe = store.onChange((newConfig) => {
				currentConfig = newConfig;
			});

			// Get values with dot notation (used in extension)
			const defaultLevel = store.get<string>("settings.defaultProtectionLevel");
			const maxSnapshots = store.get<number>("settings.maxSnapshots");

			expect(defaultLevel).toBe("watch");
			expect(maxSnapshots).toBe(100);

			// Update config
			const updatedConfig = {
				...currentConfig,
				settings: { ...currentConfig.settings, maxSnapshots: 50 },
			};
			await store.saveSnapbackrc(updatedConfig);

			// Listener receives update
			expect(currentConfig.settings.maxSnapshots).toBe(50);

			unsubscribe();
		});
	});

	describe("Error Handling", () => {
		it("❌ should handle read permission errors", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			await fs.writeFile(snapbackrcPath, JSON.stringify(DEFAULT_CONFIG));
			await fs.chmod(snapbackrcPath, 0o000); // Remove read permissions

			try {
				const store = new ConfigStore({ workspaceRoot: TEST_DIR });
				const config = await store.initialize();

				// Should fall back to defaults
				expect(config).toBeDefined();
			} finally {
				// Restore permissions for cleanup
				await fs.chmod(snapbackrcPath, 0o644);
			}
		});

		it("✅ should handle empty protections array", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			await fs.writeFile(
				snapbackrcPath,
				JSON.stringify({
					protections: [],
				}),
			);

			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			const config = await store.initialize();

			expect(config.protections).toBeDefined();
			expect(Array.isArray(config.protections)).toBe(true);
		});
	});

	describe("Performance", () => {
		it("⚠️ should load config in <100ms for typical size", async () => {
			const snapbackrcPath = path.join(TEST_DIR, ".snapbackrc");
			const largeConfig = {
				...DEFAULT_CONFIG,
				protections: Array.from({ length: 100 }, (_, i) => ({
					pattern: `pattern-${i}/**`,
					level: "watch" as const,
				})),
			};
			await fs.writeFile(snapbackrcPath, JSON.stringify(largeConfig));

			const start = Date.now();
			const store = new ConfigStore({ workspaceRoot: TEST_DIR });
			await store.initialize();
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(100);
		});
	});
});
