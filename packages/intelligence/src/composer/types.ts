/**
 * Composer Core Types
 *
 * Type definitions for the deterministic context assembly system.
 * These types enable:
 * - Lane-based artifact categorization
 * - Type-safe artifact handling
 * - Privacy-safe references (no paths exposed)
 * - Shrinkable content for budget fitting
 */

/**
 * Lanes categorize artifacts by purpose and priority.
 * Priority 0 = highest (always included first).
 */
export type Lane =
	| "policy" // Priority 0: Constraints, invariants, danger zones
	| "rules" // Priority 1: Protection rules, config
	| "local" // Priority 2: Current diff, recent edits
	| "structure" // Priority 3: Dependency graphs
	| "retrieved" // Priority 4: Semantic retrieval
	| "history"; // Priority 5: Session context

/**
 * Lane priority mapping (lower = higher priority)
 */
export const LANE_PRIORITIES: Readonly<Record<Lane, number>> = {
	policy: 0,
	rules: 1,
	local: 2,
	structure: 3,
	retrieved: 4,
	history: 5,
} as const;

/**
 * All valid lanes in priority order
 */
export const LANES_BY_PRIORITY: readonly Lane[] = [
	"policy",
	"rules",
	"local",
	"structure",
	"retrieved",
	"history",
] as const;

/**
 * Artifact kinds for fine-grained control.
 */
export type ArtifactKind =
	| "constraint" // Hard rules, invariants
	| "rule_doc" // Protection rules
	| "local_diff" // Current changes
	| "recent_edit" // Recent file edits
	| "symbol_context" // Symbol definitions
	| "dependency_graph" // Import/export relationships
	| "test_context" // Related tests
	| "semantic_match" // Embedding-based retrieval
	| "session_history" // Previous conversation context
	| "violation" // Recent violations
	| "learning"; // Relevant learnings

/**
 * Kind priority mapping (lower = higher priority)
 */
export const KIND_PRIORITIES: Readonly<Record<ArtifactKind, number>> = {
	constraint: 0,
	rule_doc: 1,
	local_diff: 2,
	recent_edit: 3,
	symbol_context: 4,
	dependency_graph: 5,
	test_context: 6,
	semantic_match: 7,
	session_history: 8,
	violation: 9,
	learning: 10,
} as const;

/**
 * Shrink strategies per artifact kind.
 * Determines how content is reduced when budget is exceeded.
 */
export type ShrinkStrategy =
	| "truncate_oldest" // For diffs: drop oldest hunks first
	| "keep_signatures" // For code: keep signatures, drop bodies
	| "collapse_summary" // For graphs: collapse to summary
	| "drop_entries" // For history: drop oldest entries
	| "never"; // For rules: never shrink (hard constraint)

/**
 * Reference to an artifact (safe for logs/telemetry).
 * Contains NO paths or content.
 */
export interface ArtifactRef {
	/** HMAC-based, stable, path-free identifier */
	id: string;
	/** The type of content this artifact contains */
	kind: ArtifactKind;
	/** The lane this artifact belongs to */
	lane: Lane;
	/** Estimated token count (may differ from actual) */
	tokenEstimate: number;
}

/**
 * Candidate artifact before selection.
 * Has content access internally but never exposes it in logs.
 */
export interface ArtifactCandidate extends ArtifactRef {
	/**
	 * Recency bucket (0-5, higher = more recent)
	 * Quantized to prevent time-based non-determinism
	 */
	recencyBucket: number;

	/**
	 * Relevance score (0-1, quantized to 0.001)
	 * How well this artifact matches the current context
	 */
	relevanceScore: number;

	/**
	 * Specificity score (0-1, quantized to 0.001)
	 * How targeted this artifact is to the specific task
	 */
	specificityScore: number;

	/**
	 * Risk alignment (0-1)
	 * How well this artifact relates to current risk factors
	 */
	riskAlignment: number;

	/**
	 * Get the content of this artifact (internal use only, never logged)
	 */
	getContent(): string;

	/**
	 * Create a shrunk version of this artifact to fit target tokens
	 * @param targetTokens Maximum tokens for the result
	 */
	shrink(targetTokens: number): RenderedArtifact;
}

/**
 * Rendered artifact with exact token count.
 * Content is internal only, never logged externally.
 */
export interface RenderedArtifact {
	/** HMAC-based, stable, path-free identifier */
	id: string;
	/** The type of content this artifact contains */
	kind: ArtifactKind;
	/** The lane this artifact belongs to */
	lane: Lane;

	/**
	 * Final rendered content (internal only, never logged)
	 */
	content: string;

	/**
	 * Exact token count after rendering/shrinking
	 */
	exactTokenCount: number;

	/**
	 * Whether this artifact was shrunk to fit budget
	 */
	shrunk: boolean;

	/**
	 * Original token count before shrinking (if shrunk)
	 */
	originalTokenCount?: number;

	/**
	 * Strategy used for shrinking (if shrunk)
	 */
	shrinkStrategy?: ShrinkStrategy;
}

/**
 * Token counting function type
 * Allows plugging in different tokenizers
 */
export type TokenCounter = (text: string) => number;

/**
 * Default token counter using approximate word-based estimation
 * ~4 characters per token on average for English text
 */
export function defaultTokenCounter(text: string): number {
	if (!text) return 0;
	// Approximation: ~4 characters per token
	// This is a reasonable estimate for GPT-style tokenizers
	return Math.ceil(text.length / 4);
}

/**
 * Artifact source interface for generating candidates
 * Implemented by ContextEngine, PolicyEngine, etc.
 */
export interface ArtifactSource {
	/**
	 * Generate artifact candidates for the given trigger
	 * @param trigger What triggered this composition
	 * @param workspaceSecret Secret for HMAC-based ID generation
	 */
	generateCandidates(trigger: ComposeTriggerInput, workspaceSecret: string): Promise<ArtifactCandidate[]>;
}

/**
 * Input for triggering composition
 */
export interface ComposeTriggerInput {
	/** What triggered this composition */
	event: string;
	/** Workspace fingerprint for cache keying */
	workspaceFingerprint: string;
	/** Git commit or equivalent */
	commitish?: string;
	/** Keywords for relevance scoring */
	keywords?: string[];
	/** Files currently being edited */
	files?: string[];
}

/**
 * Validate that a value is a valid Lane
 */
export function isValidLane(value: string): value is Lane {
	return value in LANE_PRIORITIES;
}

/**
 * Validate that a value is a valid ArtifactKind
 */
export function isValidArtifactKind(value: string): value is ArtifactKind {
	return value in KIND_PRIORITIES;
}

/**
 * Compare two artifact refs by lane and kind priority
 * Returns negative if a comes before b, positive if after, 0 if equal
 */
export function compareArtifactPriority(a: ArtifactRef, b: ArtifactRef): number {
	// First compare by lane priority
	const laneDiff = LANE_PRIORITIES[a.lane] - LANE_PRIORITIES[b.lane];
	if (laneDiff !== 0) return laneDiff;

	// Then compare by kind priority
	const kindDiff = KIND_PRIORITIES[a.kind] - KIND_PRIORITIES[b.kind];
	if (kindDiff !== 0) return kindDiff;

	// Finally compare by ID for stability
	return a.id.localeCompare(b.id);
}
