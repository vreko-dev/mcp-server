/**
 * Context Types
 *
 * Types for semantic retrieval and context assembly.
 */

/**
 * Section of a context file
 */
export interface Section {
	id: number;
	file: string;
	section: string;
	content: string;
	embedding?: Uint8Array;
	tokens: number;
}

/**
 * Section with similarity score
 */
export interface ScoredSection extends Section {
	score: number;
}

/**
 * Result of semantic search
 */
export interface SearchResult {
	context: string;
	tokensUsed: number;
	sectionsIncluded: number;
	compressionRatio: number;
}

/**
 * Input for getting context
 */
export interface ContextInput {
	task: string;
	files?: string[];
	keywords?: string[];
}

/**
 * Result of context assembly
 */
export interface ContextResult {
	task: string;
	contextSections: string;
	hardRules: string;
	patterns: string;
	recentViolations: Array<{
		type: string;
		file: string;
		message: string;
		timestamp: string;
	}>;
	relevantLearnings: Array<{
		trigger: string;
		action: string;
		type: string;
	}>;
	hint: string;
}

/**
 * Index status after building
 */
export interface IndexStatus {
	indexed: number;
	skipped: number;
}

/**
 * Pattern matcher result
 */
export interface PatternSearchResult {
	patterns: string[];
	antiPatterns: string[];
	learnings: string[];
}
