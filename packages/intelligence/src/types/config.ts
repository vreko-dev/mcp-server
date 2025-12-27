/**
 * Intelligence Package Configuration
 *
 * Defines the configuration interface for the Intelligence facade.
 * Same algorithms, different data sources based on config.
 */

import { z } from "zod";

/**
 * Validation layer interface for extensibility
 */
export interface ValidationLayer {
	name: string;
	validate(code: string, filePath: string): Promise<{ issues: Issue[] }>;
}

/**
 * Issue detected during validation
 */
export interface Issue {
	severity: "critical" | "warning" | "info";
	type: string;
	message: string;
	line?: number;
	fix?: string;
}

/**
 * Custom constraint for validation
 */
export interface Constraint {
	id: string;
	name: string;
	description: string;
	check: (code: string, filePath: string) => Issue[];
}

/**
 * Configuration schema for Intelligence
 */
export const IntelligenceConfigSchema = z.object({
	/**
	 * Root directory for all intelligence data
	 * Internal: 'ai_dev_utils'
	 * Product: workspace root or .snapback/
	 */
	rootDir: z.string(),

	/**
	 * Directory containing pattern definitions
	 * @default 'patterns'
	 */
	patternsDir: z.string().optional().default("patterns"),

	/**
	 * Directory for learnings and feedback
	 * @default 'feedback'
	 */
	learningsDir: z.string().optional().default("feedback"),

	/**
	 * File containing constraints/rules
	 * @default 'CONSTRAINTS.md'
	 */
	constraintsFile: z.string().optional().default("CONSTRAINTS.md"),

	/**
	 * JSONL file for violation tracking
	 * @default 'violations.jsonl'
	 */
	violationsFile: z.string().optional().default("patterns/violations.jsonl"),

	/**
	 * SQLite database for embeddings
	 * @default 'embeddings.db'
	 */
	embeddingsDb: z.string().optional().default("embeddings.db"),

	/**
	 * Files to index for semantic search
	 */
	contextFiles: z
		.array(z.string())
		.optional()
		.default(["ARCHITECTURE.md", "CONSTRAINTS.md", "ROUTER.md", "patterns/codebase-patterns.md"]),

	/**
	 * Enable semantic search with embeddings
	 * Requires @huggingface/transformers
	 * @default false
	 */
	enableSemanticSearch: z.boolean().optional().default(false),

	/**
	 * Enable learning loop (violation tracking, feedback)
	 * @default true
	 */
	enableLearningLoop: z.boolean().optional().default(true),

	/**
	 * Auto-promote patterns at 3x violations
	 * @default true
	 */
	enableAutoPromotion: z.boolean().optional().default(true),

	/**
	 * Session limits configuration (Phase 1)
	 */
	sessionLimits: z
		.object({
			maxToolCalls: z.number().optional(),
			maxConsecutiveSameTool: z.number().optional(),
			maxFileModifications: z.number().optional(),
			maxConsecutiveSameFile: z.number().optional(),
			sessionTimeoutMs: z.number().optional(),
			maxTurns: z.number().optional(),
			circuitBreakerThreshold: z.number().optional(),
			circuitBreakerCooldownMs: z.number().optional(),
		})
		.optional(),

	/**
	 * Session persistence configuration
	 * Enables cross-surface session sharing (Extension, MCP, CLI)
	 */
	sessionPersistence: z
		.object({
			/**
			 * Path for session persistence (JSONL format)
			 * @default '.snapback/session/sessions.jsonl'
			 */
			path: z.string().optional(),
			/**
			 * Enable autosave on session changes
			 * @default true
			 */
			autosave: z.boolean().optional().default(true),
		})
		.optional(),

	/**
	 * Advisory system configuration (Phase 2)
	 */
	advisoryConfig: z
		.object({
			enabled: z.boolean().optional(),
			maxWarnings: z.number().optional(),
			maxSuggestions: z.number().optional(),
			maxRelatedFiles: z.number().optional(),
			includeSessionContext: z.boolean().optional(),
			includeFileHistory: z.boolean().optional(),
		})
		.optional(),
});

export type IntelligenceConfig = z.input<typeof IntelligenceConfigSchema>;
export type ResolvedConfig = z.output<typeof IntelligenceConfigSchema>;

/**
 * Cacheable context for Anthropic prompt caching
 */
export interface CacheableContext {
	architecture: string;
	constraints: string;
	patterns: string;
	timestamp: string;
}
