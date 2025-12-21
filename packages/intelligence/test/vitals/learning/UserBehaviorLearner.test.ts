/**
 * UserBehaviorLearner - TDD Tests
 *
 * Tests for user behavior learning and snapshot pattern tracking.
 * Follows C-004: 4-path coverage (happy, sad, edge, error)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VitalsSnapshot } from "../../../src/types/vitals.js";
import { UserBehaviorLearner } from "../../../src/vitals/learning/UserBehaviorLearner.js";

// Helper to create a mock VitalsSnapshot
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

describe("UserBehaviorLearner", () => {
	let learner: UserBehaviorLearner;

	beforeEach(() => {
		learner = new UserBehaviorLearner("test-workspace");
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// =========================================================================
	// HAPPY PATH: Normal behavior tracking
	// =========================================================================
	describe("happy path - observation recording", () => {
		it("should record a snapshot observation when user creates snapshot", () => {
			const vitals = createMockVitals({
				pressure: { value: 60, unsnapshotedChanges: 10, timeSinceLastSnapshot: 15, criticalFilesTouched: [] },
			});

			const observation = learner.recordObservation({
				vitals,
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});

			expect(observation.id).toBeDefined();
			expect(observation.workspaceId).toBe("test-workspace");
			expect(observation.userCreatedSnapshot).toBe(true);
			expect(observation.vitalsRecommended).toBe(true);
			expect(observation.timing).toBe("aligned");
		});

		it("should classify 'early' timing when user snapshots before recommendation", () => {
			const vitals = createMockVitals({
				pressure: { value: 20, unsnapshotedChanges: 3, timeSinceLastSnapshot: 5, criticalFilesTouched: [] },
			});

			const observation = learner.recordObservation({
				vitals,
				userCreatedSnapshot: true,
				vitalsRecommended: false,
			});

			expect(observation.timing).toBe("early");
		});

		it("should classify 'late' timing when user snapshots after prolonged recommendation", () => {
			// Simulate situation where vitals recommended but user waited
			const vitals = createMockVitals({
				pressure: {
					value: 85,
					unsnapshotedChanges: 20,
					timeSinceLastSnapshot: 45,
					criticalFilesTouched: ["config.ts"],
				},
				trajectory: "critical",
			});

			const observation = learner.recordObservation({
				vitals,
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});

			expect(observation.timing).toBe("late");
		});

		it("should return behavior stats with correct counts", () => {
			// Record multiple observations
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: {
						value: 60,
						unsnapshotedChanges: 10,
						timeSinceLastSnapshot: 15,
						criticalFilesTouched: [],
					},
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: { value: 20, unsnapshotedChanges: 3, timeSinceLastSnapshot: 5, criticalFilesTouched: [] },
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: false,
			});

			const stats = learner.getStats();

			expect(stats.totalObservations).toBe(2);
			expect(stats.alignedSnapshots).toBe(1);
			expect(stats.earlySnapshots).toBe(1);
		});
	});

	// =========================================================================
	// SAD PATH: Expected failures
	// =========================================================================
	describe("sad path - missed recommendations", () => {
		it("should record missed recommendation when user ignores vitals advice", () => {
			const vitals = createMockVitals({
				pressure: { value: 70, unsnapshotedChanges: 15, timeSinceLastSnapshot: 30, criticalFilesTouched: [] },
				trajectory: "escalating",
			});

			const observation = learner.recordObservation({
				vitals,
				userCreatedSnapshot: false,
				vitalsRecommended: true,
			});

			expect(observation.timing).toBe("missed");
			expect(observation.userCreatedSnapshot).toBe(false);
		});

		it("should track missed recommendations in stats", () => {
			// User ignores 3 recommendations
			for (let i = 0; i < 3; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 70 + i * 5,
							unsnapshotedChanges: 15,
							timeSinceLastSnapshot: 30,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: false,
					vitalsRecommended: true,
				});
			}

			const stats = learner.getStats();

			expect(stats.missedRecommendations).toBe(3);
		});
	});

	// =========================================================================
	// EDGE CASE: Boundary conditions
	// =========================================================================
	describe("edge case - boundary conditions", () => {
		it("should infer 'conservative' risk profile when user snapshots early consistently", () => {
			// Record 5 early snapshots (user is cautious)
			for (let i = 0; i < 5; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 15,
							unsnapshotedChanges: 2,
							timeSinceLastSnapshot: 3,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: false,
				});
			}

			const stats = learner.getStats();

			expect(stats.riskProfile).toBe("conservative");
		});

		it("should infer 'aggressive' risk profile when user frequently ignores recommendations", () => {
			// Record 5 ignored recommendations
			for (let i = 0; i < 5; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 75,
							unsnapshotedChanges: 20,
							timeSinceLastSnapshot: 40,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: false,
					vitalsRecommended: true,
				});
			}

			const stats = learner.getStats();

			expect(stats.riskProfile).toBe("aggressive");
		});

		it("should infer 'balanced' risk profile when behavior is mixed", () => {
			// 2 aligned, 2 early, 1 late
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: {
						value: 60,
						unsnapshotedChanges: 10,
						timeSinceLastSnapshot: 15,
						criticalFilesTouched: [],
					},
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: {
						value: 60,
						unsnapshotedChanges: 10,
						timeSinceLastSnapshot: 15,
						criticalFilesTouched: [],
					},
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: { value: 20, unsnapshotedChanges: 3, timeSinceLastSnapshot: 5, criticalFilesTouched: [] },
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: false,
			});
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: { value: 20, unsnapshotedChanges: 3, timeSinceLastSnapshot: 5, criticalFilesTouched: [] },
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: false,
			});
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: {
						value: 85,
						unsnapshotedChanges: 25,
						timeSinceLastSnapshot: 50,
						criticalFilesTouched: [],
					},
					trajectory: "critical",
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});

			const stats = learner.getStats();

			expect(stats.riskProfile).toBe("balanced");
		});

		it("should handle zero observations gracefully", () => {
			const stats = learner.getStats();

			expect(stats.totalObservations).toBe(0);
			expect(stats.riskProfile).toBe("balanced"); // Default
			expect(stats.avgPressureAtSnapshot).toBe(0);
			expect(stats.avgOxygenAtSnapshot).toBe(0);
		});

		it("should calculate average pressure and oxygen at snapshot time", () => {
			// Record snapshots at different vitals levels
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: {
						value: 40,
						unsnapshotedChanges: 8,
						timeSinceLastSnapshot: 12,
						criticalFilesTouched: [],
					},
					oxygen: { value: 70, coveragePercentage: 70, staleSnapshots: 0 },
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: false,
			});
			learner.recordObservation({
				vitals: createMockVitals({
					pressure: {
						value: 60,
						unsnapshotedChanges: 12,
						timeSinceLastSnapshot: 18,
						criticalFilesTouched: [],
					},
					oxygen: { value: 60, coveragePercentage: 60, staleSnapshots: 1 },
				}),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});

			const stats = learner.getStats();

			expect(stats.avgPressureAtSnapshot).toBe(50); // (40 + 60) / 2
			expect(stats.avgOxygenAtSnapshot).toBe(65); // (70 + 60) / 2
		});
	});

	// =========================================================================
	// ERROR CASE: Unexpected failures
	// =========================================================================
	describe("error case - invalid inputs", () => {
		it("should handle observation with missing vitals gracefully", () => {
			// Even with partial vitals, should not throw
			const minimalVitals = createMockVitals();

			expect(() =>
				learner.recordObservation({
					vitals: minimalVitals,
					userCreatedSnapshot: true,
					vitalsRecommended: false,
				}),
			).not.toThrow();
		});

		it("should handle rapid successive observations without data loss", () => {
			// Record 100 observations rapidly
			for (let i = 0; i < 100; i++) {
				learner.recordObservation({
					vitals: createMockVitals({ timestamp: Date.now() + i }),
					userCreatedSnapshot: i % 2 === 0,
					vitalsRecommended: i % 3 === 0,
				});
			}

			const stats = learner.getStats();

			expect(stats.totalObservations).toBe(100);
		});

		it("should reset observations when reset() is called", () => {
			learner.recordObservation({
				vitals: createMockVitals(),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});

			learner.reset();
			const stats = learner.getStats();

			expect(stats.totalObservations).toBe(0);
		});
	});

	// =========================================================================
	// INTEGRATION: getObservations accessor
	// =========================================================================
	describe("observation history", () => {
		it("should return all recorded observations", () => {
			learner.recordObservation({
				vitals: createMockVitals(),
				userCreatedSnapshot: true,
				vitalsRecommended: false,
			});
			learner.recordObservation({
				vitals: createMockVitals(),
				userCreatedSnapshot: false,
				vitalsRecommended: true,
			});

			const observations = learner.getObservations();

			expect(observations).toHaveLength(2);
			expect(observations[0].userCreatedSnapshot).toBe(true);
			expect(observations[1].userCreatedSnapshot).toBe(false);
		});

		it("should return observations limited to maxHistory", () => {
			// Record more than maxHistory (default 100)
			for (let i = 0; i < 120; i++) {
				learner.recordObservation({
					vitals: createMockVitals({ timestamp: Date.now() + i }),
					userCreatedSnapshot: true,
					vitalsRecommended: false,
				});
			}

			const observations = learner.getObservations();

			// Should be bounded by maxHistory
			expect(observations.length).toBeLessThanOrEqual(100);
		});
	});
});
