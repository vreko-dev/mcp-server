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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Learning, LearningTier } from "@snapback/intelligence/types";

// =============================================================================
// Usage Tracking Types
// =============================================================================

/**
 * Learning with usage tracking metadata
 */
export interface TrackedLearning extends Learning {
	/** Number of times this learning was loaded */
	accessCount?: number;
	/** Number of times this learning was applied/useful */
	appliedCount?: number;
	/** Last time this learning was accessed */
	lastAccessed?: string;
	/** When this learning was promoted to hot tier */
	promotedAt?: string;
}

/**
 * Usage stats file format
 */
interface UsageStats {
	[learningId: string]: {
		accessCount: number;
		appliedCount: number;
		lastAccessed: string;
	};
}

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
	/** Keywords for relevance scoring and domain detection */
	keywords: string[];
	/** File paths for domain detection (e.g., apps/vscode/... → domain-vscode) */
	filePaths?: string[];
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
 *
 * Updated: Now includes all domain files for comprehensive coverage.
 * Domain-specific files are also loaded via keyword detection below.
 */
export const INTENT_LEARNING_FILES: Record<TaskIntent, string[]> = {
	implement: [
		"architecture-patterns.jsonl",
		"architecture-context.jsonl",
		"domain-intelligence.jsonl",
		// Domain files loaded via keyword detection, but include common ones
	],
	debug: [
		"anti-patterns.jsonl",
		"domain-testing.jsonl",
		"architecture-patterns.jsonl", // Errors often violate patterns
	],
	refactor: [
		"workflow-patterns.jsonl",
		"architecture-context.jsonl",
		"anti-patterns.jsonl", // Avoid known pitfalls during refactor
	],
	review: ["anti-patterns.jsonl", "domain-testing.jsonl", "architecture-patterns.jsonl"],
	explore: ["architecture-context.jsonl", "workflow-patterns.jsonl"],
};

// =============================================================================
// Keyword → Domain File Detection
// Based on INDEX.md domain signals for dynamic domain loading
// =============================================================================

/**
 * Keyword to domain file mapping
 * Implements the domain signals documented in .snapback/learnings/INDEX.md
 */
export const KEYWORD_DOMAIN_MAP: Record<string, string> = {
	// VSCode Extension domain
	vscode: "domain-vscode.jsonl",
	extension: "domain-vscode.jsonl",
	activation: "domain-vscode.jsonl",
	webview: "domain-vscode.jsonl",
	"vs code": "domain-vscode.jsonl",

	// Web/Next.js domain
	nextjs: "domain-web.jsonl",
	"next.js": "domain-web.jsonl",
	next: "domain-web.jsonl",
	react: "domain-web.jsonl",
	client: "domain-web.jsonl",
	turbopack: "domain-web.jsonl",
	"use client": "domain-web.jsonl",
	biome: "domain-web.jsonl",

	// API/Backend domain
	api: "domain-api.jsonl",
	procedure: "domain-api.jsonl",
	orpc: "domain-api.jsonl",
	service: "domain-api.jsonl",
	backend: "domain-api.jsonl",
	drizzle: "domain-api.jsonl",

	// MCP/CLI domain
	mcp: "domain-mcp-cli.jsonl",
	cli: "domain-mcp-cli.jsonl",
	commander: "domain-mcp-cli.jsonl",
	"model context protocol": "domain-mcp-cli.jsonl",
	stdio: "domain-mcp-cli.jsonl",

	// Testing domain
	vitest: "domain-testing.jsonl",
	test: "domain-testing.jsonl",
	testing: "domain-testing.jsonl",
	coverage: "domain-testing.jsonl",
	spec: "domain-testing.jsonl",
	mock: "domain-testing.jsonl",

	// Intelligence domain
	validation: "domain-intelligence.jsonl",
	learning: "domain-intelligence.jsonl",
	vitals: "domain-intelligence.jsonl",
	intelligence: "domain-intelligence.jsonl",
	advisory: "domain-intelligence.jsonl",
};

/**
 * File path patterns to domain file mapping
 * Detects domain from file paths in task
 */
const FILE_PATH_DOMAIN_MAP: Record<string, string> = {
	"apps/vscode": "domain-vscode.jsonl",
	"apps/web": "domain-web.jsonl",
	"apps/api": "domain-api.jsonl",
	"packages/mcp": "domain-mcp-cli.jsonl",
	"packages/cli": "domain-mcp-cli.jsonl",
	"packages/intelligence": "domain-intelligence.jsonl",
	".test.": "domain-testing.jsonl",
	".spec.": "domain-testing.jsonl",
	__tests__: "domain-testing.jsonl",
};

/**
 * Detect domain files from keywords
 * @param keywords - Keywords extracted from task description
 * @returns Array of domain file names to load
 */
export function detectDomainFilesFromKeywords(keywords: string[]): string[] {
	const detected = new Set<string>();

	for (const keyword of keywords) {
		const lowerKeyword = keyword.toLowerCase();

		// Direct match
		if (KEYWORD_DOMAIN_MAP[lowerKeyword]) {
			detected.add(KEYWORD_DOMAIN_MAP[lowerKeyword]);
			continue;
		}

		// Partial match (e.g., "vscode-extension" contains "vscode")
		for (const [key, domain] of Object.entries(KEYWORD_DOMAIN_MAP)) {
			if (lowerKeyword.includes(key) || key.includes(lowerKeyword)) {
				detected.add(domain);
			}
		}
	}

	return [...detected];
}

/**
 * Detect domain files from file paths
 * @param filePaths - File paths from task
 * @returns Array of domain file names to load
 */
export function detectDomainFilesFromPaths(filePaths: string[]): string[] {
	const detected = new Set<string>();

	for (const filePath of filePaths) {
		for (const [pattern, domain] of Object.entries(FILE_PATH_DOMAIN_MAP)) {
			if (filePath.includes(pattern)) {
				detected.add(domain);
			}
		}
	}

	return [...detected];
}

/** Default domain files when intent is unknown */
const DEFAULT_DOMAIN_FILES = ["architecture-patterns.jsonl"];

/** Hot tier file (always loaded) */
const HOT_TIER_FILE = "hot.jsonl";

/** Cold tier file (never auto-loaded) */
const COLD_TIER_FILE = "learnings.jsonl";

/** Maximum default learnings to return */
const DEFAULT_MAX_LEARNINGS = 10;

/** Usage stats file */
const USAGE_STATS_FILE = "usage-stats.json";

/** Threshold for auto-promotion to hot tier */
export const HOT_TIER_PROMOTION_THRESHOLD = {
	/** Minimum access count to be considered for promotion */
	minAccessCount: 3,
	/** Minimum applied count (higher weight) */
	minAppliedCount: 1,
	/** Maximum hot tier size */
	maxHotTierSize: 20,
	/** Recency weight - more recent = higher score */
	recencyDays: 14,
};

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
	if (priority === "critical") {
		return CRITICAL_PRIORITY_BOOST;
	}
	if (priority === "high") {
		return HIGH_PRIORITY_BOOST;
	}
	return 0;
}

// =============================================================================
// TieredLearningService
// =============================================================================

export class TieredLearningService {
	private learningsDir: string;

	constructor(workspaceRoot: string) {
		this.learningsDir = join(workspaceRoot, ".snapback", "learnings");
	}

	/**
	 * Load learnings from tiered storage based on intent
	 *
	 * @param options - Loading options (intent, keywords, maxLearnings)
	 * @returns Scored and ranked learnings
	 */
	async loadTieredLearnings(options: LoadTieredLearningsOptions): Promise<ScoredLearning[]> {
		const { intent, keywords, filePaths = [], maxLearnings = DEFAULT_MAX_LEARNINGS } = options;

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
		const intentFiles = INTENT_LEARNING_FILES[intent as TaskIntent] || DEFAULT_DOMAIN_FILES;

		// 3. Detect additional domain files from keywords (NEW)
		const keywordDomainFiles = detectDomainFilesFromKeywords(keywords);

		// 4. Detect additional domain files from file paths (NEW)
		const pathDomainFiles = detectDomainFilesFromPaths(filePaths);

		// 5. Combine all warm tier files (dedupe)
		const allWarmFiles = [...new Set([...intentFiles, ...keywordDomainFiles, ...pathDomainFiles])];

		// 6. Load learnings from all warm tier files
		for (const filename of allWarmFiles) {
			const filepath = join(this.learningsDir, filename);
			const domainLearnings = loadJsonlSafe<Learning>(filepath);

			// Extract domain from filename
			const domain = filename.replace(/^domain-/, "").replace(/\.jsonl$/, "");

			for (const learning of domainLearnings) {
				const id = learning.id || this.generateId(learning);
				if (!loadedIds.has(id)) {
					loadedIds.add(id);
					allLearnings.push({
						...learning,
						score: scoreLearning(learning, keywords) + getPriorityBoost(learning),
						loadedFrom: "warm",
						tier: "warm" as LearningTier,
						domain,
					});
				}
			}
		}

		// 7. DO NOT auto-load cold tier (learnings.jsonl)
		// Cold tier is only accessible via explicit query

		// 8. Sort by score (descending) and return top N
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

	// =========================================================================
	// Usage Tracking Methods
	// =========================================================================

	/**
	 * Load usage stats from disk
	 */
	private loadUsageStats(): UsageStats {
		const statsPath = join(this.learningsDir, USAGE_STATS_FILE);
		if (!existsSync(statsPath)) {
			return {};
		}
		try {
			return JSON.parse(readFileSync(statsPath, "utf8"));
		} catch {
			return {};
		}
	}

	/**
	 * Save usage stats to disk
	 */
	private saveUsageStats(stats: UsageStats): void {
		const statsPath = join(this.learningsDir, USAGE_STATS_FILE);
		try {
			mkdirSync(this.learningsDir, { recursive: true });
			writeFileSync(statsPath, JSON.stringify(stats, null, 2));
		} catch {
			// Best effort - don't fail if can't write
		}
	}

	/**
	 * Track that a learning was accessed (loaded for context)
	 */
	trackAccess(learningIds: string[]): void {
		const stats = this.loadUsageStats();
		const now = new Date().toISOString();

		for (const id of learningIds) {
			if (!stats[id]) {
				stats[id] = { accessCount: 0, appliedCount: 0, lastAccessed: now };
			}
			stats[id].accessCount++;
			stats[id].lastAccessed = now;
		}

		this.saveUsageStats(stats);
	}

	/**
	 * Track that a learning was applied (marked as useful by user/agent)
	 */
	trackApplied(learningId: string): void {
		const stats = this.loadUsageStats();
		const now = new Date().toISOString();

		if (!stats[learningId]) {
			stats[learningId] = { accessCount: 1, appliedCount: 0, lastAccessed: now };
		}
		stats[learningId].appliedCount++;
		stats[learningId].lastAccessed = now;

		this.saveUsageStats(stats);
	}

	/**
	 * Calculate promotion score for a learning
	 * Higher score = more likely to be promoted to hot tier
	 */
	private calculatePromotionScore(learning: TrackedLearning, stats: UsageStats): number {
		const id = learning.id || this.generateId(learning);
		const usageData = stats[id];

		if (!usageData) {
			return 0;
		}

		// Base score from counts (applied counts weight 3x more than access)
		let score = usageData.accessCount + usageData.appliedCount * 3;

		// Recency boost - more recent = higher score
		const lastAccessed = new Date(usageData.lastAccessed);
		const daysSinceAccess = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
		if (daysSinceAccess < HOT_TIER_PROMOTION_THRESHOLD.recencyDays) {
			score *= 1 + (1 - daysSinceAccess / HOT_TIER_PROMOTION_THRESHOLD.recencyDays);
		}

		// Priority boost
		if ((learning as any).priority === "critical") {
			score *= 2;
		} else if ((learning as any).priority === "high") {
			score *= 1.5;
		}

		return score;
	}

	/**
	 * Regenerate hot.jsonl based on usage patterns
	 *
	 * Algorithm:
	 * 1. Load all learnings from cold + warm tiers
	 * 2. Score each by usage patterns (access, applied, recency)
	 * 3. Preserve existing hot tier entries with priority: critical
	 * 4. Fill remaining slots with highest-scoring learnings
	 * 5. Write new hot.jsonl
	 *
	 * @returns Statistics about the regeneration
	 */
	async regenerateHotTier(): Promise<{
		preserved: number;
		promoted: number;
		demoted: number;
		totalHot: number;
	}> {
		const stats = this.loadUsageStats();

		// Load current hot tier
		const currentHot = this.loadHotTier();
		const criticalHot = currentHot.filter((l) => (l as any).priority === "critical");

		// Load all learnings from cold tier
		const coldPath = join(this.learningsDir, COLD_TIER_FILE);
		const allLearnings = loadJsonlSafe<TrackedLearning>(coldPath);

		// Also load from warm tier files
		const warmFiles = Object.values(INTENT_LEARNING_FILES).flat();
		const seenIds = new Set<string>();
		const warmLearnings: TrackedLearning[] = [];

		for (const filename of [...new Set(warmFiles)]) {
			const filepath = join(this.learningsDir, filename);
			const learnings = loadJsonlSafe<TrackedLearning>(filepath);
			for (const l of learnings) {
				const id = l.id || this.generateId(l as Learning);
				if (!seenIds.has(id)) {
					seenIds.add(id);
					warmLearnings.push(l);
				}
			}
		}

		// Combine and dedupe
		const allCandidates = [...allLearnings, ...warmLearnings];
		const candidateMap = new Map<string, TrackedLearning>();
		for (const l of allCandidates) {
			const id = l.id || this.generateId(l as Learning);
			if (!candidateMap.has(id)) {
				candidateMap.set(id, l);
			}
		}

		// Score all candidates
		const scored = Array.from(candidateMap.entries())
			.map(([id, learning]) => ({
				id,
				learning,
				score: this.calculatePromotionScore(learning, stats),
			}))
			.filter((item) => {
				// Only consider learnings that meet minimum thresholds
				const usageData = stats[item.id];
				if (!usageData) {
					return false;
				}
				return (
					usageData.accessCount >= HOT_TIER_PROMOTION_THRESHOLD.minAccessCount ||
					usageData.appliedCount >= HOT_TIER_PROMOTION_THRESHOLD.minAppliedCount
				);
			})
			.sort((a, b) => b.score - a.score);

		// Build new hot tier
		const newHot: TrackedLearning[] = [];
		const criticalIds = new Set(criticalHot.map((l) => l.id || this.generateId(l)));

		// 1. Always preserve critical entries
		for (const l of criticalHot) {
			newHot.push({
				...l,
				tier: "hot" as LearningTier,
			});
		}

		// 2. Fill remaining slots with highest-scoring
		const _remainingSlots = HOT_TIER_PROMOTION_THRESHOLD.maxHotTierSize - newHot.length;
		let promoted = 0;

		for (const item of scored) {
			if (newHot.length >= HOT_TIER_PROMOTION_THRESHOLD.maxHotTierSize) {
				break;
			}
			if (criticalIds.has(item.id)) {
				continue; // Already added
			}

			newHot.push({
				...item.learning,
				tier: "hot" as LearningTier,
				promotedAt: new Date().toISOString(),
			});
			promoted++;
		}

		// Calculate demoted count
		const newHotIds = new Set(newHot.map((l) => l.id || this.generateId(l as Learning)));
		const demoted = currentHot.filter((l) => {
			const id = l.id || this.generateId(l);
			return !newHotIds.has(id);
		}).length;

		// Write new hot.jsonl
		const hotPath = join(this.learningsDir, HOT_TIER_FILE);
		const hotContent = `${newHot.map((l) => JSON.stringify(l)).join("\n")}\n`;
		writeFileSync(hotPath, hotContent);

		return {
			preserved: criticalHot.length,
			promoted,
			demoted,
			totalHot: newHot.length,
		};
	}

	/**
	 * Get usage statistics for analysis
	 */
	getUsageStats(): UsageStats {
		return this.loadUsageStats();
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
