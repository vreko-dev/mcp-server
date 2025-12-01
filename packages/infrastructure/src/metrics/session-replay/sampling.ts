/**
 * Smart Session Replay Sampling Configuration
 *
 * Dynamically adjusts session replay sampling rates based on user segments,
 * plan tiers, and behavioral signals to optimize for both insights and cost.
 */

import type { BrowserAnalyticsConfig } from "../core/types.js";

// ============================================================================
// SAMPLING STRATEGIES
// ============================================================================

export interface SamplingStrategy {
	/**
	 * Base sampling rate for regular sessions (0.0 to 1.0)
	 */
	baseRate: number;

	/**
	 * Sampling rate for sessions with errors (0.0 to 1.0)
	 */
	errorRate: number;

	/**
	 * Additional conditions for increased sampling
	 */
	conditions: SamplingCondition[];
}

export interface SamplingCondition {
	/**
	 * Function to evaluate if condition is met
	 */
	evaluator: (context: SamplingContext) => boolean;

	/**
	 * Multiplier to apply when condition is met (e.g., 2.0 = double sampling)
	 */
	multiplier: number;

	/**
	 * Description of the condition for debugging
	 */
	description: string;
}

export interface SamplingContext {
	/**
	 * User's plan tier
	 */
	plan?: "free" | "pro" | "team" | "enterprise";

	/**
	 * User ID (if authenticated)
	 */
	userId?: string;

	/**
	 * Whether user is in onboarding flow
	 */
	isOnboarding?: boolean;

	/**
	 * Whether user has experienced errors
	 */
	hasErrors?: boolean;

	/**
	 * User engagement score (0-100)
	 */
	engagementScore?: number;

	/**
	 * Custom segments
	 */
	segments?: string[];
}

// ============================================================================
// PRESET SAMPLING STRATEGIES
// ============================================================================

/**
 * Conservative sampling strategy for cost optimization
 * - Base: 10% of sessions
 * - Errors: 100% of sessions
 */
export const CONSERVATIVE_SAMPLING: SamplingStrategy = {
	baseRate: 0.1,
	errorRate: 1.0,
	conditions: [
		{
			evaluator: (ctx) => ctx.plan === "pro" || ctx.plan === "team" || ctx.plan === "enterprise",
			multiplier: 3.0,
			description: "Paid user plans",
		},
		{
			evaluator: (ctx) => ctx.isOnboarding === true,
			multiplier: 5.0,
			description: "Onboarding flow",
		},
		{
			evaluator: (ctx) => (ctx.engagementScore || 0) > 75,
			multiplier: 2.0,
			description: "Highly engaged users",
		},
	],
};

/**
 * Balanced sampling strategy for insights and cost
 * - Base: 30% of sessions
 * - Errors: 100% of sessions
 */
export const BALANCED_SAMPLING: SamplingStrategy = {
	baseRate: 0.3,
	errorRate: 1.0,
	conditions: [
		{
			evaluator: (ctx) => ctx.plan === "pro" || ctx.plan === "team" || ctx.plan === "enterprise",
			multiplier: 2.0,
			description: "Paid user plans",
		},
		{
			evaluator: (ctx) => ctx.isOnboarding === true,
			multiplier: 3.0,
			description: "Onboarding flow",
		},
		{
			evaluator: (ctx) => ctx.hasErrors === true,
			multiplier: 2.0,
			description: "Sessions with errors",
		},
	],
};

/**
 * Aggressive sampling strategy for maximum insights
 * - Base: 70% of sessions
 * - Errors: 100% of sessions
 */
export const AGGRESSIVE_SAMPLING: SamplingStrategy = {
	baseRate: 0.7,
	errorRate: 1.0,
	conditions: [
		{
			evaluator: (ctx) => ctx.plan !== "free",
			multiplier: 1.5,
			description: "Non-free users",
		},
		{
			evaluator: (ctx) => ctx.hasErrors === true,
			multiplier: 1.5,
			description: "Sessions with errors",
		},
	],
};

// ============================================================================
// SAMPLING CALCULATION
// ============================================================================

/**
 * Calculate the effective sampling rate based on context and strategy
 *
 * @param context - Current user/session context
 * @param strategy - Sampling strategy to apply
 * @returns Effective sampling rate (0.0 to 1.0)
 */
export function calculateSamplingRate(context: SamplingContext, strategy: SamplingStrategy): number {
	// Start with base rate
	let rate = context.hasErrors ? strategy.errorRate : strategy.baseRate;

	// Apply multipliers for matching conditions
	for (const condition of strategy.conditions) {
		if (condition.evaluator(context)) {
			rate *= condition.multiplier;
		}
	}

	// Clamp to valid range
	return Math.min(1.0, Math.max(0.0, rate));
}

/**
 * Get PostHog session recording configuration with smart sampling
 *
 * @param context - Current user/session context
 * @param strategy - Sampling strategy to apply
 * @returns BrowserAnalyticsConfig with session recording settings
 */
export function getSessionRecordingConfig(
	context: SamplingContext,
	strategy: SamplingStrategy = BALANCED_SAMPLING,
): Partial<BrowserAnalyticsConfig> {
	const _samplingRate = calculateSamplingRate(context, strategy);

	return {
		sessionRecording: {
			maskAllInputs: true,
			maskTextSelector: '[data-private="true"],[data-testid="sensitive"]',
			recordCanvas: false,
			inlineStylesheet: true,
		},
		// Set the sampling rate at the PostHog level
		// Note: This is configured in the init call, not as a separate property
	};
}

// ============================================================================
// BUDGET MONITORING
// ============================================================================

export interface BudgetConfig {
	/**
	 * Maximum monthly session recordings
	 */
	maxSessionsPerMonth: number;

	/**
	 * Current month's recorded sessions
	 */
	currentMonthSessions: number;

	/**
	 * Date when budget was last reset
	 */
	lastReset: Date;
}

/**
 * Check if we're approaching the session recording budget limit
 *
 * @param budget - Current budget configuration
 * @param threshold - Percentage threshold to trigger warning (0.0 to 1.0)
 * @returns Whether we're approaching the budget limit
 */
export function isApproachingBudgetLimit(budget: BudgetConfig, threshold = 0.8): boolean {
	return budget.currentMonthSessions / budget.maxSessionsPerMonth >= threshold;
}

/**
 * Adjust sampling strategy based on budget utilization
 *
 * @param budget - Current budget configuration
 * @param currentStrategy - Current sampling strategy
 * @returns Adjusted sampling strategy to reduce costs
 */
export function adjustStrategyForBudget(budget: BudgetConfig, currentStrategy: SamplingStrategy): SamplingStrategy {
	const utilization = budget.currentMonthSessions / budget.maxSessionsPerMonth;

	// If we're over 90% of budget, reduce sampling rates
	if (utilization > 0.9) {
		return {
			...currentStrategy,
			baseRate: currentStrategy.baseRate * 0.5, // Halve the base rate
			conditions: currentStrategy.conditions.map((condition) => ({
				...condition,
				multiplier: condition.multiplier * 0.7, // Reduce multipliers
			})),
		};
	}

	// If we're over 75% of budget, slightly reduce sampling rates
	if (utilization > 0.75) {
		return {
			...currentStrategy,
			baseRate: currentStrategy.baseRate * 0.7,
			conditions: currentStrategy.conditions.map((condition) => ({
				...condition,
				multiplier: condition.multiplier * 0.8,
			})),
		};
	}

	return currentStrategy;
}
