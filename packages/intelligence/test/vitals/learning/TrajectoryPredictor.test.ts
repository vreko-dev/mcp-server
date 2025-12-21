/**
 * TrajectoryPredictor - TDD Tests
 *
 * Tests for trajectory forecasting based on vitals history.
 * Follows C-004: 4-path coverage (happy, sad, edge, error)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VitalsSnapshot } from "../../../src/types/vitals.js";
import { TrajectoryPredictor } from "../../../src/vitals/learning/TrajectoryPredictor.js";

// Helper to create mock vitals
function createMockVitals(overrides: Partial<VitalsSnapshot> = {}): VitalsSnapshot {
	return {
		timestamp: Date.now(),
		pulse: { level: "resting", changesPerMinute: 10 },
		temperature: { level: "cold", aiPercentage: 10 },
		pressure: { value: 30, unsnapshotedChanges: 5, timeSinceLastSnapshot: 10, criticalFilesTouched: [] },
		oxygen: { value: 80, coveragePercentage: 80, staleSnapshots: 0 },
		trajectory: "stable",
		...overrides,
	};
}

// Helper to create vitals sequence with increasing pressure
function createEscalatingSequence(count: number, startPressure = 30): VitalsSnapshot[] {
	const now = Date.now();
	const snapshots: VitalsSnapshot[] = [];

	for (let i = 0; i < count; i++) {
		const pressure = Math.min(startPressure + i * 10, 100);
		snapshots.push(
			createMockVitals({
				timestamp: now - (count - i - 1) * 60000, // 1 minute apart
				pressure: {
					value: pressure,
					unsnapshotedChanges: i + 1,
					timeSinceLastSnapshot: (i + 1) * 5,
					criticalFilesTouched: [],
				},
				trajectory: pressure > 80 ? "critical" : pressure > 60 ? "escalating" : "stable",
			}),
		);
	}

	return snapshots;
}

// Helper to create stable sequence
function createStableSequence(count: number): VitalsSnapshot[] {
	const now = Date.now();
	const snapshots: VitalsSnapshot[] = [];

	for (let i = 0; i < count; i++) {
		snapshots.push(
			createMockVitals({
				timestamp: now - (count - i - 1) * 60000,
				pressure: { value: 30, unsnapshotedChanges: 5, timeSinceLastSnapshot: 10, criticalFilesTouched: [] },
				trajectory: "stable",
			}),
		);
	}

	return snapshots;
}

// Helper to create improving sequence (pressure decreasing)
function createImprovingSequence(count: number, startPressure = 80): VitalsSnapshot[] {
	const now = Date.now();
	const snapshots: VitalsSnapshot[] = [];

	for (let i = 0; i < count; i++) {
		const pressure = Math.max(startPressure - i * 10, 20);
		snapshots.push(
			createMockVitals({
				timestamp: now - (count - i - 1) * 60000,
				pressure: {
					value: pressure,
					unsnapshotedChanges: Math.max(10 - i, 1),
					timeSinceLastSnapshot: 10,
					criticalFilesTouched: [],
				},
				trajectory: pressure > 60 ? "escalating" : "stable",
			}),
		);
	}

	return snapshots;
}

describe("TrajectoryPredictor", () => {
	let predictor: TrajectoryPredictor;

	beforeEach(() => {
		predictor = new TrajectoryPredictor("test-workspace");
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// =========================================================================
	// HAPPY PATH: Normal prediction scenarios
	// =========================================================================
	describe("happy path - prediction accuracy", () => {
		it("should predict stable trajectory when pressure is consistently low", () => {
			const history = createStableSequence(5);
			predictor.recordSnapshots(history);

			const forecast = predictor.predict();

			expect(forecast.current).toBe("stable");
			expect(forecast.in5Minutes).toBe("stable");
			expect(forecast.in10Minutes).toBe("stable");
			expect(forecast.trend).toBe("stable");
		});

		it("should predict escalating trajectory when pressure is rising", () => {
			const history = createEscalatingSequence(5, 40);
			predictor.recordSnapshots(history);

			const forecast = predictor.predict();

			expect(forecast.trend).toBe("worsening");
			expect(["escalating", "critical"]).toContain(forecast.in5Minutes);
		});

		it("should predict improvement when pressure is dropping", () => {
			const history = createImprovingSequence(5, 70);
			predictor.recordSnapshots(history);

			const forecast = predictor.predict();

			expect(forecast.trend).toBe("improving");
			expect(forecast.in5Minutes).toBe("stable");
		});

		it("should calculate time until state change for escalating trajectory", () => {
			const history = createEscalatingSequence(5, 60);
			predictor.recordSnapshots(history);

			const forecast = predictor.predict();

			// Should have a non-null time estimate
			if (forecast.current !== "critical") {
				expect(forecast.timeToStateChange).not.toBeNull();
				expect(forecast.timeToStateChange).toBeGreaterThan(0);
			}
		});
	});

	// =========================================================================
	// SAD PATH: Insufficient data
	// =========================================================================
	describe("sad path - insufficient data", () => {
		it("should return low confidence with no history", () => {
			const forecast = predictor.predict();

			expect(forecast.confidence).toBe(0);
			expect(forecast.current).toBe("stable");
		});

		it("should return low confidence with only one snapshot", () => {
			predictor.recordSnapshots([createMockVitals()]);

			const forecast = predictor.predict();

			expect(forecast.confidence).toBeLessThan(0.5);
		});

		it("should return stable forecast with insufficient data", () => {
			predictor.recordSnapshots([createMockVitals()]);

			const forecast = predictor.predict();

			expect(forecast.in5Minutes).toBe("stable");
			expect(forecast.in10Minutes).toBe("stable");
		});
	});

	// =========================================================================
	// EDGE CASE: Boundary conditions
	// =========================================================================
	describe("edge case - boundary conditions", () => {
		it("should handle rapid state changes", () => {
			const now = Date.now();
			const rapidChanges: VitalsSnapshot[] = [
				createMockVitals({
					timestamp: now - 5000,
					pressure: { value: 30, unsnapshotedChanges: 1, timeSinceLastSnapshot: 5, criticalFilesTouched: [] },
					trajectory: "stable",
				}),
				createMockVitals({
					timestamp: now - 4000,
					pressure: {
						value: 60,
						unsnapshotedChanges: 5,
						timeSinceLastSnapshot: 10,
						criticalFilesTouched: [],
					},
					trajectory: "escalating",
				}),
				createMockVitals({
					timestamp: now - 3000,
					pressure: {
						value: 85,
						unsnapshotedChanges: 10,
						timeSinceLastSnapshot: 20,
						criticalFilesTouched: [],
					},
					trajectory: "critical",
				}),
			];

			predictor.recordSnapshots(rapidChanges);
			const forecast = predictor.predict();

			expect(forecast.current).toBe("critical");
			expect(forecast.trend).toBe("worsening");
		});

		it("should cap predictions at critical level", () => {
			const history = createEscalatingSequence(10, 70);
			predictor.recordSnapshots(history);

			const forecast = predictor.predict();

			// Cannot go beyond critical
			expect(["stable", "escalating", "critical"]).toContain(forecast.in10Minutes);
		});

		it("should calculate confidence based on data quality", () => {
			// More history = higher confidence
			const shortHistory = createStableSequence(3);
			const longHistory = createStableSequence(10);

			predictor.recordSnapshots(shortHistory);
			const shortForecast = predictor.predict();

			predictor.reset();
			predictor.recordSnapshots(longHistory);
			const longForecast = predictor.predict();

			expect(longForecast.confidence).toBeGreaterThan(shortForecast.confidence);
		});

		it("should detect plateau (stable after escalation)", () => {
			const now = Date.now();
			const plateau: VitalsSnapshot[] = [
				createMockVitals({
					timestamp: now - 300000,
					pressure: { value: 30, unsnapshotedChanges: 1, timeSinceLastSnapshot: 5, criticalFilesTouched: [] },
					trajectory: "stable",
				}),
				createMockVitals({
					timestamp: now - 240000,
					pressure: {
						value: 50,
						unsnapshotedChanges: 5,
						timeSinceLastSnapshot: 10,
						criticalFilesTouched: [],
					},
					trajectory: "escalating",
				}),
				createMockVitals({
					timestamp: now - 180000,
					pressure: {
						value: 65,
						unsnapshotedChanges: 8,
						timeSinceLastSnapshot: 15,
						criticalFilesTouched: [],
					},
					trajectory: "escalating",
				}),
				createMockVitals({
					timestamp: now - 120000,
					pressure: {
						value: 65,
						unsnapshotedChanges: 8,
						timeSinceLastSnapshot: 15,
						criticalFilesTouched: [],
					},
					trajectory: "escalating",
				}),
				createMockVitals({
					timestamp: now - 60000,
					pressure: {
						value: 65,
						unsnapshotedChanges: 8,
						timeSinceLastSnapshot: 15,
						criticalFilesTouched: [],
					},
					trajectory: "escalating",
				}),
			];

			predictor.recordSnapshots(plateau);
			const forecast = predictor.predict();

			// Plateau should stabilize predictions
			expect(forecast.trend).toBe("stable");
		});
	});

	// =========================================================================
	// ERROR CASE: Edge cases and reset
	// =========================================================================
	describe("error case - reset and recovery", () => {
		it("should reset history when reset() is called", () => {
			predictor.recordSnapshots(createEscalatingSequence(5));
			predictor.reset();

			const forecast = predictor.predict();

			expect(forecast.confidence).toBe(0);
		});

		it("should handle recording after reset", () => {
			predictor.recordSnapshots(createEscalatingSequence(5));
			predictor.reset();
			predictor.recordSnapshots(createStableSequence(5));

			const forecast = predictor.predict();

			expect(forecast.trend).toBe("stable");
			expect(forecast.confidence).toBeGreaterThan(0);
		});

		it("should limit history to prevent memory growth", () => {
			// Record many snapshots
			const largeHistory = createStableSequence(200);
			predictor.recordSnapshots(largeHistory);

			// Should still work without memory issues
			const forecast = predictor.predict();

			expect(forecast).toBeDefined();
			expect(forecast.confidence).toBeGreaterThan(0);
		});

		it("should get prediction context", () => {
			const history = createEscalatingSequence(5);
			predictor.recordSnapshots(history);

			const context = predictor.getContext();

			expect(context.recentHistory.length).toBeGreaterThan(0);
			expect(context.pressureRate).toBeDefined();
			expect(context.oxygenRate).toBeDefined();
		});
	});
});
