/**
 * Violation Tracker
 *
 * Tracks violations and auto-promotes patterns:
 * - 1x seen → Store in violations.jsonl
 * - 3x seen → Promote to codebase-patterns.md
 * - 5x seen → Mark for automated detection
 */

import * as path from "node:path";
import { appendJsonlAsync, generateId, loadJsonl, writeJsonl } from "../storage/JsonlStore.js";
import type { ResolvedConfig } from "../types/config.js";
import type { Violation, ViolationInput, ViolationStatus, ViolationsSummary } from "../types/learning.js";
import { PROMOTION_THRESHOLDS } from "../types/learning.js";

/**
 * Violation Tracker with auto-promotion
 */
export class ViolationTracker {
	private config: ResolvedConfig;
	private violationsPath: string;

	constructor(config: ResolvedConfig) {
		this.config = config;
		this.violationsPath = path.join(config.rootDir, config.violationsFile);
	}

	/**
	 * Report a violation and update count
	 */
	async report(input: ViolationInput): Promise<ViolationStatus> {
		const violations = loadJsonl<Violation>(this.violationsPath);

		// Check if violation type already exists
		const existing = violations.find((v) => v.type === input.type);

		if (existing) {
			// Increment count
			existing.count += 1;
			existing.timestamp = new Date().toISOString();

			// Check promotion thresholds
			let shouldPromote = false;
			let shouldAutomate = false;

			if (existing.count >= PROMOTION_THRESHOLDS.ADD_AUTOMATION && !existing.automatedAt) {
				shouldAutomate = true;
				existing.automatedAt = new Date().toISOString();
			} else if (existing.count >= PROMOTION_THRESHOLDS.PROMOTE_TO_PATTERN && !existing.promotedAt) {
				shouldPromote = true;
				existing.promotedAt = new Date().toISOString();
			}

			// Save updated violations
			await writeJsonl(this.violationsPath, violations);

			return {
				id: existing.id,
				count: existing.count,
				shouldPromote,
				shouldAutomate,
			};
		}

		// Create new violation
		const violation: Violation = {
			id: generateId("V"),
			type: input.type,
			file: input.file,
			whatHappened: input.message,
			whyItHappened: input.reason,
			prevention: input.prevention,
			wrongExample: input.wrongExample,
			correctExample: input.correctExample,
			timestamp: new Date().toISOString(),
			count: 1,
			promotedAt: null,
			automatedAt: null,
		};

		await appendJsonlAsync(this.violationsPath, violation);

		return {
			id: violation.id,
			count: 1,
			shouldPromote: false,
			shouldAutomate: false,
		};
	}

	/**
	 * Get summary of all violations
	 */
	getSummary(): ViolationsSummary {
		const violations = loadJsonl<Violation>(this.violationsPath);

		const byType = violations.map((v) => ({
			type: v.type,
			count: v.count,
			status: this.getViolationStatus(v),
		}));

		const readyForPromotion = violations
			.filter((v) => v.count >= PROMOTION_THRESHOLDS.PROMOTE_TO_PATTERN && !v.promotedAt)
			.map((v) => v.type);

		const readyForAutomation = violations
			.filter((v) => v.count >= PROMOTION_THRESHOLDS.ADD_AUTOMATION && !v.automatedAt)
			.map((v) => v.type);

		return {
			total: violations.length,
			byType,
			readyForPromotion,
			readyForAutomation,
		};
	}

	/**
	 * Get violation status based on count and flags
	 */
	private getViolationStatus(
		violation: Violation,
	): "tracking" | "ready_for_promotion" | "ready_for_automation" | "promoted" | "automated" {
		if (violation.automatedAt) {
			return "automated";
		}
		if (violation.promotedAt) {
			return "promoted";
		}
		if (violation.count >= PROMOTION_THRESHOLDS.ADD_AUTOMATION) {
			return "ready_for_automation";
		}
		if (violation.count >= PROMOTION_THRESHOLDS.PROMOTE_TO_PATTERN) {
			return "ready_for_promotion";
		}
		return "tracking";
	}

	/**
	 * Get violations by type
	 */
	getByType(type: string): Violation | undefined {
		const violations = loadJsonl<Violation>(this.violationsPath);
		return violations.find((v) => v.type === type);
	}

	/**
	 * Get recent violations
	 */
	getRecent(limit = 10): Violation[] {
		const violations = loadJsonl<Violation>(this.violationsPath);
		return violations.slice(-limit);
	}

	/**
	 * Get violations for a specific file
	 */
	getByFile(file: string): Violation[] {
		const violations = loadJsonl<Violation>(this.violationsPath);
		return violations.filter((v) => v.file.includes(file));
	}
}
