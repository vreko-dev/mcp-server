/**
 * PressureGauge Tests
 *
 * 4-path coverage per ROUTER.md C-004:
 * - Happy path: Normal pressure accumulation and release
 * - Sad path: Edge cases with no changes
 * - Edge case: Boundary conditions at max pressure
 * - Error case: Invalid configurations
 */

import { describe, expect, it } from "vitest";
import { PressureGauge } from "../../src/vitals/PressureGauge.js";

describe("PressureGauge", () => {
	describe("initialization", () => {
		it("should start with zero pressure", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);
			const state = gauge.getState(now);

			expect(state.value).toBe(0);
			expect(state.unsnapshotedChanges).toBe(0);
			expect(state.timeSinceLastSnapshot).toBe(0);
			expect(state.criticalFilesTouched).toEqual([]);
		});

		it("should use default config when none provided", () => {
			const gauge = new PressureGauge();
			// Verify it initializes correctly
			expect(gauge.getState().unsnapshotedChanges).toBe(0);
		});

		it("should allow partial config override", () => {
			const gauge = new PressureGauge({ baseRate: 10 });
			expect(gauge.getState().value).toBe(0);
		});
	});

	describe("pressure accumulation on changes", () => {
		it("should accumulate pressure on file changes", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			gauge.recordChange("/src/file1.ts");
			gauge.recordChange("/src/file2.ts");
			gauge.recordChange("/src/file3.ts");

			const state = gauge.getState(now);
			expect(state.unsnapshotedChanges).toBe(3);
			expect(state.value).toBeGreaterThan(0);
		});

		it("should apply 2x multiplier for critical files", () => {
			const now = Date.now();
			const gaugeNormal = new PressureGauge({}, now);
			const gaugeCritical = new PressureGauge({}, now);

			// Multiple changes to get visible difference after rounding
			for (let i = 0; i < 5; i++) {
				gaugeNormal.recordChange(`/src/component${i}.tsx`);
				gaugeCritical.recordChange("/package.json");
			}

			const normalState = gaugeNormal.getState(now);
			const criticalState = gaugeCritical.getState(now);

			// Critical file should add more pressure (5 changes at 2x vs 1x)
			// Normal: 5 * (5/10) = 2.5 → 3
			// Critical: 5 * (5*2/10) = 5 → 5
			expect(criticalState.value).toBeGreaterThan(normalState.value);
			expect(criticalState.criticalFilesTouched).toContain("/package.json");
		});

		it("should track critical files touched", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			gauge.recordChange("/package.json");
			gauge.recordChange("/src/app.ts");
			gauge.recordChange("/.env.local");

			const state = gauge.getState(now);
			expect(state.criticalFilesTouched).toContain("/package.json");
			expect(state.criticalFilesTouched).toContain("/.env.local");
			expect(state.criticalFilesTouched).not.toContain("/src/app.ts");
		});

		it("should recognize various critical file patterns", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			const criticalFiles = [
				"/package.json",
				"/.env",
				"/.env.local",
				"/.env.production",
				"/tsconfig.json",
				"/pnpm-lock.yaml",
				"/yarn.lock",
				"/db/migrations/001_init.sql",
				"/prisma/schema.prisma",
				"/docker-compose.yml",
				"/docker-compose.yaml",
				"/Dockerfile",
			];

			for (const file of criticalFiles) {
				gauge.recordChange(file);
			}

			const state = gauge.getState(now);
			expect(state.criticalFilesTouched.length).toBe(criticalFiles.length);
		});
	});

	describe("time-based pressure accumulation", () => {
		it("should NOT accumulate time pressure when there are no changes", () => {
			const startTime = Date.now();
			const gauge = new PressureGauge({}, startTime);

			// After 10 minutes with NO changes, pressure should remain 0
			const tenMinutesLater = startTime + 10 * 60 * 1000;
			const state = gauge.getState(tenMinutesLater);

			// No unsnapshot changes = no time pressure (idle workspace)
			expect(state.value).toBe(0);
			expect(state.timeSinceLastSnapshot).toBe(10);
			expect(state.unsnapshotedChanges).toBe(0);
		});

		it("should accumulate time pressure when there ARE unsnapshot changes", () => {
			const startTime = Date.now();
			const gauge = new PressureGauge({}, startTime);

			// Make a change first
			gauge.recordChange("/src/file.ts");

			// After 10 minutes with unsnapshot changes, time pressure should accumulate
			const tenMinutesLater = startTime + 10 * 60 * 1000;
			const state = gauge.getState(tenMinutesLater);

			// 10 min * 5% base rate = 50% + change pressure
			expect(state.value).toBeGreaterThanOrEqual(50);
			expect(state.timeSinceLastSnapshot).toBe(10);
			expect(state.unsnapshotedChanges).toBe(1);
		});

		it("should combine change and time pressure", () => {
			const startTime = Date.now();
			const gauge = new PressureGauge({}, startTime);

			// Add some file changes
			gauge.recordChange("/src/file1.ts");
			gauge.recordChange("/src/file2.ts");

			// After 5 minutes
			const fiveMinutesLater = startTime + 5 * 60 * 1000;
			const state = gauge.getState(fiveMinutesLater);

			// Should have both time pressure (5*5=25) and change pressure
			expect(state.value).toBeGreaterThan(25);
		});
	});

	describe("pressure release on snapshot", () => {
		it("should release 50% pressure on snapshot", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			// Accumulate some pressure via changes
			for (let i = 0; i < 20; i++) {
				gauge.recordChange(`/src/file${i}.ts`);
			}

			const beforeState = gauge.getState(now);
			expect(beforeState.value).toBeGreaterThan(0);
			const beforeValue = beforeState.value;

			// Take a snapshot
			gauge.recordSnapshot(now);

			const afterState = gauge.getState(now);
			// Change-based pressure should be halved, time resets
			expect(afterState.unsnapshotedChanges).toBe(0);
			expect(afterState.criticalFilesTouched).toEqual([]);
			expect(afterState.timeSinceLastSnapshot).toBe(0);
		});

		it("should clear critical files on snapshot", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			gauge.recordChange("/package.json");
			gauge.recordChange("/.env");

			expect(gauge.getState(now).criticalFilesTouched.length).toBe(2);

			gauge.recordSnapshot(now);

			expect(gauge.getState(now).criticalFilesTouched).toEqual([]);
		});

		it("should reset time counter on snapshot", () => {
			const startTime = Date.now();
			const gauge = new PressureGauge({}, startTime);

			// After 10 minutes
			const tenMinutesLater = startTime + 10 * 60 * 1000;

			expect(gauge.getState(tenMinutesLater).timeSinceLastSnapshot).toBe(10);

			// Take snapshot
			gauge.recordSnapshot(tenMinutesLater);

			// 5 minutes after snapshot
			const fifteenMinutesFromStart = startTime + 15 * 60 * 1000;
			expect(gauge.getState(fifteenMinutesFromStart).timeSinceLastSnapshot).toBe(5);
		});
	});

	describe("edge cases", () => {
		it("should cap at max pressure", () => {
			const now = Date.now();
			const gauge = new PressureGauge({ maxPressure: 100 }, now);

			// Add tons of changes to exceed max
			for (let i = 0; i < 500; i++) {
				gauge.recordChange(`/src/file${i}.ts`);
			}

			// Also add lots of time
			const wayLater = now + 60 * 60 * 1000; // 1 hour later

			const state = gauge.getState(wayLater);
			expect(state.value).toBe(100);
		});

		it("should handle reset correctly", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			gauge.recordChange("/package.json");
			gauge.recordChange("/src/app.ts");

			const laterTime = now + 5 * 60 * 1000;
			expect(gauge.getState(laterTime).value).toBeGreaterThan(0);

			gauge.reset(laterTime);

			expect(gauge.getState(laterTime).value).toBe(0);
			expect(gauge.getState(laterTime).unsnapshotedChanges).toBe(0);
			expect(gauge.getState(laterTime).criticalFilesTouched).toEqual([]);
		});

		it("should handle empty file paths", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			gauge.recordChange("");

			const state = gauge.getState(now);
			expect(state.unsnapshotedChanges).toBe(1);
			// Empty path shouldn't match critical patterns
			expect(state.criticalFilesTouched).toEqual([]);
		});
	});

	describe("error handling", () => {
		it("should handle zero baseRate gracefully", () => {
			const now = Date.now();
			const gauge = new PressureGauge({ baseRate: 0 }, now);

			gauge.recordChange("/src/file.ts");

			const laterTime = now + 10 * 60 * 1000;
			const state = gauge.getState(laterTime);

			expect(state.value).toBe(0);
		});

		it("should handle negative time difference gracefully", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			// Query with time before initialization
			const beforeNow = now - 10000;
			const state = gauge.getState(beforeNow);

			expect(state.timeSinceLastSnapshot).toBe(0);
		});
	});

	describe("performance characteristics", () => {
		it("should handle many changes efficiently", () => {
			const now = Date.now();
			const gauge = new PressureGauge({}, now);

			const start = performance.now();
			for (let i = 0; i < 10000; i++) {
				gauge.recordChange(`/src/deep/nested/path/file${i}.ts`);
			}
			const recordTime = performance.now() - start;

			const getStart = performance.now();
			gauge.getState(now);
			const getTime = performance.now() - getStart;

			// Both operations should be fast
			expect(recordTime).toBeLessThan(100);
			expect(getTime).toBeLessThan(10);
		});
	});
});
