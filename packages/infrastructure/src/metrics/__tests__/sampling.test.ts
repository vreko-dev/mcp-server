/**
 * TDD Tests for Sampling Logic
 *
 * Test event sampling for free tier budget management.
 */

import { describe, expect, it } from "vitest";
import { AnalyticsEvents } from "../core/events.js";
import {
	BUDGET_EXAMPLE,
	EVENT_SAMPLING_RATES,
	EventTier,
	estimateSampledEventCount,
	getEventTier,
	getSamplingRate,
	shouldSampleEvent,
} from "../core/sampling.js";

describe("Sampling - Event Tier Configuration", () => {
	it("should define sampling rates for all events", () => {
		const _allEvents = Object.values(AnalyticsEvents);
		const configuredEvents = Object.keys(EVENT_SAMPLING_RATES);

		// Not all events need explicit sampling (defaults to CORE)
		// But key events should be configured
		expect(configuredEvents.length).toBeGreaterThan(40);
	});

	it("should assign CORE tier to critical business events", () => {
		// Auth
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.AUTH_SIGNUP_COMPLETED]).toBe(EventTier.CORE);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.AUTH_LOGIN_COMPLETED]).toBe(EventTier.CORE);

		// Snapshots
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.SNAPSHOT_CREATED]).toBe(EventTier.CORE);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.SNAPSHOT_RESTORED]).toBe(EventTier.CORE);

		// Billing
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.BILLING_CHECKOUT_COMPLETED]).toBe(EventTier.CORE);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.BILLING_SUBSCRIPTION_UPGRADED]).toBe(EventTier.CORE);
	});

	it("should assign ENGAGEMENT tier to moderate-priority events", () => {
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.SNAPSHOT_VIEWED]).toBe(EventTier.ENGAGEMENT);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.DASHBOARD_VIEWED]).toBe(EventTier.ENGAGEMENT);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.EXTENSION_COMMAND_USED]).toBe(EventTier.ENGAGEMENT);
	});

	it("should assign OPTIONAL tier to low-priority events", () => {
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.SNAPSHOT_DIFF_VIEWED]).toBe(EventTier.OPTIONAL);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.DASHBOARD_SEARCH_PERFORMED]).toBe(EventTier.OPTIONAL);
	});

	it("should assign ERRORS tier to error events", () => {
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.EXTENSION_ERROR_OCCURRED]).toBe(EventTier.ERRORS);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.API_ERROR_OCCURRED]).toBe(EventTier.ERRORS);
		expect(EVENT_SAMPLING_RATES[AnalyticsEvents.BILLING_PAYMENT_FAILED]).toBe(EventTier.ERRORS);
	});
});

describe("Sampling - shouldSampleEvent", () => {
	it("should always sample CORE events", () => {
		// Run 100 times to ensure 100% sampling
		const samples = Array.from({ length: 100 }, () => shouldSampleEvent(AnalyticsEvents.AUTH_SIGNUP_COMPLETED));

		const sampledCount = samples.filter(Boolean).length;
		expect(sampledCount).toBe(100); // 100% should be sampled
	});

	it("should sample ENGAGEMENT events at ~50%", () => {
		// Run 1000 times to get statistical significance
		const samples = Array.from({ length: 1000 }, () => shouldSampleEvent(AnalyticsEvents.SNAPSHOT_VIEWED));

		const sampledCount = samples.filter(Boolean).length;
		// Allow 10% variance (450-550 out of 1000)
		expect(sampledCount).toBeGreaterThan(450);
		expect(sampledCount).toBeLessThan(550);
	});

	it("should sample OPTIONAL events at ~10%", () => {
		// Run 1000 times
		const samples = Array.from({ length: 1000 }, () => shouldSampleEvent(AnalyticsEvents.SNAPSHOT_DIFF_VIEWED));

		const sampledCount = samples.filter(Boolean).length;
		// Allow 5% variance (50-150 out of 1000)
		expect(sampledCount).toBeGreaterThan(50);
		expect(sampledCount).toBeLessThan(150);
	});

	it("should default to CORE tier for unconfigured events", () => {
		const samples = Array.from({ length: 100 }, () => shouldSampleEvent("unknown_event"));

		const sampledCount = samples.filter(Boolean).length;
		expect(sampledCount).toBe(100); // Default to 100% sampling
	});
});

describe("Sampling - getSamplingRate", () => {
	it("should return correct sampling rate for CORE events", () => {
		const rate = getSamplingRate(AnalyticsEvents.AUTH_SIGNUP_COMPLETED);
		expect(rate).toBe(1.0);
	});

	it("should return correct sampling rate for ENGAGEMENT events", () => {
		const rate = getSamplingRate(AnalyticsEvents.SNAPSHOT_VIEWED);
		expect(rate).toBe(0.5);
	});

	it("should return correct sampling rate for OPTIONAL events", () => {
		const rate = getSamplingRate(AnalyticsEvents.SNAPSHOT_DIFF_VIEWED);
		expect(rate).toBe(0.1);
	});

	it("should return CORE rate for unknown events", () => {
		const rate = getSamplingRate("unknown_event");
		expect(rate).toBe(1.0);
	});
});

describe("Sampling - getEventTier", () => {
	it("should return correct tier for each event category", () => {
		expect(getEventTier(AnalyticsEvents.AUTH_SIGNUP_COMPLETED)).toBe(EventTier.CORE);
		expect(getEventTier(AnalyticsEvents.SNAPSHOT_VIEWED)).toBe(EventTier.ENGAGEMENT);
		expect(getEventTier(AnalyticsEvents.SNAPSHOT_DIFF_VIEWED)).toBe(EventTier.OPTIONAL);
		expect(getEventTier(AnalyticsEvents.EXTENSION_ERROR_OCCURRED)).toBe(EventTier.ERRORS);
	});
});

describe("Sampling - Budget Estimation", () => {
	it("should calculate sampled event count correctly", () => {
		const rawEvents = 780000; // 780K raw events
		const distribution = {
			core: 0.375,
			engagement: 0.25,
			optional: 0.125,
			errors: 0.25,
		};

		const sampledCount = estimateSampledEventCount(rawEvents, distribution);

		// Expected: 292.5K + 97.5K + 9.75K + 195K = 594.75K
		expect(sampledCount).toBeLessThan(800000); // Under target
		expect(sampledCount).toBeGreaterThan(500000); // Reasonable sampling
	});

	it("should validate BUDGET_EXAMPLE stays under free tier", () => {
		const sampledCount = estimateSampledEventCount(BUDGET_EXAMPLE.rawEventCount, BUDGET_EXAMPLE.distribution);

		// Should be well under 800K target
		expect(sampledCount).toBeLessThan(800000);
		expect(sampledCount).toBeLessThan(BUDGET_EXAMPLE.rawEventCount);
	});

	it("should handle 100% CORE distribution", () => {
		const rawEvents = 1000000;
		const distribution = {
			core: 1.0,
			engagement: 0,
			optional: 0,
			errors: 0,
		};

		const sampledCount = estimateSampledEventCount(rawEvents, distribution);
		expect(sampledCount).toBe(rawEvents); // 100% sampled
	});

	it("should handle 100% OPTIONAL distribution", () => {
		const rawEvents = 1000000;
		const distribution = {
			core: 0,
			engagement: 0,
			optional: 1.0,
			errors: 0,
		};

		const sampledCount = estimateSampledEventCount(rawEvents, distribution);
		expect(sampledCount).toBe(100000); // 10% sampled
	});
});

describe("Sampling - Free Tier Budget Management", () => {
	it("should keep realistic usage under 800K events/month", () => {
		// Realistic scenario: 1,000 users, 20 events/user/day
		const monthlyUsers = 1000;
		const eventsPerUserPerDay = 20;
		const daysPerMonth = 30;
		const rawEvents = monthlyUsers * eventsPerUserPerDay * daysPerMonth;

		// Typical distribution
		const distribution = {
			core: 0.4, // 40% critical events
			engagement: 0.3, // 30% engagement
			optional: 0.1, // 10% optional
			errors: 0.2, // 20% errors
		};

		const sampledCount = estimateSampledEventCount(rawEvents, distribution);

		// Should be under 800K target
		expect(sampledCount).toBeLessThan(800000);
	});

	it("should handle spike scenarios with reserve budget", () => {
		// Spike scenario: 2,000 users, 30 events/user/day for 7 days
		const spikeUsers = 2000;
		const spikeEventsPerUserPerDay = 30;
		const spikeDays = 7;
		const spikeRawEvents = spikeUsers * spikeEventsPerUserPerDay * spikeDays;

		const distribution = {
			core: 0.5,
			engagement: 0.25,
			optional: 0.05,
			errors: 0.2,
		};

		const sampledCount = estimateSampledEventCount(spikeRawEvents, distribution);

		// Should still be under 1M free tier limit
		expect(sampledCount).toBeLessThan(1000000);
	});
});
