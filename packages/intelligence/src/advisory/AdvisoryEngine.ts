/**
 * Advisory Engine
 *
 * Generates structured warnings, suggestions, and contextual guidance for LLMs.
 * Enriches every tool response with actionable intelligence.
 *
 * Based on research:
 * - GitHub Copilot Autofix - structured feedback model
 * - CodeGuard security framework - layered warnings
 * - Context Engineering patterns - proactive guidance
 */

import type {
	AdvisoryConfig,
	AdvisoryContext,
	AdvisoryRule,
	AdvisoryTriggerContext,
	AdvisoryWarning,
	FileHistory,
	ProactiveSuggestion,
	RelatedFile,
} from "../types/advisory.js";
import { DEFAULT_ADVISORY_CONFIG } from "../types/advisory.js";
import { logger } from "../utils/logger.js";
import {
	ConsecutiveModificationRule,
	FragileFileRule,
	GenericSuggestionsRule,
	LoopDetectionRule,
	ViolationHistoryRule,
} from "./rules/index.js";

/**
 * Advisory Engine
 *
 * Orchestrates multiple advisory rules to generate contextual guidance.
 * Rules are executed by priority and results are merged with limit enforcement.
 */
export class AdvisoryEngine {
	private config: AdvisoryConfig;
	private rules: AdvisoryRule[] = [];

	constructor(config: Partial<AdvisoryConfig> = {}) {
		// Validate configuration
		if (config.maxWarnings !== undefined && config.maxWarnings < 0) {
			throw new Error("AdvisoryConfig.maxWarnings must be non-negative");
		}
		if (config.maxSuggestions !== undefined && config.maxSuggestions < 0) {
			throw new Error("AdvisoryConfig.maxSuggestions must be non-negative");
		}
		if (config.maxRelatedFiles !== undefined && config.maxRelatedFiles < 0) {
			throw new Error("AdvisoryConfig.maxRelatedFiles must be non-negative");
		}

		this.config = { ...DEFAULT_ADVISORY_CONFIG, ...config };
		this.initializeBuiltInRules();
	}

	/**
	 * Initialize built-in advisory rules
	 */
	private initializeBuiltInRules(): void {
		// Register modular rules
		this.registerRule(ConsecutiveModificationRule);
		this.registerRule(FragileFileRule);
		this.registerRule(LoopDetectionRule);
		this.registerRule(ViolationHistoryRule);
		this.registerRule(GenericSuggestionsRule);
	}

	/**
	 * Register a custom advisory rule
	 * Uses insertion sort for O(n) performance with small rule counts
	 */
	registerRule(rule: AdvisoryRule): void {
		// Find insertion point using binary search for O(log n)
		let left = 0;
		let right = this.rules.length;

		while (left < right) {
			const mid = Math.floor((left + right) / 2);
			if (this.rules[mid].priority < rule.priority) {
				left = mid + 1;
			} else {
				right = mid;
			}
		}

		// Insert at correct position
		this.rules.splice(left, 0, rule);
	}

	/**
	 * Enrich context with advisory guidance
	 */
	enrich(context: AdvisoryTriggerContext): AdvisoryContext {
		// Disabled check
		if (!this.config.enabled) {
			return {
				summary: "Advisory system disabled",
				warnings: [],
				suggestions: [],
				relatedFiles: [],
				fileHistory: [],
			};
		}

		// Build advisory context
		const warnings: AdvisoryWarning[] = [];
		const suggestions: ProactiveSuggestion[] = [];
		const relatedFiles: RelatedFile[] = [];

		// Execute triggered rules
		for (const rule of this.rules) {
			try {
				if (rule.trigger(context)) {
					const result = rule.generate(context);

					if (result.warnings) {
						warnings.push(...result.warnings);
					}
					if (result.suggestions) {
						suggestions.push(...result.suggestions);
					}
					if (result.relatedFiles) {
						relatedFiles.push(...result.relatedFiles);
					}
				}
			} catch (error) {
				logger.error("Advisory rule failed", {
					ruleId: rule.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Enforce limits
		const limitedWarnings = warnings.slice(0, this.config.maxWarnings);
		const limitedSuggestions = suggestions
			.sort((a, b) => a.priority - b.priority)
			.slice(0, this.config.maxSuggestions);
		const limitedRelatedFiles = relatedFiles.slice(0, this.config.maxRelatedFiles);

		// Generate file history
		const fileHistory = this.config.includeFileHistory ? this.generateFileHistory(context) : [];

		// Generate summary
		const summary = this.generateSummary(context);

		// Build session context
		const sessionContext = this.config.includeSessionContext
			? {
					riskLevel: context.session.riskLevel,
					toolCallCount: context.session.toolCallCount,
					filesModified: context.session.filesModified,
					loopsDetected: context.session.loopsDetected,
				}
			: undefined;

		return {
			summary,
			warnings: limitedWarnings,
			suggestions: limitedSuggestions,
			relatedFiles: limitedRelatedFiles,
			fileHistory,
			session: sessionContext,
		};
	}

	/**
	 * Generate file history for target files
	 */
	private generateFileHistory(context: AdvisoryTriggerContext): FileHistory[] {
		return context.files.map((file) => {
			const modificationsThisSession = context.session.consecutiveFileModifications.get(file) ?? 0;
			const fragilityScore = context.fragility.get(file) ?? 0;

			return {
				path: file,
				// Phase 2 Enhancement (INT-010): Add persistent file modification tracking
				// TODO: Would need persistent tracking across sessions
				modificationsToday: 0,
				modificationsThisSession,
				// Phase 2 Enhancement (INT-011): Integrate with FragilityTracker
				// TODO: Would need fragility tracker with rollback event history
				rollbacksThisWeek: 0,
				// Phase 2 Enhancement (INT-012): Add git integration for author tracking
				// TODO: Would need git blame/log integration
				lastModifiedBy: "unknown",
				lastModified: Date.now(),
				fragilityScore,
			};
		});
	}

	/**
	 * Generate summary text
	 */
	private generateSummary(context: AdvisoryTriggerContext): string {
		if (context.files.length === 0) {
			return "No specific files targeted";
		}

		// Find most modified file
		let maxMods = 0;
		let maxModFile = "";
		for (const [file, count] of context.session.consecutiveFileModifications.entries()) {
			if (count > maxMods) {
				maxMods = count;
				maxModFile = file;
			}
		}

		if (maxMods > 0) {
			const fragility = context.fragility.get(maxModFile) ?? 0;
			const fragilityLevel =
				fragility > 0.7 ? "HIGH" : fragility > 0.5 ? "MODERATE" : fragility > 0.3 ? "LOW" : "STABLE";

			return `${maxModFile} has been modified ${maxMods} times this session (fragility: ${fragilityLevel})`;
		}

		return `Analyzing ${context.files.length} file${context.files.length > 1 ? "s" : ""}`;
	}

	/**
	 * Get file history (stub for future implementation)
	 */
	getFileHistory(file: string): FileHistory {
		return {
			path: file,
			modificationsToday: 0,
			modificationsThisSession: 0,
			rollbacksThisWeek: 0,
			lastModifiedBy: "unknown",
			lastModified: Date.now(),
			fragilityScore: 0,
		};
	}
}
