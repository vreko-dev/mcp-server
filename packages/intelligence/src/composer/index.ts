/**
 * @snapback/intelligence/composer
 *
 * Deterministic context assembly for AI-native development.
 *
 * The Composer is the trust core of SnapBack's context assembly system.
 * It provides deterministic, reproducible artifact selection under strict
 * token budgets with full explainability.
 *
 * Core guarantees:
 * - Determinism: Same inputs → Same outputs (provable via replay)
 * - Budget enforcement: Never exceeds allocated tokens
 * - Explainability: Every selection decision is logged with reasons
 * - Privacy: Artifact IDs are stable but path-free (HMAC-based)
 *
 * @example
 * ```typescript
 * import { Composer, DEFAULT_BUDGET_CONFIG } from '@snapback/intelligence/composer';
 *
 * const composer = new Composer({
 *   budgetConfig: DEFAULT_BUDGET_CONFIG,
 *   sources: [myArtifactSource],
 * });
 *
 * const result = await composer.compose({
 *   event: 'file_saved',
 *   workspaceFingerprint: 'abc123',
 * });
 *
 * console.log(result.explanation.summary);
 * // "Selected 12 artifacts using 6500/8000 tokens"
 * ```
 */

export type { AllocationResult, SelectionBudgetResult } from "./allocation.js";
// Allocation
export {
	allocateMinBudgets,
	calculateUtilization,
	canAllocateArtifact,
	getLaneHeadroom,
	groupByLane,
	selectWithinBudget,
	sumTokenEstimates,
} from "./allocation.js";
export type { BudgetConfig, BudgetUsage, LaneBudget } from "./budget.js";
// Budget configuration
export {
	allocate,
	canAllocate,
	createBudgetUsage,
	DEFAULT_BUDGET_CONFIG,
	getDiscretionaryBudget,
	getLanesByPriority,
	validateBudgetConfig,
	withLaneOverrides,
	withTotalBudget,
} from "./budget.js";
export type {
	ComposerOptions,
	ComposeTrigger,
	CompositionResult,
} from "./Composer.js";
// Main orchestrator
export { Composer, createComposer, createMockCandidate } from "./Composer.js";
export type { CacheEntry, CacheKeyInputs, InvalidationTrigger } from "./cache.js";
// Cache
export {
	buildCacheKeyInputs,
	CACHE_TTL_MS,
	COMPOSER_VERSION,
	computeBudgetConfigDigest,
	computeCacheKey,
	computeCandidateDigest,
	computeConstraintsDigest,
	SelectionCache,
} from "./cache.js";
export type {
	ArtifactMatcher,
	ComposerConstraints,
	Constraint,
	LaneRequirement,
} from "./constraints.js";
// Constraints (Policy → Composer interface)
export {
	ConstraintsBuilder,
	constraints,
	EMPTY_CONSTRAINTS,
	findMatchingConstraint,
	isExcluded,
	isMustInclude,
	isPinned,
	matches,
	matchId,
	matchKind,
	matchLane,
	matchPattern,
	mergeConstraints,
} from "./constraints.js";
// Determinism guardrails
export {
	bucketRecency,
	deterministicArrayHash,
	getRecencyLabel,
	MAX_RECENCY_BUCKET,
	normalizeTimestamp,
	quantizeRelevance,
	quantizeToDecimals,
	RECENCY_BUCKETS,
	RELEVANCE_PRECISION,
	scoresEqual,
	tieBreaker,
} from "./determinism.js";
export type { SelectionExplanation } from "./explainability.js";
// Explainability
export {
	buildEmptyExplanation,
	buildExplanation,
	formatExplanationAsJSON,
	formatExplanationForCLI,
	formatRejectionReason,
	getRejectionStats,
	toMinimalExplanation,
	withCacheHit,
} from "./explainability.js";
export type { ArtifactIdInput, FingerprintConfig } from "./fingerprint.js";
// Fingerprinting
export {
	computeArtifactId,
	computeArtifactSetDigest,
	computeContentFingerprint,
	computeWorkspaceFingerprint,
	DEFAULT_FINGERPRINT_CONFIG,
	generateWorkspaceSecret,
	hashObject,
	isValidArtifactId,
} from "./fingerprint.js";
// Rendering
export {
	applyShrinkStrategy,
	collapseSummary,
	dropEntries,
	getShrinkStats,
	getTotalTokens,
	keepSignatures,
	MIN_SHRUNK_SIZE,
	needsShrinking,
	renderArtifact,
	renderArtifacts,
	SHRINK_STRATEGIES,
	shrinkToFit,
	truncateOldest,
} from "./rendering.js";
export type { ComposerDecisionLog, VerificationResult } from "./replay.js";
// Replay
export {
	emitDecisionLog,
	formatDecisionLog,
	generateLogId,
	isValidDecisionLog,
	logsAreEquivalent,
	toMinimalLog,
	verifyDeterminism,
} from "./replay.js";
export type { ScoredCandidate } from "./scoring.js";
// Scoring
export {
	aboveThreshold,
	applyScoreAdjustments,
	computeScore,
	getScoreStats,
	SCORING_WEIGHTS,
	scoreAndSort,
	topN,
	validateScoringWeights,
} from "./scoring.js";
export type {
	RejectionReason,
	RejectionRecord,
	SelectionContext,
	SelectionResult,
} from "./selection.js";
// Selection
export {
	getSelectionStats,
	selectArtifacts,
	toRef,
	verifySelectionDeterminism,
} from "./selection.js";
export type {
	ArtifactCandidate,
	ArtifactKind,
	ArtifactRef,
	ArtifactSource,
	ComposeTriggerInput,
	Lane,
	RenderedArtifact,
	ShrinkStrategy,
	TokenCounter,
} from "./types.js";
// Types
export {
	compareArtifactPriority,
	defaultTokenCounter,
	isValidArtifactKind,
	isValidLane,
	KIND_PRIORITIES,
	LANE_PRIORITIES,
	LANES_BY_PRIORITY,
} from "./types.js";
