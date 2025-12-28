/**
 * TieredLearningService - Tiered learning storage for token efficiency
 *
 * Implements three-tier architecture:
 * - Hot: Always loaded (~10-15 entries, critical patterns)
 * - Warm: Loaded based on intent/domain match (~20-30 per domain)
 * - Cold: Query-only, never auto-loaded (archived learnings)
 *
 * Fixes 97% token waste in learning retrieval by loading only relevant
 * learnings based on task intent instead of loading all ~100+ entries.
 *
 * Storage:
 * - .snapback/learnings/hot.jsonl (always loaded)
 * - .snapback/learnings/architecture-patterns.jsonl (intent: implement)
 * - .snapback/learnings/domain-testing.jsonl (intent: debug, review)
 * - .snapback/learnings/anti-patterns.jsonl (intent: debug, review)
 * - .snapback/learnings/workflow-patterns.jsonl (intent: refactor)
 * - .snapback/learnings/learnings.jsonl (cold tier - query only)
 *
 * @module services/tiered-learning-service
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Learning, LearningTier } from "@snapback/intelligence/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Task intent for domain file mapping
 */
export type TaskIntent = "implement" | "debug" | "refactor" | "review" | "explore";

/**
 * Options for loading tiered learnings
 */
export interface LoadTieredLearningsOptions {
	/** Task intent for domain file selection */
	intent: TaskIntent | string;
	/** Keywords for relevance scoring */
	keywords: string[];
	/** Maximum learnings to return (default: 10) */
	maxLearnings?: number;
}

/**
 * Scored learning with relevance metadata
 */
export interface ScoredLearning extends Learning {
	/** Relevance score (0-1) */
	score: number;
	/** How the learning was loaded */
	loadedFrom: "hot" | "warm" | "cold";
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Intent → Domain file mapping
 *
 * Based on INDEX.md domain signals and task intent.
 * Each intent loads specific domain files from warm tier.
 */
export const INTENT_LEARNING_FILES: Record<TaskIntent, string[]> = {
	implement: ["architecture-patterns.jsonl", "domain-intelligence.jsonl", "architecture-context.jsonl"],
	debug: ["anti-patterns.jsonl", "domain-testing.jsonl"],
	refactor: ["workflow-patterns.jsonl", "architecture-context.jsonl"],
	review: ["anti-patterns.jsonl", "domain-testing.jsonl"],
	explore: ["architecture-context.jsonl"],
};

/** Default domain files when intent is unknown */
const DEFAULT_DOMAIN_FILES = ["architecture-patterns.jsonl"];

/** Hot tier file (always loaded) */
const HOT_TIER_FILE = "hot.jsonl";

/** Cold tier file (never auto-loaded) */
const COLD_TIER_FILE = "learnings.jsonl";

/** Maximum default learnings to return */
const DEFAULT_MAX_LEARNINGS = 10;

/** Priority score boost for hot tier - exported for test visibility */
export const HOT_TIER_BOOST = 100;

/** Priority score boost for critical priority */
const CRITICAL_PRIORITY_BOOST = 50;

/** Priority score boost for high priority */
const HIGH_PRIORITY_BOOST = 25;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Load JSONL file, skipping malformed lines
 */
function loadJsonlSafe<T>(filepath: string): T[] {
	if (!existsSync(filepath)) {
		return [];
	}

	try {
		const content = readFileSync(filepath, "utf8");
		const lines = content.split("\n").filter(Boolean);
		const items: T[] = [];

		for (const line of lines) {
			try {
				items.push(JSON.parse(line));
			} catch {
				// Skip malformed lines silently
			}
		}

		return items;
	} catch {
		return [];
	}
}

/**
 * Score a learning based on keyword relevance
 */
function scoreLearning(learning: Learning, keywords: string[]): number {
	if (keywords.length === 0) {
		return 0;
	}

	const triggerText = Array.isArray(learning.trigger) ? learning.trigger.join(" ") : learning.trigger || "";

	const searchText = `${triggerText} ${learning.action || ""} ${learning.context || ""}`.toLowerCase();

	let matches = 0;
	for (const keyword of keywords) {
		if (searchText.includes(keyword.toLowerCase())) {
			matches++;
		}
	}

	return matches / keywords.length;
}

/**
 * Get priority boost based on learning priority
 */
function getPriorityBoost(learning: Learning): number {
	const priority = (learning as any).priority;
	if (priority === "critical") return CRITICAL_PRIORITY_BOOST;
	if (priority === "high") return HIGH_PRIORITY_BOOST;
	return 0;
}

// =============================================================================
// TieredLearningService
// =============================================================================

export class TieredLearningService {
	private workspaceRoot: string;
	private learningsDir: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.learningsDir = join(workspaceRoot, ".snapback", "learnings");
	}

	/**
	 * Load learnings from tiered storage based on intent
	 *
	 * @param options - Loading options (intent, keywords, maxLearnings)
	 * @returns Scored and ranked learnings
	 */
	async loadTieredLearnings(options: LoadTieredLearningsOptions): Promise<ScoredLearning[]> {
		const { intent, keywords, maxLearnings = DEFAULT_MAX_LEARNINGS } = options;

		// Track loaded learnings by ID for deduplication
		const loadedIds = new Set<string>();
		const allLearnings: ScoredLearning[] = [];

		// 1. ALWAYS load hot tier
		const hotLearnings = this.loadHotTier();
		for (const learning of hotLearnings) {
			const id = learning.id || this.generateId(learning);
			if (!loadedIds.has(id)) {
				loadedIds.add(id);
				allLearnings.push({
					...learning,
					score: scoreLearning(learning, keywords) + HOT_TIER_BOOST + getPriorityBoost(learning),
					loadedFrom: "hot",
				});
			}
		}

		// 2. Load warm tier based on intent
		const warmLearnings = this.loadWarmTier(intent as TaskIntent);
		for (const learning of warmLearnings) {
			const id = learning.id || this.generateId(learning);
			if (!loadedIds.has(id)) {
				loadedIds.add(id);
				allLearnings.push({
					...learning,
					score: scoreLearning(learning, keywords) + getPriorityBoost(learning),
					loadedFrom: "warm",
				});
			}
		}

		// 3. DO NOT auto-load cold tier (learnings.jsonl)
		// Cold tier is only accessible via explicit query

		// 4. Sort by score (descending) and return top N
		return allLearnings.sort((a, b) => b.score - a.score).slice(0, maxLearnings);
	}

	/**
	 * Load hot tier learnings (always loaded)
	 */
	private loadHotTier(): Learning[] {
		const hotPath = join(this.learningsDir, HOT_TIER_FILE);
		const learnings = loadJsonlSafe<Learning>(hotPath);

		// Mark as hot tier
		return learnings.map((l) => ({ ...l, tier: "hot" as LearningTier }));
	}

	/**
	 * Load warm tier learnings based on intent
	 */
	private loadWarmTier(intent: TaskIntent): Learning[] {
		const domainFiles = INTENT_LEARNING_FILES[intent] || DEFAULT_DOMAIN_FILES;
		const learnings: Learning[] = [];

		for (const filename of domainFiles) {
			const filepath = join(this.learningsDir, filename);
			const domainLearnings = loadJsonlSafe<Learning>(filepath);

			// Extract domain from filename (e.g., "domain-testing.jsonl" -> "testing")
			const domain = filename.replace(/^domain-/, "").replace(/\.jsonl$/, "");

			for (const learning of domainLearnings) {
				learnings.push({
					...learning,
					tier: "warm" as LearningTier,
					domain,
				});
			}
		}

		return learnings;
	}

	/**
	 * Query cold tier for specific keywords (on-demand only)
	 *
	 * This method is NOT called by loadTieredLearnings.
	 * Use it explicitly when searching archived learnings.
	 */
	async queryColdTier(keywords: string[], maxResults = 10): Promise<ScoredLearning[]> {
		const coldPath = join(this.learningsDir, COLD_TIER_FILE);
		const learnings = loadJsonlSafe<Learning>(coldPath);

		const scored: ScoredLearning[] = learnings
			.filter((l) => (l as any).tier === "cold" || !(l as any).tier)
			.map((l) => ({
				...l,
				score: scoreLearning(l, keywords),
				loadedFrom: "cold" as const,
				tier: "cold" as LearningTier,
			}));

		return scored
			.filter((l) => l.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, maxResults);
	}

	/**
	 * Generate a deterministic ID for learnings without one
	 */
	private generateId(learning: Learning): string {
		const trigger = Array.isArray(learning.trigger) ? learning.trigger.join("-") : learning.trigger || "";
		return `${learning.type}-${trigger.slice(0, 20)}`.replace(/\s+/g, "-").toLowerCase();
	}

	/**
	 * Clear any cached data
	 */
	clearCache(): void {
		// Currently no caching, but interface for future optimization
	}
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a TieredLearningService instance
 *
 * Factory function following codebase service patterns.
 * Use this for consistent service instantiation.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns TieredLearningService instance
 *
 * @example
 * const service = createTieredLearningService('/path/to/workspace');
 * const learnings = await service.loadTieredLearnings({ intent: 'implement', keywords: ['auth'] });
 */
export function createTieredLearningService(workspaceRoot: string): TieredLearningService {
	return new TieredLearningService(workspaceRoot);
}
