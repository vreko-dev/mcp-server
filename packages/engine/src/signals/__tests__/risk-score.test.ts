/**
 * Risk Score Signal Tests
 *
 * These tests validate the risk-score.ts signal behavior using stdin protocol.
 *
 * Run with: pnpm test packages/engine/src/signals/__tests__/risk-score.test.ts
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FileChange } from "../../types";

/**
 * Helper to execute risk-score script with stdin JSON protocol
 */
function runRiskScore(files: FileChange[]): any {
	const input = JSON.stringify({
		files,
		workspace: TEST_DIR,
		timestamp: Date.now(),
	});

	const result = execSync(`echo '${input}' | npx tsx ${SCRIPT_PATH}`, {
		encoding: "utf8",
		shell: "/bin/bash",
	});

	return JSON.parse(result);
}

const SCRIPT_PATH = join(__dirname, "..", "risk-score.ts");
const TEST_DIR = join(__dirname, "..", "..", "..", "__test-fixtures__");

describe("risk-score signal", () => {
	beforeEach(() => {
		// Create test directory
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
	});

	afterEach(() => {
		// Cleanup test directory
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	it("returns score 0 for no files", () => {
		const result = runRiskScore([]);

		expect(result.signal).toBe("risk-score");
		expect(result.value).toBe(0);
		expect(result.metadata.factors).toEqual([]);
		expect(result.metadata.fileCount).toBe(0);
	});

	it("detects sensitive files (auth)", () => {
		// Create a test file
		const authFile = join(TEST_DIR, "auth.ts");
		const content = 'export const secret = "test";';
		writeFileSync(authFile, content);

		const files: FileChange[] = [
			{
				path: authFile,
				content,
				lineCount: 1,
				changeType: "modify",
			},
		];

		const result = runRiskScore(files);

		expect(result.signal).toBe("risk-score");
		expect(result.value).toBeGreaterThan(0);
		expect(result.metadata.factors.some((f: string) => f.includes("Sensitive file"))).toBe(true);
		expect(result.metadata.sensitiveFiles).toBe(1);
	});

	it("detects high complexity files", () => {
		// Create a complex file with many functions and conditionals
		const complexFile = join(TEST_DIR, "complex.ts");
		const content = `
			function foo1() { if (x) { return 1; } }
			function foo2() { if (y) { return 2; } }
			function foo3() { if (z) { return 3; } }
		`.repeat(200); // 800 lines with many functions/conditions
		writeFileSync(complexFile, content);

		const files: FileChange[] = [
			{
				path: complexFile,
				content,
				lineCount: 800,
				changeType: "modify",
			},
		];

		const result = runRiskScore(files);

		expect(result.signal).toBe("risk-score");
		// High line count + many functions/conditions should trigger complexity
		expect(result.metadata.factors.some((f: string) => f.includes("complexity"))).toBe(true);
	});

	it("detects sensitive test files", () => {
		// Test files with sensitive patterns still trigger detection
		const testFile = join(TEST_DIR, "auth.test.ts");
		const content = 'describe("auth", () => {});';
		writeFileSync(testFile, content);

		const files: FileChange[] = [
			{
				path: testFile,
				content,
				lineCount: 1,
				changeType: "modify",
			},
		];

		const result = runRiskScore(files);

		expect(result.signal).toBe("risk-score");
		// Even test files with 'auth' in name are flagged as sensitive
		expect(result.metadata.sensitiveFiles).toBe(1);
	});

	it("calculates high aggregate risk for multiple sensitive files", () => {
		// Create multiple high-risk files
		const fileChanges: FileChange[] = [];

		for (let i = 0; i < 5; i++) {
			const file = join(TEST_DIR, `auth-config-secret-${i}.ts`);
			// Create complex content to trigger both sensitive file and complexity factors
			const content = `
				function authenticate() {
					if (password) { return secret; }
				}
			`.repeat(200); // 800 lines, many functions/conditions
			writeFileSync(file, content);

			fileChanges.push({
				path: file,
				content,
				lineCount: 800,
				changeType: "modify",
			});
		}

		const result = runRiskScore(fileChanges);

		expect(result.signal).toBe("risk-score");
		// Multiple sensitive + complex files should have high aggregate risk
		// Each file: +4 (sensitive) +3 (complexity) = 7 per file
		// Total: 35, normalized by (5+1) = 5.83
		expect(result.value).toBeGreaterThan(5);
		expect(result.metadata.sensitiveFiles).toBe(5);
	});

	it("handles empty content gracefully", () => {
		// File exists but has no content
		const files: FileChange[] = [
			{
				path: "/some/file.ts",
				content: "",
				lineCount: 0,
				changeType: "add",
			},
		];

		const result = runRiskScore(files);

		expect(result.signal).toBe("risk-score");
		// Empty file should have minimal risk
		expect(result.value).toBe(0);
	});

	it("detects pattern triggers (package.json)", () => {
		const packageFile = join(TEST_DIR, "package.json");
		const content = JSON.stringify({ name: "test", version: "1.0.0" });
		writeFileSync(packageFile, content);

		const files: FileChange[] = [
			{
				path: packageFile,
				content,
				lineCount: 1,
				changeType: "modify",
			},
		];

		const result = runRiskScore(files);

		expect(result.signal).toBe("risk-score");
		// package.json triggers both sensitive file and dependency change pattern
		expect(result.metadata.factors.some((f: string) => f.includes("Dependency changes"))).toBe(true);
		expect(result.metadata.sensitiveFiles).toBe(1);
	});
});
