/**
 * Advisory Context Types
 *
 * Structured warnings, suggestions, and contextual guidance for LLMs.
 *
 * Based on research:
 * - GitHub Copilot Autofix - structured feedback model
 * - CodeGuard security framework - layered warnings
 * - Context Engineering patterns - proactive guidance
 */

/**
 * Warning severity levels
 */
export type WarningSeverity = "error" | "warning" | "info";

/**
 * Structured warning with code reference
 */
export interface AdvisoryWarning {
	/** Severity level */
	level: WarningSeverity;
	/** Warning code (e.g., 'FRAGILE_FILE', 'LOOP_DETECTED') */
	code: string;
	/** Human-readable message */
	message: string;
	/** File path (if applicable) */
	file?: string;
	/** Line number (if applicable) */
	line?: number;
	/** Related files */
	relatedFiles?: string[];
	/** Suggested action */
	suggestion?: string;
	/** Documentation link */
	docUrl?: string;
}

/**
 * File history context
 */
export interface FileHistory {
	/** File path */
	path: string;
	/** Modifications today */
	modificationsToday: number;
	/** Modifications this session */
	modificationsThisSession: number;
	/** Rollbacks this week */
	rollbacksThisWeek: number;
	/** Last modified by (user/agent) */
	lastModifiedBy: string;
	/** Last modified timestamp */
	lastModified: number;
	/** Fragility score (0-1, 1 = very fragile) */
	fragilityScore: number;
	/** Average time to rollback (ms) */
	averageTimeToRollback?: number;
}

/**
 * Related file suggestion
 */
export interface RelatedFile {
	/** File path */
	path: string;
	/** Relationship reason */
	reason: string;
	/** Co-change frequency (0-1) */
	coChangeFrequency?: number;
}

/**
 * Proactive suggestion for LLM
 */
export interface ProactiveSuggestion {
	/** Suggestion text */
	text: string;
	/** Priority (1 = highest) */
	priority: number;
	/** Confidence (0-1) */
	confidence: number;
	/** Category */
	category: "testing" | "checkpoint" | "validation" | "documentation" | "safety";
	/** Relevant files */
	files?: string[];
}

/**
 * Advisory context enrichment
 * Injected into every tool response to guide LLM behavior
 */
export interface AdvisoryContext {
	/** Brief summary for LLM */
	summary: string;

	/** Structured warnings */
	warnings: AdvisoryWarning[];

	/** Proactive suggestions (ranked by priority) */
	suggestions: ProactiveSuggestion[];

	/** Related files to consider */
	relatedFiles: RelatedFile[];

	/** Historical context for relevant files */
	fileHistory: FileHistory[];

	/** Session-level context */
	session?: {
		/** Current risk level */
		riskLevel: "low" | "medium" | "high" | "critical";
		/** Tool calls so far */
		toolCallCount: number;
		/** Files modified so far */
		filesModified: number;
		/** Loops detected */
		loopsDetected: number;
	};

	/** Next recommended actions (for tool chaining) */
	nextActions?: string[];
}

/**
 * Advisory rule for generating context
 */
export interface AdvisoryRule {
	/** Rule ID */
	id: string;
	/** Trigger condition */
	trigger: (context: AdvisoryTriggerContext) => boolean;
	/** Generate advisory content */
	generate: (context: AdvisoryTriggerContext) => Partial<AdvisoryContext>;
	/** Priority (1 = highest) */
	priority: number;
}

/**
 * Context available to advisory rules
 */
export interface AdvisoryTriggerContext {
	/** Current tool call */
	toolCall?: {
		name: string;
		args: Record<string, unknown>;
	};
	/** Target files */
	files: string[];
	/** Session state */
	session: {
		riskLevel: "low" | "medium" | "high" | "critical";
		toolCallCount: number;
		filesModified: number;
		loopsDetected: number;
		consecutiveFileModifications: Map<string, number>;
	};
	/** File fragility scores */
	fragility: Map<string, number>;
	/** Recent violations */
	recentViolations: Array<{ type: string; file: string }>;
}

/**
 * Advisory engine configuration
 */
export interface AdvisoryConfig {
	/** Enable advisory enrichment */
	enabled: boolean;
	/** Max warnings per response */
	maxWarnings: number;
	/** Max suggestions per response */
	maxSuggestions: number;
	/** Max related files */
	maxRelatedFiles: number;
	/** Include session context */
	includeSessionContext: boolean;
	/** Include file history */
	includeFileHistory: boolean;
	/** Custom advisory rules */
	customRules?: AdvisoryRule[];
}

/**
 * Default advisory configuration
 */
export const DEFAULT_ADVISORY_CONFIG: AdvisoryConfig = {
	enabled: true,
	maxWarnings: 5,
	maxSuggestions: 3,
	maxRelatedFiles: 5,
	includeSessionContext: true,
	includeFileHistory: true,
};
