/**
 * Cache Module
 *
 * Implements input-based caching for selection results.
 * Key insight: Cache key is computed from INPUTS, not outputs.
 *
 * Cache invalidation triggers:
 * - File saved
 * - Git commit
 * - Config changed
 * - Rules changed
 * - Constraints changed
 * - Session expired (5 min TTL)
 */

import { createHash } from "node:crypto";
import type { ComposerConstraints } from "./constraints.js";
import type { ArtifactCandidate } from "./types.js";

/**
 * Inputs for cache key computation.
 * Key is computed BEFORE selection (not from output).
 */
export interface CacheKeyInputs {
	/** Hash of workspace structure */
	workspaceFingerprint: string;
	/** What triggered composition */
	triggerEvent: string;
	/** Git HEAD or equivalent */
	commitish: string;
	/** Hash of candidate set */
	candidateDigest: string;
	/** Hash of active rules */
	rulesDigest: string;
	/** Hash of budget config */
	budgetConfigDigest: string;
	/** Hash of constraints */
	constraintsDigest: string;
	/** Composer version (so upgrades invalidate) */
	composerVersion: string;
}

/**
 * Current composer version for cache invalidation
 */
export const COMPOSER_VERSION = "1.0.0";

/**
 * Cache TTL in milliseconds (5 minutes)
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Invalidation triggers for cache
 */
export type InvalidationTrigger =
	| "file_saved"
	| "git_commit"
	| "config_changed"
	| "rules_changed"
	| "constraints_changed"
	| "session_expired";

/**
 * Compute cache key from inputs.
 * This key is computed BEFORE doing selection work.
 *
 * @param inputs - Cache key inputs
 * @returns 32-character cache key
 *
 * @example
 * const key = computeCacheKey({
 *   workspaceFingerprint: 'abc123',
 *   triggerEvent: 'file_saved',
 *   commitish: 'HEAD',
 *   candidateDigest: 'def456',
 *   rulesDigest: 'ghi789',
 *   budgetConfigDigest: 'jkl012',
 *   constraintsDigest: 'mno345',
 *   composerVersion: '1.0.0',
 * });
 * // Returns something like: "Xk9mQ2vN8pL3Rm5sYt7uWxAb"
 */
export function computeCacheKey(inputs: CacheKeyInputs): string {
	// Sort keys for determinism
	const normalized = JSON.stringify(inputs, Object.keys(inputs).sort());
	return createHash("sha256").update(normalized).digest("base64url").slice(0, 32);
}

/**
 * Compute candidate digest from candidate set.
 * Includes id, lane, kind, tokenEstimate for each candidate.
 *
 * @param candidates - Array of candidates
 * @returns 16-character digest
 */
export function computeCandidateDigest(candidates: ArtifactCandidate[]): string {
	// Sort by ID for determinism
	const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));

	// Build deterministic representation
	const data = sorted.map((c) => `${c.id}:${c.lane}:${c.kind}:${c.tokenEstimate}`);

	return createHash("sha256").update(data.join("|")).digest("base64url").slice(0, 16);
}

/**
 * Compute constraints digest
 *
 * @param constraints - Composer constraints
 * @returns 16-character digest
 */
export function computeConstraintsDigest(constraints: ComposerConstraints): string {
	// Create deterministic representation
	const data = {
		mustInclude: constraints.mustInclude.map((c) => JSON.stringify(c.match)).sort(),
		mustExclude: constraints.mustExclude.map((c) => JSON.stringify(c.match)).sort(),
		pinned: constraints.pinned.map((c) => JSON.stringify(c.match)).sort(),
		laneRequirements: constraints.laneRequirements.map((r) => `${r.lane}:${r.minTokens}`).sort(),
	};

	return createHash("sha256").update(JSON.stringify(data)).digest("base64url").slice(0, 16);
}

/**
 * Compute budget config digest
 *
 * @param config - Budget configuration object
 * @returns 16-character digest
 */
export function computeBudgetConfigDigest(config: Record<string, unknown>): string {
	const normalized = JSON.stringify(config, Object.keys(config).sort());
	return createHash("sha256").update(normalized).digest("base64url").slice(0, 16);
}

/**
 * Cache entry with value and metadata
 */
export interface CacheEntry<T> {
	/** Cached value */
	value: T;
	/** Cache key */
	key: string;
	/** When the entry was created */
	createdAt: number;
	/** When the entry expires */
	expiresAt: number;
	/** Trigger that would invalidate this entry */
	invalidatedBy?: InvalidationTrigger;
}

/**
 * Simple in-memory cache for selection results
 */
export class SelectionCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private ttlMs: number;

	constructor(ttlMs: number = CACHE_TTL_MS) {
		this.ttlMs = ttlMs;
	}

	/**
	 * Get a cached value
	 *
	 * @param key - Cache key
	 * @returns Cached value or undefined if not found/expired
	 */
	get(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}

		// Check expiration
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}

		return entry.value;
	}

	/**
	 * Set a cached value
	 *
	 * @param key - Cache key
	 * @param value - Value to cache
	 */
	set(key: string, value: T): void {
		const now = Date.now();
		this.cache.set(key, {
			value,
			key,
			createdAt: now,
			expiresAt: now + this.ttlMs,
		});
	}

	/**
	 * Invalidate entries matching a trigger
	 *
	 * @param trigger - Invalidation trigger
	 */
	invalidate(_trigger: InvalidationTrigger): void {
		// For simplicity, clear all on any trigger
		// A more sophisticated implementation would track triggers per entry
		this.cache.clear();
	}

	/**
	 * Clear all cached entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; hitRate: number } {
		return {
			size: this.cache.size,
			hitRate: 0, // Would need tracking for real hit rate
		};
	}

	/**
	 * Check if key exists and is valid
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return false;
		}
		return true;
	}

	/**
	 * Prune expired entries
	 */
	prune(): number {
		const now = Date.now();
		let pruned = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
				pruned++;
			}
		}

		return pruned;
	}
}

/**
 * Build complete cache key inputs from context
 *
 * @param candidates - Artifact candidates
 * @param constraints - Composer constraints
 * @param budgetConfig - Budget configuration
 * @param context - Additional context
 * @returns Complete cache key inputs
 */
export function buildCacheKeyInputs(
	candidates: ArtifactCandidate[],
	constraints: ComposerConstraints,
	budgetConfig: Record<string, unknown>,
	context: {
		workspaceFingerprint: string;
		triggerEvent: string;
		commitish: string;
		rulesDigest: string;
	},
): CacheKeyInputs {
	return {
		workspaceFingerprint: context.workspaceFingerprint,
		triggerEvent: context.triggerEvent,
		commitish: context.commitish,
		candidateDigest: computeCandidateDigest(candidates),
		rulesDigest: context.rulesDigest,
		budgetConfigDigest: computeBudgetConfigDigest(budgetConfig),
		constraintsDigest: computeConstraintsDigest(constraints),
		composerVersion: COMPOSER_VERSION,
	};
}
