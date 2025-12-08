/**
 * Protection Decision Engine
 *
 * Per arch_remediation.md Task 1.3: This is THE decision point for all protection logic.
 * VSCode/CLI/MCP should call this engine, not implement their own decision logic.
 *
 * The SDK owns:
 * - Whether to snapshot (shouldSnapshot)
 * - Whether save should proceed (shouldProceed)
 * - Risk evaluation and thresholds
 *
 * Consumers (VSCode, CLI, MCP) own:
 * - HOW to execute snapshots
 * - HOW to display UI/notifications
 * - HOW to handle user interactions
 */

import type { ProtectionLevel } from "@snapback/contracts";
import { THRESHOLDS } from "../config/Thresholds";
import type { ProtectionManager } from "./ProtectionManager";

/**
 * Context for evaluating protection decisions
 */
export interface EvaluationContext {
	/** Absolute file path */
	filePath: string;
	/** What triggered this evaluation */
	trigger: "save" | "manual" | "ai-detected";
	/** Optional: File change metrics */
	changeMetrics?: ChangeMetrics;
	/** Optional: AI detection context */
	aiContext?: AIDetectionContext;
	/** Optional: Whether file is in cooldown */
	inCooldown?: boolean;
	/** Optional: Whether file has temporary allowance */
	hasTemporaryAllowance?: boolean;
}

/**
 * Metrics about the file change
 */
export interface ChangeMetrics {
	linesAdded: number;
	linesDeleted: number;
	charsAdded: number;
	charsDeleted: number;
	affectedFunctions?: number;
}

/**
 * AI detection context
 */
export interface AIDetectionContext {
	detected: boolean;
	confidence: number;
	assistantName?: string;
	burstPattern?: boolean;
}

/**
 * Result of protection decision evaluation
 */
export interface ProtectionDecision {
	/** Whether a snapshot should be created */
	shouldSnapshot: boolean;
	/** Whether the save operation should proceed */
	shouldProceed: boolean;
	/** Human-readable reason for the decision */
	reason: string;
	/** Computed risk score (0-10 scale) */
	riskScore: number;
	/** Recommendations for the user */
	recommendations: string[];
	/** The protection level that was evaluated */
	protectionLevel: ProtectionLevel | null;
}

/**
 * Interface for risk analyzer (injected dependency)
 */
export interface IRiskAnalyzer {
	analyze(context: EvaluationContext): number;
}

/**
 * Simple default risk analyzer implementation
 */
export class DefaultRiskAnalyzer implements IRiskAnalyzer {
	analyze(context: EvaluationContext): number {
		let riskScore = 0;

		// AI detection increases risk
		if (context.aiContext?.detected) {
			riskScore += 3.0;
			if (context.aiContext.burstPattern) {
				riskScore += 2.0;
			}
		}

		// Large changes increase risk
		if (context.changeMetrics) {
			const totalLines = context.changeMetrics.linesAdded + context.changeMetrics.linesDeleted;
			if (totalLines > 100) {
				riskScore += 2.0;
			} else if (totalLines > 50) {
				riskScore += 1.0;
			}

			// Function changes are higher risk
			if (context.changeMetrics.affectedFunctions && context.changeMetrics.affectedFunctions > 3) {
				riskScore += 1.5;
			}
		}

		// Cap at 10
		return Math.min(riskScore, 10);
	}
}

/**
 * Protection Decision Engine
 *
 * THE centralized decision point for all protection logic.
 * All consumers (VSCode, CLI, MCP) should delegate to this engine
 * for shouldSnapshot and shouldProceed decisions.
 */
export class ProtectionDecisionEngine {
	constructor(
		private protectionManager: ProtectionManager,
		private riskAnalyzer: IRiskAnalyzer = new DefaultRiskAnalyzer(),
	) {}

	/**
	 * Evaluate protection decision for a file operation.
	 *
	 * This is THE decision point. Consumers should:
	 * 1. Call this method to get the decision
	 * 2. Execute the decision (create snapshot if shouldSnapshot)
	 * 3. Proceed or block based on shouldProceed
	 *
	 * @param context - The evaluation context
	 * @returns Protection decision with shouldSnapshot, shouldProceed, and reason
	 */
	evaluate(context: EvaluationContext): ProtectionDecision {
		const protectionLevel = this.protectionManager.getLevel(context.filePath);
		const riskScore = this.riskAnalyzer.analyze(context);

		// Handle cooldown bypass
		if (context.inCooldown) {
			return {
				shouldSnapshot: false,
				shouldProceed: true,
				reason: "cooldown_bypass",
				riskScore,
				recommendations: [],
				protectionLevel,
			};
		}

		// Handle temporary allowance
		if (context.hasTemporaryAllowance) {
			// Still snapshot even with allowance (protection purposes)
			return {
				shouldSnapshot: true,
				shouldProceed: true,
				reason: "temporary_allowance",
				riskScore,
				recommendations: [],
				protectionLevel,
			};
		}

		// CENTRALIZED decision logic
		const shouldSnapshot = this.determineShouldSnapshot(protectionLevel, riskScore, context);
		const shouldProceed = this.determineShouldProceed(protectionLevel, riskScore);

		return {
			shouldSnapshot,
			shouldProceed,
			reason: this.buildReason(protectionLevel, riskScore, context),
			riskScore,
			recommendations: this.buildRecommendations(protectionLevel, riskScore),
			protectionLevel,
		};
	}

	/**
	 * Determine if a snapshot should be created.
	 * ALL snapshot decision logic lives HERE.
	 */
	private determineShouldSnapshot(
		level: ProtectionLevel | null,
		riskScore: number,
		context: EvaluationContext,
	): boolean {
		// Unprotected files don't get snapshotted via this path
		if (!level) {
			return false;
		}

		// AI-detected changes ALWAYS trigger snapshot
		if (context.trigger === "ai-detected") {
			return true;
		}

		// Block level always snapshots
		if (level === "block") {
			return true;
		}

		// High risk always snapshots
		if (riskScore >= THRESHOLDS.risk.highThreshold) {
			return true;
		}

		// Warn level: snapshot if medium+ risk
		if (level === "warn") {
			return riskScore >= THRESHOLDS.risk.highThreshold * 0.6; // ~3.0 for medium risk
		}

		// Watch level: always snapshot (that's what watch means)
		if (level === "watch") {
			return true;
		}

		return false;
	}

	/**
	 * Determine if the save operation should proceed.
	 */
	private determineShouldProceed(level: ProtectionLevel | null, riskScore: number): boolean {
		// Unprotected files always proceed
		if (!level) {
			return true;
		}

		// Block level with critical risk should block
		if (level === "block" && riskScore >= THRESHOLDS.risk.criticalThreshold) {
			return false;
		}

		// All other cases proceed
		return true;
	}

	/**
	 * Build a human-readable reason for the decision.
	 */
	private buildReason(level: ProtectionLevel | null, riskScore: number, context: EvaluationContext): string {
		if (!level) {
			return "unprotected_file";
		}

		if (context.trigger === "ai-detected") {
			return "ai_detected_changes";
		}

		if (riskScore >= THRESHOLDS.risk.criticalThreshold) {
			return "critical_risk_level";
		}

		if (riskScore >= THRESHOLDS.risk.highThreshold) {
			return "high_risk_level";
		}

		switch (level) {
			case "block":
				return "block_mode_protection";
			case "warn":
				return "warn_mode_protection";
			case "watch":
				return "watch_mode_protection";
			default:
				return "standard_protection";
		}
	}

	/**
	 * Build recommendations based on protection level and risk.
	 */
	private buildRecommendations(level: ProtectionLevel | null, riskScore: number): string[] {
		const recommendations: string[] = [];

		if (riskScore >= THRESHOLDS.risk.highThreshold) {
			recommendations.push("Review changes carefully before proceeding");
		}

		if (level === "block") {
			recommendations.push("This file requires explicit confirmation to save");
		}

		if (riskScore >= THRESHOLDS.risk.criticalThreshold) {
			recommendations.push("Consider breaking this change into smaller commits");
		}

		return recommendations;
	}
}
