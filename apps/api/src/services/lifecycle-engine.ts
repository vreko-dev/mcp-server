import { logger } from "@snapback/infrastructure";
import { type UserLifecycleState, userLifecycleState } from "@snapback/platform/db/schema/snapback";
import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Lifecycle stage type extracted from the enum
 */
export type LifecycleStage = "new" | "engaged" | "power_user" | "at_risk" | "churned";

/**
 * Transition reason codes for audit trail
 */
export enum TransitionReason {
	InitialSignup = "initial_signup",
	FirstSnapshot = "first_snapshot",
	SevenDayActive = "seven_day_active",
	FiftySnapshots = "fifty_snapshots",
	InactiveThreeDays = "inactive_three_days",
	InactiveThirtyDays = "inactive_thirty_days",
	ManualOverride = "manual_override",
}

/**
 * LifecycleEngine
 * Manages user lifecycle state transitions and event emission
 * Stages: new → engaged → power_user, with at_risk and churned paths
 */
export class LifecycleEngine {
	constructor(private db: PgDatabase) {}

	/**
	 * Initialize lifecycle state for new user (stage: "new")
	 */
	async initializeUserLifecycle(userId: string): Promise<UserLifecycleState> {
		try {
			const result = await this.db
				.insert(userLifecycleState)
				.values({
					userId,
					stage: "new",
					stagedAt: new Date(),
					transitionReason: TransitionReason.InitialSignup,
					snapshotsSinceStart: "0",
					daysSinceLastActivity: "0",
				})
				.returning();

			logger.info("User lifecycle initialized", { userId, stage: "new" });
			return result[0];
		} catch (error) {
			logger.error("Failed to initialize user lifecycle", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get current lifecycle state for a user
	 */
	async getUserLifecycleState(userId: string): Promise<UserLifecycleState | null> {
		try {
			const result = await this.db
				.select()
				.from(userLifecycleState)
				.where(eq(userLifecycleState.userId, userId))
				.limit(1);

			return result[0] || null;
		} catch (error) {
			logger.error("Failed to get user lifecycle state", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Transition user to "engaged" stage
	 * Trigger: first snapshot created
	 */
	async transitionToEngaged(userId: string): Promise<UserLifecycleState | null> {
		return this.transitionStage(userId, "engaged", TransitionReason.FirstSnapshot);
	}

	/**
	 * Transition user to "power_user" stage
	 * Triggers: 50+ snapshots AND 7+ days active
	 */
	async transitionToPowerUser(userId: string): Promise<UserLifecycleState | null> {
		return this.transitionStage(userId, "power_user", TransitionReason.FiftySnapshots);
	}

	/**
	 * Transition user to "at_risk" stage
	 * Trigger: 3+ days of inactivity
	 */
	async transitionToAtRisk(userId: string): Promise<UserLifecycleState | null> {
		return this.transitionStage(userId, "at_risk", TransitionReason.InactiveThreeDays);
	}

	/**
	 * Transition user to "churned" stage
	 * Trigger: 30+ days of inactivity
	 */
	async transitionToChurned(userId: string): Promise<UserLifecycleState | null> {
		return this.transitionStage(userId, "churned", TransitionReason.InactiveThirtyDays);
	}

	/**
	 * Validate if a transition is allowed based on current state
	 */
	isValidTransition(currentStage: LifecycleStage, nextStage: LifecycleStage): boolean {
		const validTransitions: Record<LifecycleStage, LifecycleStage[]> = {
			new: ["engaged"],
			engaged: ["power_user", "at_risk"],
			power_user: ["at_risk"],
			at_risk: ["churned", "engaged"],
			churned: ["engaged"],
		};

		return validTransitions[currentStage]?.includes(nextStage) || false;
	}

	/**
	 * Core transition method with validation
	 */
	private async transitionStage(
		userId: string,
		nextStage: LifecycleStage,
		reason: TransitionReason,
	): Promise<UserLifecycleState | null> {
		try {
			const currentState = await this.getUserLifecycleState(userId);
			if (!currentState) {
				logger.warn("User lifecycle state not found for transition", { userId });
				return null;
			}

			const currentStage = currentState.stage as LifecycleStage;

			// Validate transition
			if (!this.isValidTransition(currentStage, nextStage)) {
				logger.warn("Invalid lifecycle transition attempted", {
					userId,
					from: currentStage,
					to: nextStage,
				});
				return null;
			}

			// Perform transition
			const result = await this.db
				.update(userLifecycleState)
				.set({
					stage: nextStage,
					stagedAt: new Date(),
					transitionReason: reason,
					updatedAt: new Date(),
				})
				.where(eq(userLifecycleState.userId, userId))
				.returning();

			logger.info("User lifecycle transitioned", {
				userId,
				from: currentStage,
				to: nextStage,
				reason,
			});

			return result[0] || null;
		} catch (error) {
			logger.error("Failed to transition lifecycle stage", {
				userId,
				nextStage,
				reason,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get all users in a specific lifecycle stage (for segmentation/cohorts)
	 */
	async getUsersByStage(stage: LifecycleStage): Promise<UserLifecycleState[]> {
		try {
			const result = await this.db.select().from(userLifecycleState).where(eq(userLifecycleState.stage, stage));

			return result;
		} catch (error) {
			logger.error("Failed to get users by stage", {
				stage,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Check if user should transition based on activity metrics
	 * Returns the recommended next stage (if any)
	 */
	async evaluateTransitionEligibility(
		userId: string,
		snapshotCount: number,
		daysSinceLastActivity: number,
	): Promise<LifecycleStage | null> {
		try {
			const currentState = await this.getUserLifecycleState(userId);
			if (!currentState) {
				return null;
			}

			const currentStage = currentState.stage as LifecycleStage;

			// Transition rules
			if (currentStage === "new" && snapshotCount > 0) {
				return "engaged";
			}

			if (currentStage === "engaged" && snapshotCount >= 50) {
				return "power_user";
			}

			if (["engaged", "power_user"].includes(currentStage) && daysSinceLastActivity >= 3) {
				return "at_risk";
			}

			if (currentStage === "at_risk" && daysSinceLastActivity >= 30) {
				return "churned";
			}

			return null;
		} catch (error) {
			logger.error("Failed to evaluate transition eligibility", {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}
