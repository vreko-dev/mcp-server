/**
 * Composer - Main Orchestrator
 *
 * The trust core of SnapBack's context assembly system.
 * Provides deterministic, reproducible artifact selection under strict token budgets.
 *
 * Pipeline:
 * 1. Gather candidates from sources
 * 2. Check cache (input-based key)
 * 3. PASS 1: Select using coarse token estimates
 * 4. PASS 2: Render, measure exact tokens, shrink if needed
 * 5. Emit decision log for replay
 * 6. Return result with explanation
 *
 * Guarantees:
 * - Determinism: Same inputs → Same outputs
 * - Budget compliance: Never exceeds allocated tokens
 * - Explainability: Every decision logged with reason
 * - Privacy: Artifact IDs are path-free (HMAC-based)
 */

import type { BudgetConfig } from "./budget.js";
import { DEFAULT_BUDGET_CONFIG, validateBudgetConfig } from "./budget.js";
import { buildCacheKeyInputs, CACHE_TTL_MS, computeCacheKey, SelectionCache } from "./cache.js";
import type { ComposerConstraints } from "./constraints.js";
import { EMPTY_CONSTRAINTS } from "./constraints.js";
import { buildExplanation, type SelectionExplanation, withCacheHit } from "./explainability.js";
import { generateWorkspaceSecret } from "./fingerprint.js";
import { getTotalTokens, renderArtifacts, shrinkToFit } from "./rendering.js";
import { type ComposerDecisionLog, emitDecisionLog } from "./replay.js";
import { scoreAndSort } from "./scoring.js";
import { selectArtifacts, toRef } from "./selection.js";
import type { ArtifactCandidate, ArtifactRef, ArtifactSource, Lane, RenderedArtifact, TokenCounter } from "./types.js";
import { defaultTokenCounter } from "./types.js";

/**
 * Composer configuration options
 */
export interface ComposerOptions {
	/** Budget configuration (defaults to DEFAULT_BUDGET_CONFIG) */
	budgetConfig?: BudgetConfig;
	/** Artifact sources to gather candidates from */
	sources?: ArtifactSource[];
	/** Cache TTL in milliseconds (defaults to 5 minutes) */
	cacheTtlMs?: number;
	/** Token counter function (defaults to char/4 approximation) */
	tokenCounter?: TokenCounter;
	/** Workspace secret for HMAC-based artifact IDs */
	workspaceSecret?: string;
	/** Whether to emit decision logs */
	emitDecisionLogs?: boolean;
}

/**
 * Trigger for composition
 */
export interface ComposeTrigger {
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
 * Complete composition result
 */
export interface CompositionResult {
	/** Selected artifact references (safe for logging) */
	selected: ArtifactRef[];
	/** Token allocation by lane */
	allocation: Record<Lane, number>;
	/** Human-readable explanation */
	explanation: SelectionExplanation;
	/** Cache key for this composition */
	cacheKey: string;
	/** Whether this was a cache hit */
	cacheHit: boolean;
	/** Actual token count after rendering */
	actualTokens: number;
	/** Rendered artifacts (internal use only) */
	rendered: RenderedArtifact[];
	/** Decision log (if emitDecisionLogs is true) */
	decisionLog?: ComposerDecisionLog;
}

/**
 * Resolved composer configuration
 */
interface ResolvedConfig {
	budgetConfig: BudgetConfig;
	sources: ArtifactSource[];
	cacheTtlMs: number;
	tokenCounter: TokenCounter;
	workspaceSecret: string;
	emitDecisionLogs: boolean;
}

/**
 * Main Composer class.
 * Orchestrates the two-pass selection + rendering pipeline.
 */
export class Composer {
	private config: ResolvedConfig;
	private cache: SelectionCache<CompositionResult>;
	private rulesDigest = "";

	constructor(options: ComposerOptions = {}) {
		this.config = this.resolveConfig(options);

		// Validate budget config on construction
		validateBudgetConfig(this.config.budgetConfig);

		// Initialize cache
		this.cache = new SelectionCache(this.config.cacheTtlMs);
	}

	/**
	 * Main entry point: compose context for a trigger.
	 *
	 * @param trigger - What triggered this composition
	 * @param constraints - Policy constraints (optional)
	 * @returns Composition result with selected artifacts
	 */
	async compose(
		trigger: ComposeTrigger,
		constraints: ComposerConstraints = EMPTY_CONSTRAINTS,
	): Promise<CompositionResult> {
		const startTime = Date.now();

		// =========================================================================
		// STEP 1: Gather candidates from all sources
		// =========================================================================
		const candidates = await this.gatherCandidates(trigger);

		// =========================================================================
		// STEP 2: Build context for cache key
		// =========================================================================
		const context = {
			workspaceFingerprint: trigger.workspaceFingerprint,
			triggerEvent: trigger.event,
			commitish: trigger.commitish ?? "HEAD",
			rulesDigest: this.rulesDigest,
		};

		// =========================================================================
		// STEP 3: Check cache
		// =========================================================================
		const cacheKeyInputs = buildCacheKeyInputs(
			candidates,
			constraints,
			this.config.budgetConfig as unknown as Record<string, unknown>,
			context,
		);
		const cacheKey = computeCacheKey(cacheKeyInputs);

		const cached = this.cache.get(cacheKey);
		if (cached) {
			return {
				...cached,
				cacheHit: true,
				explanation: withCacheHit(cached.explanation, true),
			};
		}

		// =========================================================================
		// STEP 4: PASS 1 - Select using coarse estimates
		// =========================================================================
		const selection = selectArtifacts(candidates, this.config.budgetConfig, constraints, context);

		// =========================================================================
		// STEP 5: PASS 2 - Render and measure actual tokens
		// =========================================================================
		const rendered = renderArtifacts(selection.selected, candidates, this.config.tokenCounter);

		// =========================================================================
		// STEP 6: Measure actual tokens
		// =========================================================================
		let actualTotal = getTotalTokens(rendered);

		// =========================================================================
		// STEP 7: If over budget, shrink
		// =========================================================================
		let finalRendered = rendered;
		if (actualTotal > this.config.budgetConfig.totalTokens) {
			finalRendered = shrinkToFit(rendered, this.config.budgetConfig.totalTokens, this.config.tokenCounter);
			actualTotal = getTotalTokens(finalRendered);
		}

		// =========================================================================
		// STEP 8: Build explanation
		// =========================================================================
		const selectedCandidates = candidates.filter((c) => selection.selected.some((s) => s.id === c.id));

		const explanation = buildExplanation(
			selectedCandidates,
			selection.rejections,
			selection.allocation,
			this.config.budgetConfig,
			selection.allocationDetails.shortfalls,
			{
				pinned: constraints.pinned.length,
				mustInclude: constraints.mustInclude.length,
				excluded: constraints.mustExclude.length,
			},
		);

		// =========================================================================
		// STEP 9: Build result
		// =========================================================================
		const result: CompositionResult = {
			selected: selection.selected,
			allocation: selection.allocation,
			explanation,
			cacheKey,
			cacheHit: false,
			actualTokens: actualTotal,
			rendered: finalRendered,
		};

		// =========================================================================
		// STEP 10: Emit decision log
		// =========================================================================
		if (this.config.emitDecisionLogs) {
			const rankings = scoreAndSort(candidates).map((sc) => ({
				artifact: toRef(sc.candidate),
				score: sc.score,
				selected: selection.selected.some((s) => s.id === sc.candidate.id),
				rejectionReason: selection.rejections.find((r) => r.artifact.id === sc.candidate.id)?.reason,
			}));

			result.decisionLog = emitDecisionLog({
				result: {
					selected: result.selected,
					allocation: result.allocation,
					cacheKey: result.cacheKey,
					cacheHit: result.cacheHit,
					actualTokens: result.actualTokens,
				},
				trigger,
				constraints,
				candidates,
				budgetConfig: this.config.budgetConfig as unknown as Record<string, unknown>,
				rankings,
				startTime,
			});
		}

		// =========================================================================
		// STEP 11: Cache result
		// =========================================================================
		this.cache.set(cacheKey, result);

		return result;
	}

	/**
	 * Compose with explicit candidates (for testing)
	 */
	async composeWithCandidates(
		candidates: ArtifactCandidate[],
		trigger: ComposeTrigger,
		constraints: ComposerConstraints = EMPTY_CONSTRAINTS,
	): Promise<CompositionResult> {
		// Store candidates temporarily as a source
		const tempSource: ArtifactSource = {
			generateCandidates: async () => candidates,
		};

		const originalSources = this.config.sources;
		this.config.sources = [tempSource];

		try {
			return await this.compose(trigger, constraints);
		} finally {
			this.config.sources = originalSources;
		}
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): BudgetConfig {
		return this.config.budgetConfig;
	}

	/**
	 * Update the rules digest (invalidates cache)
	 */
	setRulesDigest(digest: string): void {
		this.rulesDigest = digest;
		this.cache.clear();
	}

	/**
	 * Clear the cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; hitRate: number } {
		return this.cache.getStats();
	}

	/**
	 * Get the workspace secret
	 */
	getWorkspaceSecret(): string {
		return this.config.workspaceSecret;
	}

	/**
	 * Gather candidates from all configured sources
	 */
	private async gatherCandidates(trigger: ComposeTrigger): Promise<ArtifactCandidate[]> {
		const allCandidates: ArtifactCandidate[] = [];

		for (const source of this.config.sources) {
			const candidates = await source.generateCandidates(trigger, this.config.workspaceSecret);
			allCandidates.push(...candidates);
		}

		return allCandidates;
	}

	/**
	 * Resolve configuration with defaults
	 */
	private resolveConfig(options: ComposerOptions): ResolvedConfig {
		return {
			budgetConfig: options.budgetConfig ?? DEFAULT_BUDGET_CONFIG,
			sources: options.sources ?? [],
			cacheTtlMs: options.cacheTtlMs ?? CACHE_TTL_MS,
			tokenCounter: options.tokenCounter ?? defaultTokenCounter,
			workspaceSecret: options.workspaceSecret ?? generateWorkspaceSecret(),
			emitDecisionLogs: options.emitDecisionLogs ?? false,
		};
	}
}

/**
 * Create a composer with default configuration
 */
export function createComposer(options?: ComposerOptions): Composer {
	return new Composer(options);
}

/**
 * Create a mock artifact candidate for testing
 */
export function createMockCandidate(params: {
	id: string;
	kind: ArtifactCandidate["kind"];
	lane: Lane;
	content: string;
	tokenEstimate?: number;
	recencyBucket?: number;
	relevanceScore?: number;
	specificityScore?: number;
	riskAlignment?: number;
}): ArtifactCandidate {
	const tokenEstimate = params.tokenEstimate ?? Math.ceil(params.content.length / 4);

	return {
		id: params.id,
		kind: params.kind,
		lane: params.lane,
		tokenEstimate,
		recencyBucket: params.recencyBucket ?? 3,
		relevanceScore: params.relevanceScore ?? 0.5,
		specificityScore: params.specificityScore ?? 0.5,
		riskAlignment: params.riskAlignment ?? 0.5,
		getContent: () => params.content,
		shrink: (targetTokens: number) => ({
			id: params.id,
			kind: params.kind,
			lane: params.lane,
			content: params.content.slice(0, targetTokens * 4),
			exactTokenCount: targetTokens,
			shrunk: true,
			originalTokenCount: tokenEstimate,
			shrinkStrategy: "truncate_oldest",
		}),
	};
}
