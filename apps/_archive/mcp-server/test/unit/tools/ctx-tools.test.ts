/**
 * Context Tools Unit Tests
 *
 * Tests for MCP context tools:
 * - handleCtxInit
 * - handleCtxBuild
 * - handleCtxValidate
 * - handleCtxConstraint
 * - handleCtxBlockers
 * - handleCtxCheck
 *
 * @coverage 4-path: happy, sad, edge, error
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearContextRuntime } from "../../../src/ctx";
import {
	handleCtxBlockers,
	handleCtxBuild,
	handleCtxCheck,
	handleCtxConstraint,
	handleCtxInit,
	handleCtxValidate,
} from "../../../src/tools/ctx-tools";

describe("Context Tools", () => {
	let testDir: string;
	const originalCwd = process.cwd();

	beforeEach(async () => {
		// Create temp directory for each test
		testDir = join(tmpdir(), `snapback-ctx-tools-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await mkdir(testDir, { recursive: true });
		// Change to test directory so tools use it as default
		process.chdir(testDir);
	});

	afterEach(async () => {
		// Restore cwd
		process.chdir(originalCwd);
		// Clean up
		clearContextRuntime(testDir);
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	// =========================================================================
	// handleCtxInit tests
	// =========================================================================
	describe("handleCtxInit", () => {
		it("Happy Path: should initialize context system", async () => {
			const result = await handleCtxInit({});

			expect(result.content).toBeDefined();
			expect(result.content.length).toBeGreaterThan(0);

			// Parse response
			const jsonContent = result.content.find((c) => c.type === "text" && c.text.includes("success"));
			expect(jsonContent).toBeDefined();

			// Verify files created
			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = await readFile(contextPath, "utf8");
			expect(content).toContain("version");
		});

		it("Happy Path: should use custom workspaceRoot", async () => {
			const customDir = join(testDir, "custom");
			await mkdir(customDir, { recursive: true });

			const result = await handleCtxInit({ workspaceRoot: customDir });

			expect(result.content).toBeDefined();

			// Verify files created in custom dir
			const contextPath = join(customDir, ".snapback", "ctx", "context.json");
			const content = await readFile(contextPath, "utf8");
			expect(content).toContain("version");

			// Cleanup
			clearContextRuntime(customDir);
		});

		it("Edge Case: should handle force option", async () => {
			// First init
			await handleCtxInit({});

			// Modify context
			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = JSON.parse(await readFile(contextPath, "utf8"));
			content.meta.priority = "custom-priority";
			await writeFile(contextPath, JSON.stringify(content));

			// Clear cache and force reinit
			clearContextRuntime(testDir);
			const result = await handleCtxInit({ force: true });

			expect(result.content).toBeDefined();

			// Should be reset to defaults
			const newContent = JSON.parse(await readFile(contextPath, "utf8"));
			expect(newContent.meta.priority).toBe("normal");
		});
	});

	// =========================================================================
	// handleCtxBuild tests
	// =========================================================================
	describe("handleCtxBuild", () => {
		it("Happy Path: should build .ctx from context.json", async () => {
			// First init
			await handleCtxInit({});

			// Then build
			clearContextRuntime(testDir);
			const result = await handleCtxBuild({});

			expect(result.content).toBeDefined();

			// Parse response for size and hash
			const jsonText = result.content.find((c) => c.type === "text" && c.text.includes("size"))?.text;
			expect(jsonText).toBeDefined();
			const data = JSON.parse(jsonText!);
			expect(data.success).toBe(true);
			expect(data.size).toBeGreaterThan(0);
			expect(data.hash).toMatch(/^[a-f0-9]{16}$/);
		});

		it("Sad Path: should handle missing context.json gracefully", async () => {
			// Don't init, just try to build
			const result = await handleCtxBuild({});

			// Should still work with defaults
			expect(result.content).toBeDefined();
			const jsonText = result.content.find((c) => c.type === "text" && c.text.includes("size"))?.text;
			expect(jsonText).toBeDefined();
		});
	});

	// =========================================================================
	// handleCtxValidate tests
	// =========================================================================
	describe("handleCtxValidate", () => {
		it("Happy Path: should validate fresh context", async () => {
			await handleCtxInit({});
			clearContextRuntime(testDir);

			const result = await handleCtxValidate({});

			expect(result.content).toBeDefined();
			const jsonText = result.content.find((c) => c.type === "text" && c.text.includes("valid"))?.text;
			expect(jsonText).toBeDefined();
			const data = JSON.parse(jsonText!);
			expect(data.valid).toBe(true);
		});

		it("Sad Path: should detect stale context", async () => {
			await handleCtxInit({});

			// Modify context.json without rebuilding
			const contextPath = join(testDir, ".snapback", "ctx", "context.json");
			const content = JSON.parse(await readFile(contextPath, "utf8"));
			content.meta.priority = "modified";
			await writeFile(contextPath, JSON.stringify(content));

			clearContextRuntime(testDir);
			const result = await handleCtxValidate({});

			expect(result.content).toBeDefined();
			const jsonText = result.content.find((c) => c.type === "text" && c.text.includes("valid"))?.text;
			expect(jsonText).toBeDefined();
			const data = JSON.parse(jsonText!);
			expect(data.valid).toBe(false);
			expect(data.reason).toContain("hash");
		});

		it("Sad Path: should detect missing context.json", async () => {
			// Don't init
			const result = await handleCtxValidate({});

			expect(result.content).toBeDefined();
			const jsonText = result.content.find((c) => c.type === "text" && c.text.includes("valid"))?.text;
			expect(jsonText).toBeDefined();
			const data = JSON.parse(jsonText!);
			expect(data.valid).toBe(false);
			expect(data.reason).toContain("missing");
		});
	});

	// =========================================================================
	// handleCtxConstraint tests
	// =========================================================================
	describe("handleCtxConstraint", () => {
		beforeEach(async () => {
			// Create context with constraints
			await mkdir(join(testDir, ".snapback", "ctx"), { recursive: true });
			const context = {
				version: "1.0.0",
				meta: { id: "test", type: "unknown", phase: "development", priority: "normal" },
				constraints: {
					extension: {
						bundle: { max: 2, unit: "MB", key: "_eb", current: 11 },
						activation: { max: 500, unit: "ms", key: "_ea" },
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
		});

		it("Happy Path: should return constraint with threshold", async () => {
			const result = await handleCtxConstraint({
				domain: "extension",
				name: "bundle",
			});

			expect(result.content).toBeDefined();
			const jsonText = result.content.find((c) => c.type === "text" && c.text.includes("constraint"))?.text;
			expect(jsonText).toBeDefined();
			const data = JSON.parse(jsonText!);
			expect(data.constraint.max).toBe(2);
			expect(data.constraint.unit).toBe("MB");
			expect(data.thresholdInBaseUnits).toBe(2_000_000);
		});

		it("Sad Path: should return error for unknown constraint", async () => {
			const result = await handleCtxConstraint({
				domain: "unknown",
				name: "unknown",
			});

			expect(result.isError).toBe(true);
			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("No constraint found");
		});
	});

	// =========================================================================
	// handleCtxBlockers tests
	// =========================================================================
	describe("handleCtxBlockers", () => {
		it("Happy Path: should return blockers list", async () => {
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

			const result = await handleCtxBlockers({});

			expect(result.content).toBeDefined();
			const summaryText = result.content.find((c) => c.type === "text" && c.text.includes("blocker"))?.text;
			expect(summaryText).toContain("2 blocker(s)");
			expect(summaryText).toContain("typescript-errors");
			expect(summaryText).toContain("bundle-size");
		});

		it("Sad Path: should handle no blockers", async () => {
			await handleCtxInit({});
			clearContextRuntime(testDir);

			const result = await handleCtxBlockers({});

			expect(result.content).toBeDefined();
			const summaryText = result.content.find((c) => c.type === "text" && c.text.includes("blocker"))?.text;
			expect(summaryText).toContain("No blockers");
		});
	});

	// =========================================================================
	// handleCtxCheck tests
	// =========================================================================
	describe("handleCtxCheck", () => {
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
		});

		it("Happy Path: should pass when under threshold", async () => {
			const result = await handleCtxCheck({
				domain: "extension",
				name: "bundle",
				value: 1_500_000, // 1.5MB
			});

			expect(result.content).toBeDefined();
			const summaryText = result.content.find((c) => c.type === "text" && c.text.includes("PASS"))?.text;
			expect(summaryText).toBeDefined();
			expect(summaryText).toContain("75.0%");
		});

		it("Sad Path: should fail when over threshold", async () => {
			const result = await handleCtxCheck({
				domain: "extension",
				name: "bundle",
				value: 2_500_000, // 2.5MB
			});

			expect(result.content).toBeDefined();
			const summaryText = result.content.find((c) => c.type === "text" && c.text.includes("FAIL"))?.text;
			expect(summaryText).toBeDefined();
			expect(summaryText).toContain("warning");
		});

		it("Sad Path: should show critical severity when greatly over", async () => {
			const result = await handleCtxCheck({
				domain: "extension",
				name: "bundle",
				value: 4_000_000, // 4MB (2x threshold)
			});

			expect(result.content).toBeDefined();
			const summaryText = result.content.find((c) => c.type === "text" && c.text.includes("FAIL"))?.text;
			expect(summaryText).toContain("critical");
		});
	});
});
