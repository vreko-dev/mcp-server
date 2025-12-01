/**
 * Tests for centralized Thresholds configuration
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createThresholds,
	DEFAULT_THRESHOLDS,
	resetThresholds,
	THRESHOLDS,
	type ThresholdsConfig,
	updateThresholds,
} from "../src/config/Thresholds.js";

describe("Thresholds Configuration", () => {
	beforeEach(() => {
		resetThresholds();
	});

	afterEach(() => {
		resetThresholds();
	});

	describe("Default Thresholds", () => {
		it("should export DEFAULT_THRESHOLDS constant", () => {
			expect(DEFAULT_THRESHOLDS).toBeDefined();
			expect(DEFAULT_THRESHOLDS.session).toBeDefined();
			expect(DEFAULT_THRESHOLDS.burst).toBeDefined();
			expect(DEFAULT_THRESHOLDS.experience).toBeDefined();
			expect(DEFAULT_THRESHOLDS.tagging).toBeDefined();
			expect(DEFAULT_THRESHOLDS.risk).toBeDefined();
			expect(DEFAULT_THRESHOLDS.securityScores).toBeDefined();
			expect(DEFAULT_THRESHOLDS.detection).toBeDefined();
			expect(DEFAULT_THRESHOLDS.protection).toBeDefined();
			expect(DEFAULT_THRESHOLDS.resources).toBeDefined();
			expect(DEFAULT_THRESHOLDS.qos).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs).toBeDefined();
		});

		it("should have correct session thresholds", () => {
			expect(DEFAULT_THRESHOLDS.session.idleTimeout).toBe(105_000);
			expect(DEFAULT_THRESHOLDS.session.minSessionDuration).toBe(5_000);
			expect(DEFAULT_THRESHOLDS.session.maxSessionDuration).toBe(3_600_000);
		});

		it("should have correct burst detection thresholds", () => {
			expect(DEFAULT_THRESHOLDS.burst.timeWindow).toBe(5000);
			expect(DEFAULT_THRESHOLDS.burst.minCharsInserted).toBe(100);
			expect(DEFAULT_THRESHOLDS.burst.maxKeystrokeInterval).toBe(200);
			expect(DEFAULT_THRESHOLDS.burst.minLinesAffected).toBe(3);
			expect(DEFAULT_THRESHOLDS.burst.minInsertDeleteRatio).toBe(3);
		});

		it("should have correct risk thresholds", () => {
			expect(DEFAULT_THRESHOLDS.risk.blockingThreshold).toBe(8.0);
			expect(DEFAULT_THRESHOLDS.risk.criticalThreshold).toBe(7.0);
			expect(DEFAULT_THRESHOLDS.risk.highThreshold).toBe(5.0);
			expect(DEFAULT_THRESHOLDS.risk.mediumThreshold).toBe(3.0);
		});

		it("should have correct security pattern scores", () => {
			expect(DEFAULT_THRESHOLDS.securityScores.evalUsage).toBe(4.0);
			expect(DEFAULT_THRESHOLDS.securityScores.functionConstructor).toBe(4.0);
			expect(DEFAULT_THRESHOLDS.securityScores.dangerousHtml).toBe(3.0);
			expect(DEFAULT_THRESHOLDS.securityScores.execCommand).toBe(5.0);
			expect(DEFAULT_THRESHOLDS.securityScores.sqlConcat).toBe(6.0);
			expect(DEFAULT_THRESHOLDS.securityScores.hardcodedSecrets).toBe(4.0);
			expect(DEFAULT_THRESHOLDS.securityScores.weakCrypto).toBe(3.0);
		});

		it("should have correct detection thresholds", () => {
			expect(DEFAULT_THRESHOLDS.detection.entropyThreshold).toBe(2.5);
			expect(DEFAULT_THRESHOLDS.detection.typosquattingDistance).toBe(3);
		});

		it("should have correct protection thresholds", () => {
			expect(DEFAULT_THRESHOLDS.protection.protectedCooldown).toBe(600_000);
			expect(DEFAULT_THRESHOLDS.protection.otherCooldown).toBe(300_000);
			expect(DEFAULT_THRESHOLDS.protection.debounceWindow).toBe(5_000);
		});

		it("should have correct resource thresholds", () => {
			expect(DEFAULT_THRESHOLDS.resources.dedupCacheSize).toBe(500);
			expect(DEFAULT_THRESHOLDS.resources.checkpointMaxFiles).toBe(10_000);
			expect(DEFAULT_THRESHOLDS.resources.checkpointMaxFileSize).toBe(10 * 1024 * 1024);
			expect(DEFAULT_THRESHOLDS.resources.checkpointMaxTotalSize).toBe(500 * 1024 * 1024);
			expect(DEFAULT_THRESHOLDS.resources.diffHaloSize).toBe(3);
			expect(DEFAULT_THRESHOLDS.resources.trialSnapshotLimit).toBe(50);
			expect(DEFAULT_THRESHOLDS.resources.freeMonthlyLimit).toBe(100);
		});

		it("should have correct QoS thresholds", () => {
			expect(DEFAULT_THRESHOLDS.qos.rateLimitCapacity).toBe(100);
			expect(DEFAULT_THRESHOLDS.qos.rateLimitRefill).toBe(60_000);
			expect(DEFAULT_THRESHOLDS.qos.eventBusTimeout).toBe(5_000);
			expect(DEFAULT_THRESHOLDS.qos.eventBusMaxRetries).toBe(3);
			expect(DEFAULT_THRESHOLDS.qos.errorBudgetHard).toBe(0.01);
			expect(DEFAULT_THRESHOLDS.qos.errorBudgetWarn).toBe(0.005);
		});
	});

	describe("Global THRESHOLDS Instance", () => {
		it("should export mutable THRESHOLDS instance", () => {
			expect(THRESHOLDS).toBeDefined();
			expect(THRESHOLDS).toEqual(DEFAULT_THRESHOLDS);
		});

		it("should have same values as DEFAULT_THRESHOLDS initially", () => {
			expect(THRESHOLDS.session).toEqual(DEFAULT_THRESHOLDS.session);
			expect(THRESHOLDS.burst).toEqual(DEFAULT_THRESHOLDS.burst);
			expect(THRESHOLDS.risk).toEqual(DEFAULT_THRESHOLDS.risk);
		});
	});

	describe("createThresholds()", () => {
		it("should create new thresholds instance with defaults", () => {
			const thresholds = createThresholds();

			expect(thresholds).toEqual(DEFAULT_THRESHOLDS);
			expect(thresholds).not.toBe(DEFAULT_THRESHOLDS); // Different object reference
		});

		it("should create thresholds with partial overrides", () => {
			const thresholds = createThresholds({
				risk: {
					blockingThreshold: 6.0,
					criticalThreshold: 5.0,
					highThreshold: 4.0,
					mediumThreshold: 2.0,
				},
			});

			expect(thresholds.risk.blockingThreshold).toBe(6.0);
			expect(thresholds.risk.criticalThreshold).toBe(5.0);
			expect(thresholds.risk.highThreshold).toBe(4.0);
			expect(thresholds.risk.mediumThreshold).toBe(2.0);

			// Other categories should remain at defaults
			expect(thresholds.session).toEqual(DEFAULT_THRESHOLDS.session);
			expect(thresholds.burst).toEqual(DEFAULT_THRESHOLDS.burst);
		});

		it("should allow overriding multiple categories", () => {
			const thresholds = createThresholds({
				session: {
					idleTimeout: 60_000,
					minSessionDuration: 3_000,
					maxSessionDuration: 7_200_000,
				},
				detection: {
					entropyThreshold: 3.0,
					typosquattingDistance: 2,
				},
			});

			expect(thresholds.session.idleTimeout).toBe(60_000);
			expect(thresholds.detection.entropyThreshold).toBe(3.0);

			// Unchanged categories remain at defaults
			expect(thresholds.burst).toEqual(DEFAULT_THRESHOLDS.burst);
		});

		it("should allow partial overrides within a category", () => {
			const thresholds = createThresholds({
				risk: {
					blockingThreshold: 9.0,
					// Other thresholds should remain at defaults
					criticalThreshold: DEFAULT_THRESHOLDS.risk.criticalThreshold,
					highThreshold: DEFAULT_THRESHOLDS.risk.highThreshold,
					mediumThreshold: DEFAULT_THRESHOLDS.risk.mediumThreshold,
				},
			});

			expect(thresholds.risk.blockingThreshold).toBe(9.0);
			expect(thresholds.risk.criticalThreshold).toBe(DEFAULT_THRESHOLDS.risk.criticalThreshold);
		});

		it("should not mutate DEFAULT_THRESHOLDS", () => {
			const originalDefaults = { ...DEFAULT_THRESHOLDS };

			createThresholds({
				risk: {
					blockingThreshold: 5.0,
					criticalThreshold: 4.0,
					highThreshold: 3.0,
					mediumThreshold: 2.0,
				},
			});

			expect(DEFAULT_THRESHOLDS).toEqual(originalDefaults);
		});
	});

	describe("updateThresholds()", () => {
		it("should update global THRESHOLDS instance", () => {
			updateThresholds({
				risk: {
					blockingThreshold: 7.0,
					criticalThreshold: 6.0,
					highThreshold: 4.0,
					mediumThreshold: 2.0,
				},
			});

			expect(THRESHOLDS.risk.blockingThreshold).toBe(7.0);
			expect(THRESHOLDS.risk.criticalThreshold).toBe(6.0);
		});

		it("should preserve other categories when updating one", () => {
			const originalSession = { ...THRESHOLDS.session };

			updateThresholds({
				detection: {
					entropyThreshold: 3.5,
					typosquattingDistance: 4,
				},
			});

			expect(THRESHOLDS.detection.entropyThreshold).toBe(3.5);
			expect(THRESHOLDS.session).toEqual(originalSession);
		});

		it("should allow multiple updates", () => {
			updateThresholds({
				risk: {
					blockingThreshold: 6.0,
					criticalThreshold: 5.0,
					highThreshold: 4.0,
					mediumThreshold: 2.0,
				},
			});

			expect(THRESHOLDS.risk.blockingThreshold).toBe(6.0);

			updateThresholds({
				risk: {
					blockingThreshold: 7.0,
					criticalThreshold: 6.0,
					highThreshold: 5.0,
					mediumThreshold: 3.0,
				},
			});

			expect(THRESHOLDS.risk.blockingThreshold).toBe(7.0);
		});
	});

	describe("resetThresholds()", () => {
		it("should reset THRESHOLDS to defaults", () => {
			// Modify global thresholds
			updateThresholds({
				risk: {
					blockingThreshold: 5.0,
					criticalThreshold: 4.0,
					highThreshold: 3.0,
					mediumThreshold: 1.0,
				},
			});

			expect(THRESHOLDS.risk.blockingThreshold).toBe(5.0);

			// Reset
			resetThresholds();

			expect(THRESHOLDS).toEqual(DEFAULT_THRESHOLDS);
			expect(THRESHOLDS.risk.blockingThreshold).toBe(8.0);
		});

		it("should reset all categories", () => {
			updateThresholds({
				session: {
					idleTimeout: 30_000,
					minSessionDuration: 1_000,
					maxSessionDuration: 1_800_000,
				},
				detection: {
					entropyThreshold: 4.0,
					typosquattingDistance: 5,
				},
			});

			resetThresholds();

			expect(THRESHOLDS.session).toEqual(DEFAULT_THRESHOLDS.session);
			expect(THRESHOLDS.detection).toEqual(DEFAULT_THRESHOLDS.detection);
		});
	});

	describe("Threshold Relationships", () => {
		it("risk thresholds should be in correct order", () => {
			expect(DEFAULT_THRESHOLDS.risk.blockingThreshold).toBeGreaterThan(
				DEFAULT_THRESHOLDS.risk.criticalThreshold,
			);
			expect(DEFAULT_THRESHOLDS.risk.criticalThreshold).toBeGreaterThanOrEqual(
				DEFAULT_THRESHOLDS.risk.highThreshold,
			);
			expect(DEFAULT_THRESHOLDS.risk.highThreshold).toBeGreaterThan(DEFAULT_THRESHOLDS.risk.mediumThreshold);
		});

		it("session duration thresholds should be ordered", () => {
			expect(DEFAULT_THRESHOLDS.session.minSessionDuration).toBeLessThan(DEFAULT_THRESHOLDS.session.idleTimeout);
			expect(DEFAULT_THRESHOLDS.session.idleTimeout).toBeLessThan(DEFAULT_THRESHOLDS.session.maxSessionDuration);
		});

		it("experience tiers should be progressive", () => {
			expect(DEFAULT_THRESHOLDS.experience.explorer.snapshotsCreated).toBeLessThan(
				DEFAULT_THRESHOLDS.experience.intermediate.snapshotsCreated,
			);
			expect(DEFAULT_THRESHOLDS.experience.intermediate.snapshotsCreated).toBeLessThan(
				DEFAULT_THRESHOLDS.experience.power.snapshotsCreated,
			);
		});

		it("protection cooldowns should be reasonable", () => {
			expect(DEFAULT_THRESHOLDS.protection.debounceWindow).toBeLessThan(
				DEFAULT_THRESHOLDS.protection.otherCooldown,
			);
			expect(DEFAULT_THRESHOLDS.protection.otherCooldown).toBeLessThan(
				DEFAULT_THRESHOLDS.protection.protectedCooldown,
			);
		});

		it("resource limits should be reasonable", () => {
			expect(DEFAULT_THRESHOLDS.resources.checkpointMaxFileSize).toBeLessThan(
				DEFAULT_THRESHOLDS.resources.checkpointMaxTotalSize,
			);
			expect(DEFAULT_THRESHOLDS.resources.trialSnapshotLimit).toBeLessThan(
				DEFAULT_THRESHOLDS.resources.freeMonthlyLimit,
			);
		});

		it("QoS error budget thresholds should be ordered", () => {
			expect(DEFAULT_THRESHOLDS.qos.errorBudgetWarn).toBeLessThan(DEFAULT_THRESHOLDS.qos.errorBudgetHard);
		});
	});

	describe("Security Pattern Scores", () => {
		it("all scores should be between 0 and 10", () => {
			const scores = Object.values(DEFAULT_THRESHOLDS.securityScores);

			for (const score of scores) {
				expect(score).toBeGreaterThanOrEqual(0);
				expect(score).toBeLessThanOrEqual(10);
			}
		});

		it("critical patterns should have higher scores", () => {
			// exec and SQL injection should have higher scores than weak crypto
			expect(DEFAULT_THRESHOLDS.securityScores.execCommand).toBeGreaterThan(
				DEFAULT_THRESHOLDS.securityScores.weakCrypto,
			);
			expect(DEFAULT_THRESHOLDS.securityScores.sqlConcat).toBeGreaterThan(
				DEFAULT_THRESHOLDS.securityScores.dangerousHtml,
			);
		});
	});

	describe("Documentation", () => {
		it("should have documentation for all threshold categories", () => {
			expect(DEFAULT_THRESHOLDS.docs.session).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.burst).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.experience).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.tagging).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.risk).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.detection).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.protection).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.resources).toBeDefined();
			expect(DEFAULT_THRESHOLDS.docs.qos).toBeDefined();
		});

		it("all documentation strings should be non-empty", () => {
			const docSections = Object.values(DEFAULT_THRESHOLDS.docs);

			for (const section of docSections) {
				if (typeof section === "string") {
					expect(section.length).toBeGreaterThan(0);
				} else {
					const docStrings = Object.values(section as Record<string, string>);
					for (const doc of docStrings) {
						expect(doc.length).toBeGreaterThan(0);
					}
				}
			}
		});
	});

	describe("Immutability", () => {
		it("DEFAULT_THRESHOLDS should be readonly", () => {
			// TypeScript prevents this at compile time, but we can't modify frozen objects at runtime
			expect(Object.isFrozen(DEFAULT_THRESHOLDS.session)).toBe(true);
			expect(Object.isFrozen(DEFAULT_THRESHOLDS.risk)).toBe(true);
		});

		it("nested objects should also be frozen", () => {
			expect(Object.isFrozen(DEFAULT_THRESHOLDS.tagging.normalization)).toBe(true);
			expect(Object.isFrozen(DEFAULT_THRESHOLDS.experience.explorer)).toBe(true);
		});
	});

	describe("Type Safety", () => {
		it("should accept valid ThresholdsConfig", () => {
			const config: ThresholdsConfig = createThresholds();
			expect(config).toBeDefined();
		});

		it("should enforce correct structure", () => {
			// This would fail at compile time if structure is wrong
			const config = createThresholds({
				risk: {
					blockingThreshold: 8.0,
					criticalThreshold: 7.0,
					highThreshold: 5.0,
					mediumThreshold: 3.0,
				},
			});

			expect(config.risk).toHaveProperty("blockingThreshold");
			expect(config.risk).toHaveProperty("criticalThreshold");
			expect(config.risk).toHaveProperty("highThreshold");
			expect(config.risk).toHaveProperty("mediumThreshold");
		});
	});
});
