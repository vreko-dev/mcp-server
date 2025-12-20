/**
 * Validation Pipeline Tests - All 7 validation layers
 *
 * Tests from testing_coverage.md Section 7 and validation requirements
 *
 * Layers tested:
 * 1. Syntax Validation
 * 2. Type Safety Checks
 * 3. Test Coverage Checks
 * 4. Architecture Validation
 * 5. Security Validation
 * 6. Dependency Validation
 * 7. Performance Validation
 */

import { beforeEach, describe, expect, it } from "vitest";
import { codeFixtures, securityFixtures } from "../fixtures/index.js";

let ValidationPipeline: any;
let pipeline: any;

beforeEach(async () => {
	const module = await import("../../validation-pipeline.js");
	ValidationPipeline = module.ValidationPipeline;
	pipeline = new ValidationPipeline();
});

// ============================================================================
// Layer 1: Syntax Validation
// ============================================================================

describe("Layer 1: Syntax Validation", () => {
	it("Detects mismatched braces", async () => {
		const code = `
			function test() {
				if (true) {
					console.log("missing close");
			}
		`;
		const result = await pipeline.validate(code, "test.ts");

		const syntaxIssue = result.layers
			.find((l: any) => l.layer === "syntax")
			?.issues.find((i: any) => i.type === "SYNTAX_ERROR");

		expect(syntaxIssue).toBeDefined();
	});

	it("Detects mismatched parentheses", async () => {
		const code = `
			function test(a, b {
				return a + b;
			}
		`;
		const result = await pipeline.validate(code, "test.ts");

		const syntaxIssue = result.layers
			.find((l: any) => l.layer === "syntax")
			?.issues.find((i: any) => i.type === "SYNTAX_ERROR");

		expect(syntaxIssue).toBeDefined();
	});

	it("Detects double semicolon", async () => {
		const code = `
			const x = 1;;
			const y = 2;
		`;
		const result = await pipeline.validate(code, "test.ts");

		const warningIssue = result.layers
			.find((l: any) => l.layer === "syntax")
			?.issues.find((i: any) => i.type === "SYNTAX_WARNING");

		expect(warningIssue).toBeDefined();
	});

	it("Passes valid syntax", async () => {
		const code = `
			function test(a: number, b: number): number {
				return a + b;
			}
		`;
		const result = await pipeline.validate(code, "test.ts");

		const syntaxLayer = result.layers.find((l: any) => l.layer === "syntax");
		expect(syntaxLayer?.passed).toBe(true);
	});
});

// ============================================================================
// Layer 2: Type Safety Checks
// ============================================================================

describe("Layer 2: Type Safety Checks", () => {
	it("Detects 'any' type usage", async () => {
		const code = `
			function processData(data: any): any {
				return data;
			}
		`;
		const result = await pipeline.validate(code, "service.ts");

		const typeIssue = result.layers
			.find((l: any) => l.layer === "types")
			?.issues.find((i: any) => i.type === "TYPE_SAFETY_BYPASS");

		expect(typeIssue).toBeDefined();
	});

	it("Detects @ts-ignore without reason", async () => {
		const code = `
			// @ts-ignore
			const x: number = "string";
		`;
		const result = await pipeline.validate(code, "service.ts");

		const ignoreIssue = result.layers
			.find((l: any) => l.layer === "types")
			?.issues.find((i: any) => i.type === "TS_IGNORE_NO_REASON");

		expect(ignoreIssue).toBeDefined();
	});

	it("Warns on excessive non-null assertions", async () => {
		const code = `
			const a = obj.prop!;
			const b = obj.nested!.value!;
			const c = arr![0]!;
			const d = map.get(key)!;
		`;
		const result = await pipeline.validate(code, "service.ts");

		const nonNullIssue = result.layers
			.find((l: any) => l.layer === "types")
			?.issues.find((i: any) => i.type === "EXCESSIVE_NON_NULL");

		expect(nonNullIssue).toBeDefined();
	});

	it("Passes code with proper types", async () => {
		const code = `
			interface User {
				id: string;
				name: string;
			}

			function getUser(id: string): User | null {
				return { id, name: "Test" };
			}
		`;
		const result = await pipeline.validate(code, "service.ts");

		const typeLayer = result.layers.find((l: any) => l.layer === "types");
		expect(typeLayer?.issues.filter((i: any) => i.severity === "critical").length).toBe(0);
	});
});

// ============================================================================
// Layer 3: Test Coverage Checks
// ============================================================================

describe("Layer 3: Test Coverage Checks", () => {
	it("Detects vague assertions in test files", async () => {
		const code = codeFixtures.testWithVagueAssertions;
		const result = await pipeline.validate(code, "apps/api/test/user.test.ts");

		const testIssue = result.layers
			.find((l: any) => l.layer === "tests")
			?.issues.find((i: any) => i.type === "VAGUE_ASSERTION");

		expect(testIssue).toBeDefined();
	});

	it("Warns on incomplete test coverage", async () => {
		const code = `
			describe("User", () => {
				it("should exist", () => {
					expect(user).toEqual({ id: "1" });
				});
			});
		`;
		const result = await pipeline.validate(code, "test/user.test.ts");

		const coverageIssue = result.layers
			.find((l: any) => l.layer === "tests")
			?.issues.find((i: any) => i.type === "INCOMPLETE_COVERAGE");

		expect(coverageIssue).toBeDefined();
	});

	it("Passes well-covered tests with 4 paths", async () => {
		const code = codeFixtures.cleanTestCode;
		const result = await pipeline.validate(code, "test/user.test.ts");

		const testLayer = result.layers.find((l: any) => l.layer === "tests");
		const coverageIssue = testLayer?.issues.find((i: any) => i.type === "INCOMPLETE_COVERAGE");

		// Should not have coverage issue with 4 paths
		expect(coverageIssue).toBeUndefined();
	});

	it("Skips test checks for non-test files", async () => {
		const code = `
			export function doSomething() {
				return true;
			}
		`;
		const result = await pipeline.validate(code, "apps/api/src/service.ts");

		const testLayer = result.layers.find((l: any) => l.layer === "tests");
		expect(testLayer?.issues.length).toBe(0);
	});
});

// ============================================================================
// Layer 4: Architecture Validation
// ============================================================================

describe("Layer 4: Architecture Validation", () => {
	it("Detects layer boundary violation (vscode -> infrastructure)", async () => {
		const code = `
			import { db } from "@snapback/infrastructure";
			export const snapshot = db.query("SELECT * FROM snapshots");
		`;
		const result = await pipeline.validate(code, "apps/vscode/src/snapshot.ts");

		const archIssue = result.layers
			.find((l: any) => l.layer === "architecture")
			?.issues.find((i: any) => i.type === "LAYER_BOUNDARY_VIOLATION");

		expect(archIssue).toBeDefined();
	});

	it("Detects layer boundary violation (web -> infrastructure)", async () => {
		const code = `
			import { db } from "@snapback/infrastructure";
			export const data = db.select();
		`;
		const result = await pipeline.validate(code, "apps/web/src/component.tsx");

		const archIssue = result.layers
			.find((l: any) => l.layer === "architecture")
			?.issues.find((i: any) => i.type === "LAYER_BOUNDARY_VIOLATION");

		expect(archIssue).toBeDefined();
	});

	it("Detects service bypass in procedures", async () => {
		const code = codeFixtures.directDbInProcedure;
		const result = await pipeline.validate(code, "apps/api/src/procedures/user.ts");

		const bypassIssue = result.layers
			.find((l: any) => l.layer === "architecture")
			?.issues.find((i: any) => i.type === "SERVICE_BYPASS");

		expect(bypassIssue).toBeDefined();
	});

	it("Detects relative imports across packages", async () => {
		const code = `
			import { User } from '../../../packages/contracts/src/types';
		`;
		const result = await pipeline.validate(code, "apps/api/src/service.ts");

		const importIssue = result.layers
			.find((l: any) => l.layer === "architecture")
			?.issues.find((i: any) => i.type === "WRONG_IMPORT_PATTERN");

		expect(importIssue).toBeDefined();
	});

	it("Allows infrastructure import in services", async () => {
		const code = `
			import { db } from "@snapback/infrastructure";
			export const users = db.select().from(usersTable);
		`;
		const result = await pipeline.validate(code, "apps/api/src/services/user-service.ts");

		const archLayer = result.layers.find((l: any) => l.layer === "architecture");
		const boundaryIssue = archLayer?.issues.find((i: any) => i.type === "LAYER_BOUNDARY_VIOLATION");

		expect(boundaryIssue).toBeUndefined();
	});
});

// ============================================================================
// Layer 5: Security Validation
// ============================================================================

describe("Layer 5: Security Validation", () => {
	it("Detects hardcoded API key", async () => {
		const code = securityFixtures.hardcodedSecrets.apiKey;
		const result = await pipeline.validate(code, "config.ts");

		const securityIssue = result.layers
			.find((l: any) => l.layer === "security")
			?.issues.find((i: any) => i.type === "HARDCODED_SECRET");

		expect(securityIssue).toBeDefined();
	});

	it("Detects hardcoded password", async () => {
		const code = securityFixtures.hardcodedSecrets.password;
		const result = await pipeline.validate(code, "config.ts");

		const securityIssue = result.layers
			.find((l: any) => l.layer === "security")
			?.issues.find((i: any) => i.type === "HARDCODED_SECRET");

		expect(securityIssue).toBeDefined();
	});

	it("Detects eval usage", async () => {
		const code = `
			const result = eval("1 + 1");
		`;
		const result = await pipeline.validate(code, "utils.ts");

		const evalIssue = result.layers
			.find((l: any) => l.layer === "security")
			?.issues.find((i: any) => i.type === "UNSAFE_EVAL");

		expect(evalIssue).toBeDefined();
	});

	it("Detects new Function usage", async () => {
		const code = `
			const fn = new Function("return 1 + 1");
		`;
		const result = await pipeline.validate(code, "utils.ts");

		const evalIssue = result.layers
			.find((l: any) => l.layer === "security")
			?.issues.find((i: any) => i.type === "UNSAFE_EVAL");

		expect(evalIssue).toBeDefined();
	});

	it("Detects privacy violation (file content to external)", async () => {
		const code = `
			import posthog from "posthog";
			posthog.capture("event", { fileContent: readFileSync("file.ts") });
		`;
		const result = await pipeline.validate(code, "telemetry.ts");

		const privacyIssue = result.layers
			.find((l: any) => l.layer === "security")
			?.issues.find((i: any) => i.type === "PRIVACY_VIOLATION");

		expect(privacyIssue).toBeDefined();
	});

	it("Passes secure code", async () => {
		const code = `
			import { env } from "process";
			const apiKey = env.API_KEY;
		`;
		const result = await pipeline.validate(code, "config.ts");

		const securityLayer = result.layers.find((l: any) => l.layer === "security");
		expect(securityLayer?.issues.filter((i: any) => i.severity === "critical").length).toBe(0);
	});
});

// ============================================================================
// Layer 6: Dependency Validation
// ============================================================================

describe("Layer 6: Dependency Validation", () => {
	it("Warns on deprecated moment package", async () => {
		const code = `
			import moment from "moment";
			const now = moment();
		`;
		const result = await pipeline.validate(code, "utils.ts");

		const depIssue = result.layers
			.find((l: any) => l.layer === "dependencies")
			?.issues.find((i: any) => i.type === "DEPRECATED_DEPENDENCY");

		expect(depIssue).toBeDefined();
	});

	it("Warns on deprecated request package", async () => {
		const code = `
			import request from "request";
			request.get("http://example.com");
		`;
		const result = await pipeline.validate(code, "http.ts");

		const depIssue = result.layers
			.find((l: any) => l.layer === "dependencies")
			?.issues.find((i: any) => i.type === "DEPRECATED_DEPENDENCY");

		expect(depIssue).toBeDefined();
	});

	it("Passes modern dependencies", async () => {
		const code = `
			import { format } from "date-fns";
			import fetch from "node-fetch";
		`;
		const result = await pipeline.validate(code, "utils.ts");

		const depLayer = result.layers.find((l: any) => l.layer === "dependencies");
		expect(depLayer?.issues.length).toBe(0);
	});
});

// ============================================================================
// Layer 7: Performance Validation
// ============================================================================

describe("Layer 7: Performance Validation", () => {
	it("Detects console.log in production code", async () => {
		const code = `
			export function calculate() {
				console.log("calculating...");
				return 42;
			}
		`;
		const result = await pipeline.validate(code, "apps/api/src/calculator.ts");

		const perfIssue = result.layers
			.find((l: any) => l.layer === "performance")
			?.issues.find((i: any) => i.type === "NO_CONSOLE");

		expect(perfIssue).toBeDefined();
	});

	it("Warns on synchronous file operations", async () => {
		const code = `
			import fs from "fs";
			const data = fs.readFileSync("file.txt");
		`;
		const result = await pipeline.validate(code, "apps/api/src/loader.ts");

		const syncIssue = result.layers
			.find((l: any) => l.layer === "performance")
			?.issues.find((i: any) => i.type === "SYNC_FILE_IO");

		expect(syncIssue).toBeDefined();
	});

	it("Warns on await in loops (N+1)", async () => {
		const code = `
			async function processItems(items: Item[]) {
				for (const item of items) {
					await processItem(item);
				}
			}
		`;
		const result = await pipeline.validate(code, "processor.ts");

		const loopIssue = result.layers
			.find((l: any) => l.layer === "performance")
			?.issues.find((i: any) => i.type === "AWAIT_IN_LOOP");

		expect(loopIssue).toBeDefined();
	});

	it("Allows sync file ops in scripts", async () => {
		const code = `
			import fs from "fs";
			const data = fs.readFileSync("config.json");
		`;
		const result = await pipeline.validate(code, "scripts/setup.ts");

		const perfLayer = result.layers.find((l: any) => l.layer === "performance");
		const syncIssue = perfLayer?.issues.find((i: any) => i.type === "SYNC_FILE_IO");

		expect(syncIssue).toBeUndefined();
	});
});

// ============================================================================
// Pipeline Integration
// ============================================================================

describe("Validation Pipeline Integration", () => {
	it("Returns correct layer names", () => {
		const layerNames = pipeline.getLayerNames();

		expect(layerNames).toContain("syntax");
		expect(layerNames).toContain("types");
		expect(layerNames).toContain("tests");
		expect(layerNames).toContain("architecture");
		expect(layerNames).toContain("security");
		expect(layerNames).toContain("dependencies");
		expect(layerNames).toContain("performance");
	});

	it("Calculates confidence correctly", async () => {
		const cleanResult = await pipeline.validate(codeFixtures.cleanCode, "apps/api/src/service.ts");
		const dirtyResult = await pipeline.validate(codeFixtures.codeWithViolations, "apps/vscode/src/snapshot.ts");

		expect(cleanResult.overall.confidence).toBeGreaterThan(dirtyResult.overall.confidence);
	});

	it("Returns correct recommendation for clean code", async () => {
		const code = `
			export function add(a: number, b: number): number {
				return a + b;
			}
		`;
		const result = await pipeline.validate(code, "apps/api/src/utils.ts");

		expect(["auto_merge", "quick_review"]).toContain(result.recommendation);
	});

	it("Returns full_review for critical issues", async () => {
		const code = codeFixtures.codeWithViolations;
		const result = await pipeline.validate(code, "apps/vscode/src/snapshot.ts");

		expect(result.recommendation).toBe("full_review");
	});

	it("Records focus points for critical issues", async () => {
		const code = codeFixtures.codeWithViolations;
		const result = await pipeline.validate(code, "apps/vscode/src/snapshot.ts");

		expect(result.focusPoints.length).toBeGreaterThan(0);
	});
});
