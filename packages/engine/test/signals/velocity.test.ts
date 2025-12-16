/**
 * Velocity Signal Tests
 *
 * Tests for velocity.ts script that integrates with BurstDetector
 * to provide accurate velocity metrics for file changes.
 */

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { BurstDetector } from "../../src/signals/burst.js";
import { calculateVelocity, type FileInput } from "../../src/signals/velocity.js";

const VELOCITY_SCRIPT = "src/signals/velocity.ts";

// ============================================================================
// Direct Import Tests (for coverage)
// ============================================================================

describe("calculateVelocity (direct import)", () => {
	describe("Happy Path", () => {
		it("should calculate velocity for single file", () => {
			const files: FileInput[] = [{ path: "test.ts", charCount: 100, timestamp: Date.now() }];
			const result = calculateVelocity(files);
			expect(result).toHaveProperty("burstDetected");
			expect(result).toHaveProperty("velocity");
			expect(result).toHaveProperty("score");
			expect(result).toHaveProperty("totalChars");
			expect(result.totalChars).toBe(100);
		});

		it("should detect burst for rapid changes", () => {
			const now = Date.now();
			const files: FileInput[] = [
				{ path: "file1.ts", charCount: 500, timestamp: now },
				{ path: "file2.ts", charCount: 400, timestamp: now + 10 },
				{ path: "file3.ts", charCount: 300, timestamp: now + 20 },
			];
			const result = calculateVelocity(files);
			expect(result.burstDetected).toBe(true);
			expect(result.score).toBe(10);
		});
	});

	describe("Sad Path", () => {
		it("should not detect burst for slow changes", () => {
			const files: FileInput[] = [{ path: "test.ts", charCount: 10 }];
			const result = calculateVelocity(files);
			expect(result.burstDetected).toBe(false);
		});

		it("should handle files with no charCount", () => {
			const files: FileInput[] = [{ path: "test.ts" }];
			const result = calculateVelocity(files);
			expect(result.totalChars).toBe(0);
		});
	});

	describe("Edge Cases", () => {
		it("should return zeros for empty array", () => {
			const result = calculateVelocity([]);
			expect(result.burstDetected).toBe(false);
			expect(result.velocity).toBe(0);
			expect(result.score).toBe(0);
			expect(result.totalChars).toBe(0);
		});

		it("should accept custom burst detector", () => {
			const detector = new BurstDetector({ threshold: 10, windowMs: 50 });
			const files: FileInput[] = [{ path: "test.ts", charCount: 100 }];
			const result = calculateVelocity(files, detector);
			expect(result).toBeDefined();
		});

		it("should cap score at 5 for non-burst small changes", () => {
			// Small changes don't trigger burst detection
			const files: FileInput[] = [{ path: "test.ts", charCount: 20 }];
			const result = calculateVelocity(files);
			expect(result.burstDetected).toBe(false);
			expect(result.score).toBeLessThanOrEqual(5);
		});
	});

	describe("Error Path", () => {
		it("should handle undefined files", () => {
			const result = calculateVelocity(undefined as unknown as FileInput[]);
			expect(result.totalChars).toBe(0);
		});
	});
});

// ============================================================================
// Subprocess Tests (original integration tests)
// ============================================================================

describe("Velocity Signal Script", () => {
	describe("JSON output contract", () => {
		it("should output valid JSON to stdout when given file changes", () => {
			const output = execSync(
				`echo '{"files": [{"path": "test.ts", "charCount": 100}]}' | npx tsx ${VELOCITY_SCRIPT}`,
				{
					encoding: "utf-8",
				},
			);

			const result = JSON.parse(output);
			expect(result).toHaveProperty("signal", "velocity");
			expect(result).toHaveProperty("value");
			expect(result).toHaveProperty("metadata");
		});

		it("should include burst detection status in metadata", () => {
			const output = execSync(
				`echo '{"files": [{"path": "test.ts", "charCount": 100}]}' | npx tsx ${VELOCITY_SCRIPT}`,
				{
					encoding: "utf-8",
				},
			);

			const result = JSON.parse(output);
			expect(result.metadata).toHaveProperty("burstDetected");
			expect(typeof result.metadata.burstDetected).toBe("boolean");
		});

		it("should include velocity metrics in metadata", () => {
			const output = execSync(
				`echo '{"files": [{"path": "test.ts", "charCount": 100}]}' | npx tsx ${VELOCITY_SCRIPT}`,
				{
					encoding: "utf-8",
				},
			);

			const result = JSON.parse(output);
			expect(result.metadata).toHaveProperty("velocity");
			expect(typeof result.metadata.velocity).toBe("number");
			expect(result.metadata.velocity).toBeGreaterThanOrEqual(0);
		});
	});

	describe("burst detection integration", () => {
		it("should detect burst when multiple rapid changes occur", () => {
			const rapidChanges = {
				files: [
					{ path: "file1.ts", charCount: 500, timestamp: Date.now() },
					{ path: "file2.ts", charCount: 400, timestamp: Date.now() + 10 },
					{ path: "file3.ts", charCount: 300, timestamp: Date.now() + 20 },
				],
			};

			const output = execSync(`echo '${JSON.stringify(rapidChanges)}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.burstDetected).toBe(true);
			expect(result.value).toBeGreaterThan(5); // High velocity score
		});

		it("should NOT detect burst for slow, gradual changes", () => {
			const slowChanges = {
				files: [{ path: "file1.ts", charCount: 10, timestamp: Date.now() }],
			};

			const output = execSync(`echo '${JSON.stringify(slowChanges)}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.burstDetected).toBe(false);
			expect(result.value).toBeLessThan(3); // Low velocity score
		});
	});

	describe("velocity calculation", () => {
		it("should calculate velocity based on character count and time delta", () => {
			const now = Date.now();
			const changes = {
				files: [
					{ path: "test.ts", charCount: 1000, timestamp: now },
					{ path: "test.ts", charCount: 500, timestamp: now + 50 },
				],
			};

			const output = execSync(`echo '${JSON.stringify(changes)}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.velocity).toBeGreaterThan(0);
			expect(result.metadata.charCount).toBe(1500);
		});

		it("should handle single file change correctly", () => {
			const singleChange = {
				files: [{ path: "test.ts", charCount: 250, timestamp: Date.now() }],
			};

			const output = execSync(`echo '${JSON.stringify(singleChange)}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.velocity).toBeGreaterThanOrEqual(0);
			expect(result.metadata.charCount).toBe(250);
		});
	});

	describe("edge cases", () => {
		it("should handle empty file list gracefully", () => {
			const output = execSync(`echo '{"files": []}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("velocity");
			expect(result.value).toBe(0);
			expect(result.metadata.burstDetected).toBe(false);
		});

		it("should handle files with zero character changes", () => {
			const zeroChanges = {
				files: [{ path: "test.ts", charCount: 0, timestamp: Date.now() }],
			};

			const output = execSync(`echo '${JSON.stringify(zeroChanges)}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.value).toBe(0);
			expect(result.metadata.burstDetected).toBe(false);
		});

		it("should handle missing timestamp by using current time", () => {
			const noTimestamp = {
				files: [{ path: "test.ts", charCount: 100 }],
			};

			const output = execSync(`echo '${JSON.stringify(noTimestamp)}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("velocity");
			expect(result.metadata).toHaveProperty("velocity");
		});
	});

	describe("error handling", () => {
		it("should output valid error JSON for invalid input", () => {
			try {
				execSync(`echo 'invalid json' | npx tsx ${VELOCITY_SCRIPT}`, {
					encoding: "utf-8",
				});
			} catch (error: any) {
				const output = error.stdout || error.stderr;
				// Should still output JSON even on error
				expect(() => JSON.parse(output)).not.toThrow();
			}
		});

		it("should handle malformed file objects", () => {
			const malformed = {
				files: [{ path: "test.ts" }], // Missing charCount
			};

			const output = execSync(`echo '${JSON.stringify(malformed)}' | npx tsx ${VELOCITY_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("velocity");
		});
	});
});
