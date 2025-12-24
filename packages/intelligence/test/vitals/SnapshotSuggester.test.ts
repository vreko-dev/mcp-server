/**
 * SnapshotSuggester Tests
 *
 * 4-path coverage per ROUTER.md C-004:
 * - Happy path: Normal suggestion with typical vitals
 * - Sad path: Minimal data (no history, cold workspace)
 * - Edge case: Threshold boundaries, trajectory changes
 * - Error case: Null forecast handling
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { VitalsSnapshot } from "../../src/types/vitals.js";
import { SnapshotSuggester } from "../../src/vitals/learning/SnapshotSuggester.js";

describe("SnapshotSuggester", () => {
	let suggester: SnapshotSuggester;

	beforeEach(() => {
		suggester = new SnapshotSuggester();
	});

	const createSnapshot = (overrides: Partial<VitalsSnapshot> = {}): VitalsSnapshot => ({
		timestamp: Date.now(),
		pulse: { level: "resting", changesPerMinute: 2 },
		temperature: { level: "cold", aiPercentage: 0 },
		pressure: { value: 10, unsnapshotedChanges: 5, timeSinceLastSnapshot: 60000, criticalFilesTouched: [] },
		oxygen: { value: 90, coveragePercentage: 90, staleSnapshots: 0 },
		trajectory: "stable",
		...overrides,
	});

	describe("Happy path: Normal suggestions", () => {
		it("should recommend 'now' for high urgency (burning temp, critical files)", () => {
			// Build history first
			suggester.suggestSnapshot(createSnapshot({ timestamp: Date.now() - 60000, trajectory: "stable" }), null);

			const snapshot = createSnapshot({
				temperature: { level: "burning", aiPercentage: 90, detectedTool: "Cursor" },
				pressure: {
					value: 85,
					unsnapshotedChanges: 50,
					timeSinceLastSnapshot: 300000,
					criticalFilesTouched: ["auth.ts", "db.ts"],
				},
				trajectory: "critical",
			});

			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.recommendation).toBe("now");
			expect(suggestion.urgency).toBeGreaterThanOrEqual(75);
			expect(suggestion.reason).toContain("immediately");
			expect(suggestion.metrics.aiActivityBurst).toBe(true);
			expect(suggestion.metrics.criticalFilesTouched).toBe(2);
		});

		it("should recommend 'soon' for moderate urgency", () => {
			// Build history first (1 minute ago)
			suggester.suggestSnapshot(
				createSnapshot({
					timestamp: Date.now() - 60000,
					pressure: {
						value: 10,
						unsnapshotedChanges: 5,
						timeSinceLastSnapshot: 60000,
						criticalFilesTouched: [],
					},
					trajectory: "stable",
				}),
				null,
			);

			const snapshot = createSnapshot({
				pressure: {
					value: 70,
					unsnapshotedChanges: 35,
					timeSinceLastSnapshot: 60000,
					criticalFilesTouched: ["config.ts"],
				},
				temperature: { level: "warm", aiPercentage: 50 },
				trajectory: "escalating",
			});

			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.recommendation).toBe("soon");
			expect(suggestion.urgency).toBeGreaterThanOrEqual(50);
			expect(suggestion.urgency).toBeLessThan(75);
			expect(suggestion.reason).toContain("soon");
		});

		it("should recommend 'monitor' for low urgency", () => {
			const snapshot = createSnapshot();

			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.recommendation).toBe("monitor");
			expect(suggestion.urgency).toBeLessThan(50);
			expect(suggestion.reason).toContain("stable");
		});
	});

	describe("Sad path: Minimal data", () => {
		it("should handle first snapshot (no history)", () => {
			const snapshot = createSnapshot();

			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.metrics.pressureRate).toBe(0);
			expect(suggestion.metrics.trajectoryConfidence).toBe(0.5); // Default confidence
			expect(suggestion.recommendation).toBe("monitor");
		});

		it("should work with zero pressure and activity", () => {
			const snapshot = createSnapshot({
				pressure: { value: 0, unsnapshotedChanges: 0, timeSinceLastSnapshot: 0, criticalFilesTouched: [] },
				pulse: { level: "resting", changesPerMinute: 0 },
			});

			const suggestion = suggester.suggestSnapshot(snapshot, null);

			// Low urgency due to trajectory uncertainty (no history = 0.5 confidence)
			expect(suggestion.urgency).toBeLessThan(20); // Base uncertainty penalty
			expect(suggestion.recommendation).toBe("monitor");
		});
	});

	describe("Edge case: Threshold boundaries", () => {
		it("should handle high urgency near 75 threshold", () => {
			// High pressure + critical files
			const snapshot = createSnapshot({
				pressure: {
					value: 85,
					unsnapshotedChanges: 50,
					timeSinceLastSnapshot: 60000,
					criticalFilesTouched: ["file1.ts", "file2.ts"],
				},
				temperature: { level: "burning", aiPercentage: 90 },
				trajectory: "escalating",
			});

			suggester.suggestSnapshot(createSnapshot({ timestamp: Date.now() - 60000, trajectory: "stable" }), null);
			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.recommendation).toBe("now");
			expect(suggestion.urgency).toBeGreaterThanOrEqual(75);
		});

		it("should handle moderate urgency near 50 threshold", () => {
			const snapshot = createSnapshot({
				pressure: {
					value: 65,
					unsnapshotedChanges: 30,
					timeSinceLastSnapshot: 120000,
					criticalFilesTouched: ["auth.ts"],
				},
				temperature: { level: "warm", aiPercentage: 40 },
				trajectory: "escalating",
			});

			suggester.suggestSnapshot(createSnapshot({ timestamp: Date.now() - 120000 }), null);
			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.recommendation).toBe("soon");
			expect(suggestion.urgency).toBeGreaterThanOrEqual(50);
			expect(suggestion.urgency).toBeLessThan(75);
		});

		it("should detect AI burst (stable → burning)", () => {
			// First: stable trajectory
			suggester.suggestSnapshot(createSnapshot({ trajectory: "stable", timestamp: Date.now() - 60000 }), null);

			// Then: burning AI activity
			const snapshot = createSnapshot({
				temperature: { level: "burning", aiPercentage: 95, detectedTool: "Claude" },
				trajectory: "escalating",
			});

			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.metrics.aiActivityBurst).toBe(true);
		});

		it("should calculate trajectory confidence from history", () => {
			// Build consistent stable history
			for (let i = 0; i < 5; i++) {
				suggester.suggestSnapshot(
					createSnapshot({ trajectory: "stable", timestamp: Date.now() - (5 - i) * 60000 }),
					null,
				);
			}

			const snapshot = createSnapshot();
			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.metrics.trajectoryConfidence).toBe(1.0); // 5/5 stable = 100%
		});
	});

	describe("Error case: Forecast handling", () => {
		it("should use forecast confidence when available", () => {
			const snapshot = createSnapshot();
			const forecast = {
				current: "stable" as const,
				in5Minutes: "escalating" as const,
				in10Minutes: "escalating" as const,
				confidence: 0.9,
				trend: "worsening" as const,
				timeToStateChange: 300000,
			};

			const suggestion = suggester.suggestSnapshot(snapshot, forecast);

			expect(suggestion.metrics.trajectoryConfidence).toBe(0.9);
		});

		it("should fall back to historical consistency when forecast is null", () => {
			suggester.suggestSnapshot(createSnapshot({ trajectory: "stable", timestamp: Date.now() - 60000 }), null);
			suggester.suggestSnapshot(
				createSnapshot({ trajectory: "escalating", timestamp: Date.now() - 30000 }),
				null,
			);

			const snapshot = createSnapshot();
			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.metrics.trajectoryConfidence).toBeLessThan(1.0); // Mixed history
		});

		it("should cap urgency at 100", () => {
			const snapshot = createSnapshot({
				pressure: {
					value: 100,
					unsnapshotedChanges: 100,
					timeSinceLastSnapshot: 1000,
					criticalFilesTouched: ["a", "b", "c", "d", "e"],
				},
				temperature: { level: "burning", aiPercentage: 100 },
				trajectory: "critical",
			});

			suggester.suggestSnapshot(createSnapshot({ timestamp: Date.now() - 1000 }), null);
			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.urgency).toBeLessThanOrEqual(100);
		});
	});

	describe("State management", () => {
		it("should maintain bounded history (maxHistorySize = 50)", () => {
			for (let i = 0; i < 100; i++) {
				suggester.suggestSnapshot(createSnapshot({ timestamp: Date.now() - (100 - i) * 1000 }), null);
			}

			// History should be capped at 50
			const snapshot = createSnapshot();
			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.metrics.pressureRate).toBeGreaterThan(0); // Should still calculate rate
		});

		it("should reset state correctly", () => {
			suggester.suggestSnapshot(createSnapshot(), null);
			suggester.reset();

			const snapshot = createSnapshot();
			const suggestion = suggester.suggestSnapshot(snapshot, null);

			expect(suggestion.metrics.pressureRate).toBe(0); // No history
		});
	});
});
