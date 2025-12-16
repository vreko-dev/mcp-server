/**
 * Consumers Signal Tests
 *
 * Tests for consumers.ts script that counts import fan-in for files.
 * High fan-in = more impact when changed = higher risk.
 */

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyzeConsumers, type ConsumersInput, countConsumers } from "../../src/signals/consumers.js";

const CONSUMERS_SCRIPT = "src/signals/consumers.ts";

// ============================================================================
// Direct Import Tests (for coverage)
// ============================================================================

describe("analyzeConsumers (direct import)", () => {
	describe("Happy Path", () => {
		it("should return empty results for empty files", () => {
			const result = analyzeConsumers({ files: [] });
			expect(result.fileConsumers).toEqual([]);
			expect(result.maxConsumers).toBe(0);
			expect(result.avgConsumers).toBe(0);
			expect(result.score).toBe(0);
		});

		it("should analyze files in workspace", () => {
			const input: ConsumersInput = {
				files: ["src/types.ts"],
				workspace: process.cwd(),
			};
			const result = analyzeConsumers(input);
			expect(result.fileConsumers).toHaveLength(1);
			expect(result.fileConsumers[0]).toHaveProperty("file");
			expect(result.fileConsumers[0]).toHaveProperty("consumers");
		});
	});

	describe("Sad Path", () => {
		it("should handle non-existent files", () => {
			const input: ConsumersInput = {
				files: ["non-existent-file.ts"],
				workspace: process.cwd(),
			};
			const result = analyzeConsumers(input);
			expect(result.fileConsumers[0].consumers).toBe(0);
		});
	});

	describe("Edge Cases", () => {
		it("should use cwd when workspace not provided", () => {
			const input: ConsumersInput = { files: ["src/types.ts"] };
			expect(() => analyzeConsumers(input)).not.toThrow();
		});

		it("should calculate score based on max consumers", () => {
			const input: ConsumersInput = {
				files: ["src/types.ts", "src/index.ts"],
				workspace: process.cwd(),
			};
			const result = analyzeConsumers(input);
			expect(result.score).toBeLessThanOrEqual(10);
		});
	});

	describe("Error Path", () => {
		it("should handle undefined files", () => {
			const input: ConsumersInput = { files: undefined as unknown as string[] };
			const result = analyzeConsumers(input);
			expect(result.fileConsumers).toEqual([]);
		});
	});
});

describe("countConsumers (direct import)", () => {
	it("should return 0 for non-existent file", () => {
		const result = countConsumers("non-existent.ts", process.cwd());
		expect(result).toBe(0);
	});

	it("should count consumers for existing file", () => {
		const result = countConsumers("src/types.ts", process.cwd());
		expect(typeof result).toBe("number");
		expect(result).toBeGreaterThanOrEqual(0);
	});
});

// ============================================================================
// Subprocess Tests (original integration tests)
// ============================================================================

describe("Consumers Signal Script", () => {
	describe("JSON output contract", () => {
		it("should output valid JSON with signal schema", () => {
			const input = {
				files: ["src/types.ts"],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${CONSUMERS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result).toHaveProperty("signal", "consumers");
			expect(result).toHaveProperty("value");
			expect(typeof result.value).toBe("number");
			expect(result).toHaveProperty("metadata");
		});

		it("should include file consumer counts in metadata", () => {
			const input = {
				files: ["src/types.ts"],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${CONSUMERS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata).toHaveProperty("files");
			expect(Array.isArray(result.metadata.files)).toBe(true);
		});

		it("should include maxConsumers in metadata", () => {
			const input = {
				files: ["src/types.ts"],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${CONSUMERS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata).toHaveProperty("maxConsumers");
			expect(typeof result.metadata.maxConsumers).toBe("number");
		});
	});

	describe("edge cases", () => {
		it("should handle empty files list", () => {
			const output = execSync(`echo '{"files":[]}' | npx tsx ${CONSUMERS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("consumers");
			expect(result.value).toBe(0);
			expect(result.metadata.maxConsumers).toBe(0);
		});

		it("should handle non-existent files gracefully", () => {
			const input = {
				files: ["non-existent-file.ts"],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${CONSUMERS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("consumers");
			expect(result.metadata.files[0].consumers).toBe(0);
		});

		it("should handle multiple files", () => {
			const input = {
				files: ["src/types.ts", "src/index.ts"],
				workspace: process.cwd(),
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${CONSUMERS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.files.length).toBe(2);
		});
	});

	describe("error handling", () => {
		it("should output valid JSON for invalid input", () => {
			try {
				execSync(`echo 'invalid json' | npx tsx ${CONSUMERS_SCRIPT}`, {
					encoding: "utf-8",
				});
			} catch (error: any) {
				const output = error.stdout || error.stderr;
				expect(() => JSON.parse(output)).not.toThrow();
			}
		});
	});
});
