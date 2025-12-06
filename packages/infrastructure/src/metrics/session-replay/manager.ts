/**
 * Session Replay Manager
 *
 * Manages session replay configuration with smart sampling based on user context,
 * plan tiers, and budget constraints.
 */

import type { BrowserAnalyticsConfig } from "../core/types";
import {
	adjustStrategyForBudget,
	BALANCED_SAMPLING,
	type BudgetConfig,
	getSessionRecordingConfig,
	isApproachingBudgetLimit,
	type SamplingContext,
	type SamplingStrategy,
} from "./sampling";

// ============================================================================
// SESSION REPLAY MANAGER
// ============================================================================

export class SessionReplayManager {
	private static instance: SessionReplayManager;
	private context: SamplingContext = {};
	private strategy: SamplingStrategy = BALANCED_SAMPLING;
	private budget: BudgetConfig = {
		maxSessionsPerMonth: 10000, // Default budget
		currentMonthSessions: 0,
		lastReset: new Date(),
	};

	private constructor() {
		// Reset budget at the start of each month
		this.setupBudgetReset();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): SessionReplayManager {
		if (!SessionReplayManager.instance) {
			SessionReplayManager.instance = new SessionReplayManager();
		}
		return SessionReplayManager.instance;
	}

	/**
	 * Update user context for sampling decisions
	 */
	public updateContext(context: Partial<SamplingContext>): void {
		this.context = { ...this.context, ...context };

		// Adjust strategy based on budget if needed
		if (isApproachingBudgetLimit(this.budget)) {
			this.strategy = adjustStrategyForBudget(this.budget, this.strategy);
		}
	}

	/**
	 * Update sampling strategy
	 */
	public updateStrategy(strategy: SamplingStrategy): void {
		this.strategy = strategy;
	}

	/**
	 * Update budget configuration
	 */
	public updateBudget(budget: Partial<BudgetConfig>): void {
		this.budget = { ...this.budget, ...budget };
	}

	/**
	 * Get the current analytics configuration with session replay settings
	 */
	public getAnalyticsConfig(): Partial<BrowserAnalyticsConfig> {
		return {
			autocapture: true,
			capturePageview: true,
			capturePageleave: true,
			...getSessionRecordingConfig(this.context, this.strategy),
		};
	}

	/**
	 * Record a session (increment budget counter)
	 */
	public recordSession(): void {
		this.budget.currentMonthSessions++;
	}

	/**
	 * Get current sampling rate for debugging
	 */
	public getSamplingRate(): number {
		// This is a simplified implementation - in reality, PostHog handles the actual sampling
		// This is just for monitoring and reporting purposes
		return this.strategy.baseRate;
	}

	/**
	 * Get current budget utilization
	 */
	public getBudgetUtilization(): number {
		return this.budget.currentMonthSessions / this.budget.maxSessionsPerMonth;
	}

	/**
	 * Reset budget at the start of each month
	 */
	private setupBudgetReset(): void {
		const scheduleNextReset = () => {
			const now = new Date();
			const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			const timeUntilReset = nextMonth.getTime() - now.getTime();
			setTimeout(() => {
				this.resetBudget();
				scheduleNextReset();
			}, timeUntilReset);
		};
		scheduleNextReset();
	}

	/**
	 * Reset budget counters
	 */
	private resetBudget(): void {
		this.budget.currentMonthSessions = 0;
		this.budget.lastReset = new Date();
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
	BudgetConfig,
	SamplingContext,
	SamplingStrategy,
} from "./sampling";
export {
	AGGRESSIVE_SAMPLING,
	BALANCED_SAMPLING,
	CONSERVATIVE_SAMPLING,
} from "./sampling";
