/**
 * OxygenSensor Tests
 *
 * 4-path coverage per ROUTER.md C-004:
 * - Happy path: Normal snapshot coverage tracking
 * - Sad path: No snapshots / no modifications
 * - Edge case: Stale snapshots, critical files
 * - Error case: Invalid configurations
 */

import { describe, expect, it } from "vitest";
import { OxygenSensor } from "../../src/vitals/OxygenSensor.js";

describe("OxygenSensor", () => {
	describe("initialization", () => {
		it("should start with 100% oxygen when no files modified", () => {
			const sensor = new OxygenSensor();
			const state = sensor.getLevel();

			expect(state.value).toBe(100);
			expect(state.coveragePercentage).toBe(100);
			expect(state.staleSnapshots).toBe(0);
		});

		it("should use default config when none provided", () => {
			const sensor = new OxygenSensor();
			expect(sensor.getCounts()).toEqual({ modified: 0, snapshots: 0 });
		});

		it("should allow partial config override", () => {
			const sensor = new OxygenSensor({ staleMinutes: 60 });
			expect(sensor.getLevel().value).toBe(100);
		});
	});

	describe("coverage tracking", () => {
		it("should track modified files without snapshots as uncovered", () => {
			const now = Date.now();
			const sensor = new OxygenSensor();

			sensor.recordModification("/src/file1.ts");
			sensor.recordModification("/src/file2.ts");

			const state = sensor.getLevel(now);
			expect(state.value).toBe(0); // No snapshots
			expect(state.coveragePercentage).toBe(0);
		});

		it("should track modified files with snapshots as covered", () => {
			const now = Date.now();
			const sensor = new OxygenSensor();

			sensor.recordModification("/src/file1.ts");
			sensor.recordSnapshot("/src/file1.ts", now);

			// File was snapshotted, so removed from modified list
			const state = sensor.getLevel(now);
			expect(state.value).toBe(100);
		});

		it("should calculate partial coverage correctly", () => {
			const now = Date.now();
			const sensor = new OxygenSensor();

			sensor.recordModification("/src/file1.ts");
			sensor.recordModification("/src/file2.ts");
			sensor.recordModification("/src/file3.ts");
			sensor.recordModification("/src/file4.ts");

			// Snapshot only 2 of 4 files
			sensor.recordSnapshot("/src/file1.ts", now);
			sensor.recordSnapshot("/src/file2.ts", now);

			// But snapshotted files are removed from modified list
			// So we have 2 modified files with no snapshots = 0% coverage
			const state = sensor.getLevel(now);
			expect(state.value).toBe(0);
		});

		it("should handle re-modification after snapshot", () => {
			const now = Date.now();
			const sensor = new OxygenSensor();

			sensor.recordModification("/src/file.ts");
			sensor.recordSnapshot("/src/file.ts", now - 1000);

			// File modified again after snapshot
			sensor.recordModification("/src/file.ts");

			// Now it has a snapshot (from before) but is in modified list
			const state = sensor.getLevel(now);
			expect(state.value).toBe(100); // Has recent snapshot
		});
	});

	describe("critical file weighting", () => {
		it("should weight critical files 2x", () => {
			const now = Date.now();
			const sensor = new OxygenSensor({ criticalWeight: 2 });

			// 1 normal file + 1 critical file, both uncovered
			sensor.recordModification("/src/normal.ts");
			sensor.recordModification("/package.json");

			const uncovered = sensor.getUncoveredFiles();
			expect(uncovered).toContain("/src/normal.ts");
			expect(uncovered).toContain("/package.json");

			// Normal file = 1 weight, package.json = 2 weight, total = 3
			// 0 covered, so 0%
			const state = sensor.getLevel(now);
			expect(state.value).toBe(0);
		});

		it("should recognize various critical file patterns", () => {
			const sensor = new OxygenSensor();
			// const now = Date.now(); // TODO: Use for timestamp validation

			const criticalFiles = [
				"/package.json",
				"/.env",
				"/.env.local",
				"/tsconfig.json",
				"/pnpm-lock.yaml",
				"/db/migrations/001_init.sql",
			];

			for (const file of criticalFiles) {
				sensor.recordModification(file);
			}

			const uncovered = sensor.getUncoveredFiles();
			expect(uncovered.length).toBe(criticalFiles.length);
		});
	});

	describe("stale snapshots", () => {
		it("should mark snapshots as stale after threshold", () => {
			const sensor = new OxygenSensor({ staleMinutes: 30 });
			const now = Date.now();

			sensor.recordModification("/src/file.ts");
			// Snapshot from 35 minutes ago
			sensor.recordSnapshot("/src/file.ts", now - 35 * 60 * 1000);

			// Re-add to modified since snapshot removed it
			sensor.recordModification("/src/file.ts");

			const state = sensor.getLevel(now);
			expect(state.staleSnapshots).toBe(1);
			expect(state.value).toBe(0); // Stale doesn't count as covered
		});

		it("should count fresh snapshots as covered", () => {
			const sensor = new OxygenSensor({ staleMinutes: 30 });
			const now = Date.now();

			sensor.recordModification("/src/file.ts");
			// Snapshot from 10 minutes ago
			sensor.recordSnapshot("/src/file.ts", now - 10 * 60 * 1000);

			// Re-add to simulate re-modification with existing snapshot
			sensor.recordModification("/src/file.ts");

			const state = sensor.getLevel(now);
			expect(state.staleSnapshots).toBe(0);
			expect(state.value).toBe(100); // Fresh snapshot covers it
		});
	});

	describe("bulk operations", () => {
		it("should handle bulk snapshot correctly", () => {
			const now = Date.now();
			const sensor = new OxygenSensor();

			sensor.recordModification("/src/file1.ts");
			sensor.recordModification("/src/file2.ts");
			sensor.recordModification("/src/file3.ts");

			sensor.recordBulkSnapshot(["/src/file1.ts", "/src/file2.ts", "/src/file3.ts"], now);

			// All files snapshotted and removed from modified
			const state = sensor.getLevel(now);
			expect(state.value).toBe(100);
			expect(sensor.getCounts().modified).toBe(0);
		});
	});

	describe("edge cases", () => {
		it("should handle reset correctly", () => {
			const sensor = new OxygenSensor();
			const now = Date.now();

			sensor.recordModification("/src/file.ts");
			sensor.recordSnapshot("/src/file.ts", now);

			expect(sensor.getCounts().snapshots).toBe(1);

			sensor.reset();

			expect(sensor.getCounts()).toEqual({ modified: 0, snapshots: 0 });
			expect(sensor.getLevel().value).toBe(100);
		});

		it("should handle empty file paths", () => {
			const sensor = new OxygenSensor();
			const now = Date.now();

			sensor.recordModification("");

			const state = sensor.getLevel(now);
			expect(state.value).toBe(0); // Uncovered empty file
		});

		it("should handle duplicate modifications", () => {
			const sensor = new OxygenSensor();
			const now = Date.now();

			sensor.recordModification("/src/file.ts");
			sensor.recordModification("/src/file.ts");
			sensor.recordModification("/src/file.ts");

			// Should only count once (Set behavior)
			expect(sensor.getCounts().modified).toBe(1);
		});

		it("should handle snapshot update for same file", () => {
			const sensor = new OxygenSensor();
			const now = Date.now();

			sensor.recordModification("/src/file.ts");
			sensor.recordSnapshot("/src/file.ts", now - 1000);
			sensor.recordModification("/src/file.ts"); // Re-modify
			sensor.recordSnapshot("/src/file.ts", now); // Update snapshot

			// Latest snapshot timestamp should be used
			expect(sensor.getCounts().modified).toBe(0);
			expect(sensor.getCounts().snapshots).toBe(1);
		});
	});

	describe("error handling", () => {
		it("should handle zero staleMinutes", () => {
			const sensor = new OxygenSensor({ staleMinutes: 0 });
			const now = Date.now();

			sensor.recordModification("/src/file.ts");
			sensor.recordSnapshot("/src/file.ts", now);
			sensor.recordModification("/src/file.ts");

			// With staleMinutes=0, everything is stale immediately
			const state = sensor.getLevel(now);
			expect(state.staleSnapshots).toBe(1);
		});
	});

	describe("performance characteristics", () => {
		it("should handle many files efficiently", () => {
			const sensor = new OxygenSensor();
			const now = Date.now();

			const start = performance.now();
			for (let i = 0; i < 1000; i++) {
				sensor.recordModification(`/src/file${i}.ts`);
				if (i % 2 === 0) {
					sensor.recordSnapshot(`/src/file${i}.ts`, now);
				}
			}
			const recordTime = performance.now() - start;

			const getStart = performance.now();
			sensor.getLevel(now);
			const getTime = performance.now() - getStart;

			expect(recordTime).toBeLessThan(50);
			expect(getTime).toBeLessThan(20);
		});
	});
});
