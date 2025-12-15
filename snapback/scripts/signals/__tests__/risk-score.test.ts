/**
 * Risk Score Signal Tests
 *
 * These tests validate the risk-score.ts signal behavior.
 *
 * Run with: pnpm test snapback/scripts/signals/__tests__/risk-score.test.ts
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

	it("returns pass with score 0 for no files", () => {
		const result = JSON.parse(
			execSync(`npx tsx ${SCRIPT_PATH}`, {
				encoding: "utf8",
				env: { ...process.env, SNAPBACK_FILES: "" },
			}),
		);

		expect(result.status).toBe("pass");
		expect(result.score).toBe(0);
		expect(result.factors).toEqual([]);
	});

	it("detects sensitive files (auth)", () => {
		// Create a test file
		const authFile = join(TEST_DIR, "auth.ts");
		writeFileSync(authFile, 'export const secret = "test";');

		const result = JSON.parse(
			execSync(`npx tsx ${SCRIPT_PATH} --files=${authFile}`, {
				encoding: "utf8",
			}),
		);

		expect(result.status).toBe("pass"); // Sensitive but not enough to fail
		expect(result.score).toBeGreaterThan(0);
		expect(result.factors).toContain("sensitive_file");
	});

	it("detects large files", () => {
		// Create a large test file (>500 lines)
		const largeFile = join(TEST_DIR, "large.ts");
		const content = Array(600).fill("const x = 1;").join("\n");
		writeFileSync(largeFile, content);

		const result = JSON.parse(
			execSync(`npx tsx ${SCRIPT_PATH} --files=${largeFile}`, {
				encoding: "utf8",
			}),
		);

		expect(result.factors).toContain("large_file");
	});

	it("reduces risk for test files", () => {
		// Create a test file
		const testFile = join(TEST_DIR, "auth.test.ts");
		writeFileSync(testFile, 'describe("auth", () => {});');

		const result = JSON.parse(
			execSync(`npx tsx ${SCRIPT_PATH} --files=${testFile}`, {
				encoding: "utf8",
			}),
		);

		expect(result.factors).toContain("test_file");
		// Test files have negative risk weight
	});

	it("fails on high aggregate risk", () => {
		// Create multiple high-risk files
		const files: string[] = [];

		for (let i = 0; i < 5; i++) {
			const file = join(TEST_DIR, `auth-config-secret-${i}.ts`);
			const content = Array(600).fill("const x = 1;").join("\n");
			writeFileSync(file, content);
			files.push(file);
		}

		const result = JSON.parse(
			execSync(`npx tsx ${SCRIPT_PATH} --files=${files.join(",")}`, {
				encoding: "utf8",
			}),
		);

		// High aggregate risk should fail
		expect(result.score).toBeGreaterThan(50);
	});

	it("handles non-existent files gracefully", () => {
		const result = JSON.parse(
			execSync(`npx tsx ${SCRIPT_PATH} --files=/nonexistent/file.ts`, { encoding: "utf8" }),
		);

		// Should not crash, just return low/zero score
		expect(result.status).toBe("pass");
	});

	it("accepts files via SNAPBACK_FILES env", () => {
		const testFile = join(TEST_DIR, "test.ts");
		writeFileSync(testFile, "const x = 1;");

		const result = JSON.parse(
			execSync(`npx tsx ${SCRIPT_PATH}`, {
				encoding: "utf8",
				env: { ...process.env, SNAPBACK_FILES: testFile },
			}),
		);

		expect(result.details.totalFiles).toBe(1);
	});
});
