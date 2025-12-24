/**
 * Context Runtime Unit Tests
 *
 * Tests for the ContextRuntime class:
 * - init(): Create .snapback/ctx/ with context.json and .ctx
 * - load(): Load context.json (source of truth)
 * - build(): Generate .ctx from context.json
 * - validate(): Check .ctx freshness
 * - getConstraint(): Get constraint values
 * - getBlockers(): Get project blockers
 * - checkConstraint(): Check value against constraint
 *
 * @coverage 4-path: happy, sad, edge, error
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ContextRuntime, clearContextRuntime, getContextRuntime } from "../../../src/ctx";

describe("ContextRuntime", () => {
	let testDir: string;
	let runtime: ContextRuntime;

	beforeEach(async () => {
		// Create temp directory for each test
		testDir = join(tmpdir(), `snapback-ctx-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await mkdir(testDir, { recursive: true });
		runtime = new ContextRuntime(testDir);
	});

	afterEach(async () => {
		// Clean up
		clearContextRuntime(testDir);
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	// =========================================================================
	// init() tests
	// =========================================================================
	describe("init()", () => {
		it("Happy Path: should create context.json with defaults", async () => {
			const result = await runtime.init();

			expect(result.success).toBe(true);
			expect(result.path).toContain("context.json");

			// Verify context.json was created
			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = await readFile(contextPath, "utf8");
			const context = JSON.parse(content);

			expect(context.version).toBe("1.0.0");
			expect(context.meta.type).toBe("unknown");
			expect(context.meta.phase).toBe("development");
		});

		it("Happy Path: should detect project name from package.json", async () => {
			// Create package.json
			await writeFile(join(testDir, "package.json"), JSON.stringify({ name: "my-awesome-project" }));

			await runtime.init();

			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = await readFile(contextPath, "utf8");
			const context = JSON.parse(content);

			expect(context.meta.id).toBe("my-awesome-project");
		});

		it("Happy Path: should also generate .ctx file", async () => {
			await runtime.init();

			const ctxPath = join(testDir, ".snapback", "ctx", ".ctx");
			const content = await readFile(ctxPath, "utf8");

			expect(content).toContain("# .ctx v1");
			expect(content).toContain("[id]");
			expect(content).toContain("#EOF");
		});

		it("Sad Path: should not overwrite existing context.json without force", async () => {
			// Create existing context.json
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const customContext = {
				version: "1.0.0",
				meta: { id: "custom", type: "library", phase: "production", priority: "high" },
				constraints: {},
				blockers: [],
				decisions: { priority: [], made: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(customContext));

			await runtime.init({ force: false });

			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = await readFile(contextPath, "utf8");
			const context = JSON.parse(content);

			expect(context.meta.id).toBe("custom");
			expect(context.meta.type).toBe("library");
		});

		it("Edge Case: should overwrite with force=true", async () => {
			// Create existing context.json
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const customContext = {
				version: "1.0.0",
				meta: { id: "custom", type: "library", phase: "production", priority: "high" },
				constraints: {},
				blockers: [],
				decisions: { priority: [], made: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(customContext));

			// Clear cached instance
			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);

			await runtime.init({ force: true });

			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = await readFile(contextPath, "utf8");
			const context = JSON.parse(content);

			// Should be reset to defaults
			expect(context.meta.type).toBe("unknown");
			expect(context.meta.phase).toBe("development");
		});

		it("Edge Case: should handle missing package.json gracefully", async () => {
			// No package.json exists
			await runtime.init();

			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = await readFile(contextPath, "utf8");
			const context = JSON.parse(content);

			expect(context.meta.id).toBe("project"); // fallback
		});
	});

	// =========================================================================
	// load() tests
	// =========================================================================
	describe("load()", () => {
		it("Happy Path: should load context.json correctly", async () => {
			// Create context.json with custom values
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const customContext = {
				version: "2.0.0",
				meta: { id: "test-project", type: "application", phase: "sprint", priority: "demo-critical" },
				constraints: {
					bundle: {
						size: { max: 10, unit: "MB", key: "_bs" },
					},
				},
				blockers: [{ key: "_ts", label: "typescript-errors", current: 5, target: 0 }],
				architecture: { privacy: "strict", zeroShortcuts: true, typeStrict: true },
				decisions: { priority: ["speed"], made: { clustering: "kmeans" } },
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 90 },
					perfBudgets: true,
					bundleValidation: true,
					consoleErrors: 0,
				},
				workflows: {},
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: ".snapback/ctx/a/", specs: ".snapback/ctx/s/", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(customContext));

			const loaded = runtime.load();

			expect(loaded.version).toBe("2.0.0");
			expect(loaded.meta.id).toBe("test-project");
			expect(loaded.meta.type).toBe("application");
			expect(loaded.blockers[0].label).toBe("typescript-errors");
		});

		it("Sad Path: should return defaults when context.json missing", async () => {
			// No context.json exists
			const loaded = runtime.load();

			expect(loaded.version).toBe("1.0.0");
			expect(loaded.meta.type).toBe("unknown");
		});

		it("Edge Case: should cache loaded context", async () => {
			await runtime.init();

			const first = runtime.load();
			const second = runtime.load();

			expect(first).toBe(second); // Same reference (cached)
		});

		it("Error Path: should throw on malformed JSON", async () => {
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), "{ invalid json");

			expect(() => runtime.load()).toThrow();
		});
	});

	// =========================================================================
	// build() tests
	// =========================================================================
	describe("build()", () => {
		it("Happy Path: should generate valid .ctx format", async () => {
			await runtime.init();
			const result = await runtime.build();

			expect(result.success).toBe(true);
			expect(result.size).toBeGreaterThan(0);
			expect(result.hash).toMatch(/^[a-f0-9]{16}$/);

			const ctxPath = join(testDir, ".snapback", "ctx", ".ctx");
			const content = await readFile(ctxPath, "utf8");

			// Check format
			expect(content).toContain("# .ctx v1");
			expect(content).toContain("# hash:");
			expect(content).toContain("[id]");
			expect(content).toContain("[lim]");
			expect(content).toContain("[blk]");
			expect(content).toContain("#EOF");
		});

		it("Happy Path: should include all sections", async () => {
			// Create rich context
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const richContext = {
				version: "1.0.0",
				meta: { id: "rich", type: "code-protection", phase: "sprint", priority: "demo-critical" },
				constraints: {
					extension: { bundle: { max: 2, unit: "MB", key: "_eb" } },
					web: { fcp: { max: 1.8, unit: "s", key: "_wf" } },
				},
				blockers: [
					{ key: "_ts", label: "typescript-errors", current: 32, target: 0 },
					{ key: "_eb", label: "bundle-size", current: "11MB", target: "2MB" },
				],
				architecture: { privacy: "metadata-only", zeroShortcuts: true, typeStrict: true },
				decisions: {
					priority: ["demo-unblock", "perf-budget"],
					made: { clustering: "dbscan", analytics: "posthog" },
				},
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 80 },
					perfBudgets: true,
					bundleValidation: true,
					consoleErrors: 0,
				},
				workflows: { feature: ["audit", "design", "tdd"] },
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: ".claude/ctx/a/", specs: ".claude/ctx/s/", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(richContext));

			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);
			await runtime.build();

			const ctxPath = join(testDir, ".snapback", "ctx", ".ctx");
			const content = await readFile(ctxPath, "utf8");

			// Check constraints
			expect(content).toContain("_eb");
			expect(content).toContain("_wf");

			// Check blockers
			expect(content).toContain("!_ts:");
			expect(content).toContain("!_eb:");

			// Check decisions
			expect(content).toContain(">demo-unblock");
			expect(content).toContain("_cl=dbscan");

			// Check workflows
			expect(content).toContain("feature=");
		});

		it("Edge Case: should handle empty blockers", async () => {
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const minimalContext = {
				version: "1.0.0",
				meta: { id: "minimal", type: "unknown", phase: "development", priority: "normal" },
				constraints: {},
				blockers: [],
				architecture: { privacy: "standard", zeroShortcuts: false, typeStrict: false },
				decisions: { priority: [], made: {} },
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 60 },
					perfBudgets: false,
					bundleValidation: false,
					consoleErrors: 0,
				},
				workflows: {},
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: "", specs: "", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(minimalContext));

			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);
			const result = await runtime.build();

			expect(result.success).toBe(true);

			const ctxPath = join(testDir, ".snapback", "ctx", ".ctx");
			const content = await readFile(ctxPath, "utf8");
			expect(content).toContain("[blk]");
		});
	});

	// =========================================================================
	// validate() tests
	// =========================================================================
	describe("validate()", () => {
		it("Happy Path: should return valid when .ctx is fresh", async () => {
			await runtime.init();

			// Wait a moment to ensure timestamps are different if rebuilt
			await new Promise((resolve) => setTimeout(resolve, 50));

			const result = runtime.validate();

			expect(result.valid).toBe(true);
			expect(result.hash).toBeDefined();
		});

		it("Sad Path: should return invalid when context.json missing", async () => {
			// No context.json exists
			const result = runtime.validate();

			expect(result.valid).toBe(false);
			expect(result.reason).toContain("context.json missing");
		});

		it("Sad Path: should return invalid when .ctx missing", async () => {
			// Create only context.json
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			await writeFile(
				join(testDir, ".snapback", "ctx", "context.json"),
				JSON.stringify({
					version: "1.0.0",
					meta: {},
					constraints: {},
					blockers: [],
					decisions: { priority: [], made: {} },
				}),
			);

			const result = runtime.validate();

			expect(result.valid).toBe(false);
			expect(result.reason).toContain(".ctx missing");
		});

		it("Sad Path: should return invalid when .ctx is stale (hash mismatch)", async () => {
			await runtime.init();

			// Modify context.json without rebuilding .ctx
			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = JSON.parse(await readFile(contextPath, "utf8"));
			content.meta.priority = "changed-priority";
			await writeFile(contextPath, JSON.stringify(content));

			// Need to reload to pick up changes
			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);

			const result = runtime.validate();

			expect(result.valid).toBe(false);
			expect(result.reason).toContain("hash mismatch");
		});
	});

	// =========================================================================
	// getConstraint() tests
	// =========================================================================
	describe("getConstraint()", () => {
		beforeEach(async () => {
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const context = {
				version: "1.0.0",
				meta: { id: "test", type: "unknown", phase: "development", priority: "normal" },
				constraints: {
					extension: {
						bundle: { max: 2, unit: "MB", key: "_eb", current: 11 },
						activation: { max: 500, unit: "ms", key: "_ea" },
					},
					web: {
						fcp: { max: 1.8, unit: "s", key: "_wf" },
					},
				},
				blockers: [],
				architecture: { privacy: "standard", zeroShortcuts: false, typeStrict: false },
				decisions: { priority: [], made: {} },
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 60 },
					perfBudgets: false,
					bundleValidation: false,
					consoleErrors: 0,
				},
				workflows: {},
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: "", specs: "", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(context));
			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);
		});

		it("Happy Path: should return constraint by domain and name", () => {
			const constraint = runtime.getConstraint("extension", "bundle");

			expect(constraint).toBeDefined();
			expect(constraint?.max).toBe(2);
			expect(constraint?.unit).toBe("MB");
			expect(constraint?.current).toBe(11);
		});

		it("Sad Path: should return undefined for unknown domain", () => {
			const constraint = runtime.getConstraint("unknown", "bundle");
			expect(constraint).toBeUndefined();
		});

		it("Sad Path: should return undefined for unknown name", () => {
			const constraint = runtime.getConstraint("extension", "unknown");
			expect(constraint).toBeUndefined();
		});
	});

	// =========================================================================
	// getThreshold() tests
	// =========================================================================
	describe("getThreshold()", () => {
		beforeEach(async () => {
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const context = {
				version: "1.0.0",
				meta: { id: "test", type: "unknown", phase: "development", priority: "normal" },
				constraints: {
					extension: {
						bundle: { max: 2, unit: "MB", key: "_eb" },
						activation: { max: 500, unit: "ms", key: "_ea" },
					},
					web: {
						fcp: { max: 1.8, unit: "s", key: "_wf" },
						jsBundle: { max: 500, unit: "KB", key: "_wj" },
					},
				},
				blockers: [],
				architecture: { privacy: "standard", zeroShortcuts: false, typeStrict: false },
				decisions: { priority: [], made: {} },
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 60 },
					perfBudgets: false,
					bundleValidation: false,
					consoleErrors: 0,
				},
				workflows: {},
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: "", specs: "", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(context));
			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);
		});

		it("Happy Path: should convert MB to bytes", () => {
			const threshold = runtime.getThreshold("extension", "bundle");
			expect(threshold).toBe(2_000_000);
		});

		it("Happy Path: should convert KB to bytes", () => {
			const threshold = runtime.getThreshold("web", "jsBundle");
			expect(threshold).toBe(500_000);
		});

		it("Happy Path: should convert s to ms", () => {
			const threshold = runtime.getThreshold("web", "fcp");
			expect(threshold).toBe(1800);
		});

		it("Happy Path: should keep ms as ms", () => {
			const threshold = runtime.getThreshold("extension", "activation");
			expect(threshold).toBe(500);
		});

		it("Sad Path: should return undefined for unknown constraint", () => {
			const threshold = runtime.getThreshold("unknown", "unknown");
			expect(threshold).toBeUndefined();
		});
	});

	// =========================================================================
	// checkConstraint() tests
	// =========================================================================
	describe("checkConstraint()", () => {
		beforeEach(async () => {
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const context = {
				version: "1.0.0",
				meta: { id: "test", type: "unknown", phase: "development", priority: "normal" },
				constraints: {
					extension: {
						bundle: { max: 2, unit: "MB", key: "_eb" }, // 2MB = 2,000,000 bytes
					},
				},
				blockers: [],
				architecture: { privacy: "standard", zeroShortcuts: false, typeStrict: false },
				decisions: { priority: [], made: {} },
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 60 },
					perfBudgets: false,
					bundleValidation: false,
					consoleErrors: 0,
				},
				workflows: {},
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: "", specs: "", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(context));
			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);
		});

		it("Happy Path: should pass when value is under threshold", () => {
			const result = runtime.checkConstraint("extension", "bundle", 1_500_000); // 1.5MB

			expect(result.pass).toBe(true);
			expect(result.ratio).toBe(0.75);
			expect(result.severity).toBe("ok");
		});

		it("Happy Path: should pass when value equals threshold", () => {
			const result = runtime.checkConstraint("extension", "bundle", 2_000_000); // exactly 2MB

			expect(result.pass).toBe(true);
			expect(result.ratio).toBe(1.0);
			expect(result.severity).toBe("ok");
		});

		it("Sad Path: should fail when value exceeds threshold", () => {
			const result = runtime.checkConstraint("extension", "bundle", 2_500_000); // 2.5MB

			expect(result.pass).toBe(false);
			expect(result.ratio).toBe(1.25);
			expect(result.severity).toBe("warning");
		});

		it("Sad Path: should be critical when value greatly exceeds threshold", () => {
			const result = runtime.checkConstraint("extension", "bundle", 4_000_000); // 4MB (2x)

			expect(result.pass).toBe(false);
			expect(result.ratio).toBe(2.0);
			expect(result.severity).toBe("critical");
		});

		it("Edge Case: should handle unknown constraint gracefully", () => {
			const result = runtime.checkConstraint("unknown", "unknown", 1000);

			expect(result.pass).toBe(true);
			expect(result.ratio).toBe(0);
			expect(result.severity).toBe("ok");
		});
	});

	// =========================================================================
	// getBlockers() tests
	// =========================================================================
	describe("getBlockers()", () => {
		it("Happy Path: should return all blockers", async () => {
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const context = {
				version: "1.0.0",
				meta: { id: "test", type: "unknown", phase: "development", priority: "normal" },
				constraints: {},
				blockers: [
					{ key: "_ts", label: "typescript-errors", current: 32, target: 0 },
					{ key: "_eb", label: "bundle-size", current: "11MB", target: "2MB" },
				],
				architecture: { privacy: "standard", zeroShortcuts: false, typeStrict: false },
				decisions: { priority: [], made: {} },
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 60 },
					perfBudgets: false,
					bundleValidation: false,
					consoleErrors: 0,
				},
				workflows: {},
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: "", specs: "", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(context));
			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);

			const blockers = runtime.getBlockers();

			expect(blockers).toHaveLength(2);
			expect(blockers[0].label).toBe("typescript-errors");
			expect(blockers[1].label).toBe("bundle-size");
		});

		it("Sad Path: should return empty array when no blockers", async () => {
			await runtime.init(); // defaults have no blockers

			const blockers = runtime.getBlockers();

			expect(blockers).toEqual([]);
		});
	});

	// =========================================================================
	// getDecision() tests
	// =========================================================================
	describe("getDecision()", () => {
		it("Happy Path: should return decision value", async () => {
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const context = {
				version: "1.0.0",
				meta: { id: "test", type: "unknown", phase: "development", priority: "normal" },
				constraints: {},
				blockers: [],
				architecture: { privacy: "standard", zeroShortcuts: false, typeStrict: false },
				decisions: {
					priority: [],
					made: {
						clustering: "dbscan",
						diff: { small: "jsdiff", large: "diff-match-patch" },
					},
				},
				stack: {},
				quality: {
					typescript: { errors: 0 },
					coverage: { min: 60 },
					perfBudgets: false,
					bundleValidation: false,
					consoleErrors: 0,
				},
				workflows: {},
				protocol: { options: "2-3", references: "file:line", risks: "explicit", sizing: "S/M/L/XL" },
				refs: { audits: "", specs: "", files: {} },
			};
			await writeFile(join(testDir, ".snapback", "ctx", "context.json"), JSON.stringify(context));
			clearContextRuntime(testDir);
			runtime = new ContextRuntime(testDir);

			expect(runtime.getDecision("clustering")).toBe("dbscan");
			expect(runtime.getDecision("diff")).toEqual({ small: "jsdiff", large: "diff-match-patch" });
		});

		it("Sad Path: should return undefined for unknown decision", async () => {
			await runtime.init();

			expect(runtime.getDecision("unknown")).toBeUndefined();
		});
	});

	// =========================================================================
	// Singleton tests
	// =========================================================================
	describe("getContextRuntime() singleton", () => {
		it("should return same instance for same workspace", () => {
			const first = getContextRuntime(testDir);
			const second = getContextRuntime(testDir);

			expect(first).toBe(second);
		});

		it("should return different instance for different workspace", () => {
			const other = join(testDir, "other");
			const first = getContextRuntime(testDir);
			const second = getContextRuntime(other);

			expect(first).not.toBe(second);

			// Cleanup
			clearContextRuntime(other);
		});

		it("clearContextRuntime should remove cached instance", () => {
			const first = getContextRuntime(testDir);
			clearContextRuntime(testDir);
			const second = getContextRuntime(testDir);

			expect(first).not.toBe(second);
		});
	});
});
