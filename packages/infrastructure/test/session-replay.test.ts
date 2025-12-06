/**
 * Session Replay Tests
 *
 * Tests for session replay sampling, configuration, and management.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { calculateEffectiveSamplingRate } from "../../../packages/config/src/analytics/session-replay";
import { SessionReplayManager } from "../src/metrics/session-replay/manager";
import {
	AGGRESSIVE_SAMPLING,
	BALANCED_SAMPLING,
	CONSERVATIVE_SAMPLING,
	calculateSamplingRate,
	type SamplingContext,
} from "../src/metrics/session-replay/sampling";

describe("Session Replay Sampling", () => {
	describe("Preset Strategies", () => {
		it("should have correct conservative sampling rates", () => {
			expect(CONSERVATIVE_SAMPLING.baseRate).toBe(0.1);
			expect(CONSERVATIVE_SAMPLING.errorRate).toBe(1.0);
			expect(CONSERVATIVE_SAMPLING.conditions.length).toBeGreaterThan(0);
		});

		it("should have correct balanced sampling rates", () => {
			expect(BALANCED_SAMPLING.baseRate).toBe(0.3);
			expect(BALANCED_SAMPLING.errorRate).toBe(1.0);
			expect(BALANCED_SAMPLING.conditions.length).toBeGreaterThan(0);
		});

		it("should have correct aggressive sampling rates", () => {
			expect(AGGRESSIVE_SAMPLING.baseRate).toBe(0.7);
			expect(AGGRESSIVE_SAMPLING.errorRate).toBe(1.0);
			expect(AGGRESSIVE_SAMPLING.conditions.length).toBeGreaterThan(0);
		});
	});

	describe("Sampling Rate Calculation", () => {
		const baseContext: SamplingContext = {
			plan: "free",
			userId: "user123",
			isOnboarding: false,
			hasErrors: false,
			engagementScore: 50,
		};

		it("should calculate base rate for regular sessions", () => {
			const rate = calculateSamplingRate(baseContext, BALANCED_SAMPLING);
			expect(rate).toBe(0.3);
		});

		it("should calculate error rate for sessions with errors", () => {
			const contextWithError: SamplingContext = {
				...baseContext,
				hasErrors: true,
			};
			const rate = calculateSamplingRate(contextWithError, BALANCED_SAMPLING);
			expect(rate).toBe(1.0);
		});

		it("should apply multipliers for paid plans", () => {
			const context: SamplingContext = {
				...baseContext,
				plan: "pro",
			};
			const rate = calculateSamplingRate(context, BALANCED_SAMPLING);
			// Base rate 0.3 * multiplier 2.0 = 0.6
			expect(rate).toBeCloseTo(0.6);
		});

		it("should apply multipliers for onboarding users", () => {
			const context: SamplingContext = {
				...baseContext,
				isOnboarding: true,
			};
			const rate = calculateSamplingRate(context, BALANCED_SAMPLING);
			// Base rate 0.3 * multiplier 3.0 = 0.9
			expect(rate).toBeCloseTo(0.9);
		});

		it("should clamp rates to valid range", () => {
			const context: SamplingContext = {
				...baseContext,
				plan: "enterprise",
				isOnboarding: true,
				engagementScore: 90,
			};
			// This would result in a rate > 1.0, should be clamped to 1.0
			const rate = calculateSamplingRate(context, AGGRESSIVE_SAMPLING);
			expect(rate).toBe(1.0);
		});
	});
});

describe("Session Replay Manager", () => {
	let manager: SessionReplayManager;

	beforeEach(() => {
		// Reset singleton instance
		// @ts-expect-error - accessing private property for testing
		SessionReplayManager.instance = undefined;
		manager = SessionReplayManager.getInstance();
	});

	it("should be a singleton", () => {
		const manager2 = SessionReplayManager.getInstance();
		expect(manager).toBe(manager2);
	});

	it("should update context correctly", () => {
		manager.updateContext({
			plan: "pro",
			userId: "user456",
		});

		// We can't directly test the private context, but we can test the effects
		const config = manager.getAnalyticsConfig();
		expect(config.autocapture).toBe(true);
	});

	it("should calculate sampling rate", () => {
		const rate = manager.getSamplingRate();
		// Should match the default BALANCED_SAMPLING base rate
		expect(rate).toBe(0.3);
	});

	it("should track budget utilization", () => {
		const utilization = manager.getBudgetUtilization();
		expect(utilization).toBe(0);
	});

	it("should record sessions", () => {
		manager.recordSession();
		const utilization = manager.getBudgetUtilization();
		expect(utilization).toBeGreaterThan(0);
	});
});

describe("Configuration Helpers", () => {
	it("should calculate effective sampling rate", () => {
		const rate = calculateEffectiveSamplingRate("production", "pro", false, 80);
		// Base rate (0.3) * plan multiplier (2.0) * engagement multiplier (2.0) = 1.2
		// But should be clamped to 1.0
		expect(rate).toBe(1.0);
	});

	it("should handle edge cases", () => {
		const rate = calculateEffectiveSamplingRate("development", "free", true, 95);
		// Base rate (1.0) * onboarding multiplier (5.0) * engagement multiplier (3.0) = 15.0
		// But should be clamped to 1.0
		expect(rate).toBe(1.0);
	});
});
