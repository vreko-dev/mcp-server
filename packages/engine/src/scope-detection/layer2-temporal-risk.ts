/**
 * Layer 2.4: Temporal Risk Calculation
 *
 * Calculates risk based on time patterns and snapshot recency.
 */

import type { TemporalContext, TemporalRiskResult } from "./types";

// =============================================================================
// RISKY TIME PATTERNS
// =============================================================================

/**
 * Hours of day with higher error rates (0-23)
 * Based on typical developer fatigue patterns
 */
const RISKY_HOURS = [0, 1, 2, 3, 4, 5, 22, 23]; // Late night/early morning

/**
 * Days of week with higher risk (0 = Sunday, 6 = Saturday)
 * Friday evenings and weekends tend to have hastier changes
 */
const RISKY_DAYS = [0, 5, 6]; // Sunday, Friday, Saturday

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate temporal risk score (0-100)
 */
export function calculateTemporalRisk(temporal: TemporalContext): TemporalRiskResult {
	const reasoning: string[] = [];

	// Factor 1: Time of day risk
	const hourRisk = calculateHourRisk(temporal.hourOfDay, reasoning);

	// Factor 2: Day of week risk
	const dayRisk = calculateDayRisk(temporal.dayOfWeek, reasoning);

	// Factor 3: Time since last snapshot
	const recencyRisk = calculateRecencyRisk(temporal.timeSinceLastSnapshot, reasoning);

	// Weighted combination
	const totalScore = Math.round(hourRisk * 0.3 + dayRisk * 0.2 + recencyRisk * 0.5);

	return {
		score: totalScore,
		reasoning,
	};
}

// =============================================================================
// TEMPORAL FACTORS
// =============================================================================

/**
 * Calculate risk based on hour of day
 */
function calculateHourRisk(hourOfDay: number, reasoning: string[]): number {
	// Working hours (9am-6pm) are lowest risk
	if (hourOfDay >= 9 && hourOfDay < 18) {
		return 20;
	}

	// Early morning (4am-9am) - moderate risk (rushed before work?)
	if (hourOfDay >= 4 && hourOfDay < 9) {
		reasoning.push("Early morning edit (fatigue risk)");
		return 50;
	}

	// Evening (6pm-10pm) - moderate risk (tired after work)
	if (hourOfDay >= 18 && hourOfDay < 22) {
		reasoning.push("Evening edit (end-of-day fatigue)");
		return 45;
	}

	// Late night/early morning (10pm-4am) - highest risk
	if (RISKY_HOURS.includes(hourOfDay)) {
		reasoning.push("Late night/early morning edit (high fatigue risk)");
		return 75;
	}

	return 30;
}

/**
 * Calculate risk based on day of week
 */
function calculateDayRisk(dayOfWeek: number, reasoning: string[]): number {
	// Weekdays (Mon-Thu) are lowest risk
	if (dayOfWeek >= 1 && dayOfWeek <= 4) {
		return 20;
	}

	// Friday - moderate risk (rushing before weekend)
	if (dayOfWeek === 5) {
		reasoning.push("Friday edit (potential rush before weekend)");
		return 50;
	}

	// Weekend - higher risk (less careful, no immediate review)
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		reasoning.push("Weekend edit (less review, potential experiments)");
		return 60;
	}

	return 30;
}

/**
 * Calculate risk based on time since last snapshot
 */
function calculateRecencyRisk(timeSinceLastMs: number, reasoning: string[]): number {
	const minutes = timeSinceLastMs / (1000 * 60);
	const hours = minutes / 60;

	// Very recent snapshot (< 5 min) - low risk
	if (minutes < 5) {
		return 10;
	}

	// Recent snapshot (5-30 min) - low risk
	if (minutes < 30) {
		return 20;
	}

	// Moderate time (30min - 2hr) - moderate risk
	if (hours < 2) {
		reasoning.push(`${Math.round(minutes)} minutes since last snapshot - building up risk`);
		return 40;
	}

	// Long time (2-4 hours) - high risk
	if (hours < 4) {
		reasoning.push(`${Math.round(hours)} hours since last snapshot - significant work accumulated`);
		return 70;
	}

	// Very long time (4+ hours) - critical risk
	reasoning.push(`${Math.round(hours)} hours since last snapshot - critical: lots of unprotected work`);
	return 90;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if current time is risky
 */
export function isRiskyTime(temporal: TemporalContext): boolean {
	return RISKY_HOURS.includes(temporal.hourOfDay) || RISKY_DAYS.includes(temporal.dayOfWeek);
}

/**
 * Get time-based recommendation
 */
export function getTemporalRecommendation(temporal: TemporalContext): string {
	const hourRisk = calculateHourRisk(temporal.hourOfDay, []);
	const recencyMinutes = temporal.timeSinceLastSnapshot / (1000 * 60);

	if (hourRisk > 60 && recencyMinutes > 60) {
		return "High risk: late hour + long time since snapshot. Consider snapshotting now.";
	}

	if (recencyMinutes > 120) {
		return "Long time since last snapshot. Consider creating checkpoint.";
	}

	if (hourRisk > 60) {
		return "Working at risky time. Extra caution recommended.";
	}

	return "Temporal risk is manageable.";
}

/**
 * Format time duration for reasoning
 */
export function formatDuration(milliseconds: number): string {
	const seconds = milliseconds / 1000;
	const minutes = seconds / 60;
	const hours = minutes / 60;
	const days = hours / 24;

	if (days >= 1) {
		return `${Math.round(days)} day${days >= 2 ? "s" : ""}`;
	}
	if (hours >= 1) {
		return `${Math.round(hours)} hour${hours >= 2 ? "s" : ""}`;
	}
	if (minutes >= 1) {
		return `${Math.round(minutes)} minute${minutes >= 2 ? "s" : ""}`;
	}
	return `${Math.round(seconds)} second${seconds >= 2 ? "s" : ""}`;
}
