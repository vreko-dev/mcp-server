/**
 * PatternLookup - Phase 4 Feature
 * Provides intelligent pattern discovery for specific code scenarios.
 */

import path from "node:path";
import { loadJsonl } from "../storage/index.js";
import type { ResolvedConfig } from "../types/config.js";
import type { Learning, Violation } from "../types/learning.js";

export interface PatternMatch {
	/** Pattern or learning that matched */
	content: Learning | Violation;
	/** Match relevance score (0-1) */
	relevance: number;
	/** Reason for match */
	reason: string;
	/** Additional context */
	context: {
		type: "pattern" | "learning" | "violation";
		keywords: string[];
		relatedFiles?: string[];
	};
}

export class PatternLookup {
	private config: ResolvedConfig;
	private learningsCache: Learning[] | null = null;
	private violationsCache: Violation[] | null = null;

	constructor(config: ResolvedConfig) {
		this.config = config;
	}

	/**
	 * Find patterns by scenario, file, or problem
	 */
	lookup(query: "scenario" | "file" | "problem", value: string, extra?: string | string[]): PatternMatch[] {
		const keywords =
			query === "scenario"
				? (extra as string[]) || []
				: query === "file"
					? this.extractFileKeywords(value)
					: (value
							.toLowerCase()
							.split(/\s+/)
							.filter((w) => w.length > 2) as string[]);

		return this.scoreAndFilter(value, keywords, extra as string | undefined);
	}

	/**
	 * Extract keywords from file path
	 */
	private extractFileKeywords(filePath: string): string[] {
		const ext = path.extname(filePath).slice(1);
		const dirs = path
			.dirname(filePath)
			.split("/")
			.filter((p) => p && !p.startsWith("."));
		const name = path.basename(filePath).split(".")[0];
		return [ext, ...dirs, name].filter(Boolean);
	}

	/**
	 * Score, filter, and return top matches
	 */
	private scoreAndFilter(scenario: string, keywords: string[], fileContext?: string): PatternMatch[] {
		const results: PatternMatch[] = [];
		const searchText = scenario.toLowerCase();

		for (const learning of this.loadLearnings()) {
			const score = this.scoreMatch(learning, searchText, keywords, fileContext);
			if (score > 0.3) {
				results.push({
					content: learning,
					relevance: score,
					reason: `Learning relevant to ${scenario}`,
					context: {
						type: "learning",
						keywords: Array.isArray(learning.trigger) ? learning.trigger : [learning.trigger],
					},
				});
			}
		}

		for (const violation of this.loadViolations()) {
			const score = this.scoreMatch(violation, searchText, keywords, fileContext);
			if (score > 0.3) {
				results.push({
					content: violation,
					relevance: score,
					reason: `Similar pattern detected in ${violation.file}`,
					context: {
						type: "violation",
						keywords: [violation.type],
						relatedFiles: [violation.file],
					},
				});
			}
		}

		return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
	}

	/**
	 * Score relevance of a pattern match
	 */
	private scoreMatch(item: Learning | Violation, scenario: string, keywords: string[], fileContext?: string): number {
		const searchText = this.extractSearchText(item).toLowerCase();

		const scenarioMatch = searchText.includes(scenario) ? 40 : this.countOverlap(scenario, searchText) * 20;
		const keywordMatch =
			(keywords.filter((kw) => searchText.includes(kw.toLowerCase())).length / Math.max(keywords.length, 1)) * 40;
		const fileMatch = fileContext && "file" in item && item.file.includes(fileContext) ? 20 : 0;

		return Math.min((scenarioMatch + keywordMatch + fileMatch) / 100, 1);
	}

	/**
	 * Count token overlap between texts
	 */
	private countOverlap(text1: string, text2: string): number {
		const tokens1 = new Set(text1.split(/\s+/));
		const tokens2 = new Set(text2.split(/\s+/));
		const overlap = [...tokens1].filter((t) => tokens2.has(t)).length;
		return overlap > 0 ? 1 : 0;
	}

	/**
	 * Extract searchable text from learning or violation
	 */
	private extractSearchText(item: Learning | Violation): string {
		if ("action" in item) {
			const triggers = Array.isArray(item.trigger) ? item.trigger.join(" ") : item.trigger;
			return `${triggers} ${item.action} ${item.solution || ""} ${item.context || ""}`;
		}
		return `${item.type} ${item.whatHappened} ${item.whyItHappened} ${item.prevention}`;
	}

	/**
	 * Load learnings (with caching)
	 */
	private loadLearnings(): Learning[] {
		if (!this.learningsCache) {
			const learningsPath = path.join(this.config.rootDir, this.config.learningsDir, "learnings.jsonl");
			this.learningsCache = loadJsonl<Learning>(learningsPath);
		}
		return this.learningsCache;
	}

	/**
	 * Load violations (with caching)
	 */
	private loadViolations(): Violation[] {
		if (!this.violationsCache) {
			const violationsPath = path.join(this.config.rootDir, this.config.violationsFile);
			this.violationsCache = loadJsonl<Violation>(violationsPath);
		}
		return this.violationsCache;
	}

	clearCache(): void {
		this.learningsCache = null;
		this.violationsCache = null;
	}
}
