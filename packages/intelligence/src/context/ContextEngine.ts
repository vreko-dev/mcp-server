/**
 * Context Engine
 *
 * Assembles relevant context for tasks from:
 * - Architecture documentation
 * - Constraints and rules
 * - Codebase patterns
 * - Recent violations
 * - Relevant learnings
 *
 * Uses keyword matching for fast retrieval.
 * Optional: semantic search when enableSemanticSearch is true.
 */

import * as path from "node:path";
import type { ConfigStore } from "../storage/ConfigStore.js";
import { loadJsonl } from "../storage/JsonlStore.js";
import type { ResolvedConfig } from "../types/config.js";
import type { ContextInput, ContextResult, Learning, Violation } from "../types/index.js";

/**
 * Context Engine for intelligent context assembly
 */
export class ContextEngine {
	private config: ResolvedConfig;
	private configStore: ConfigStore;
	private initialized = false;

	constructor(config: ResolvedConfig, configStore: ConfigStore) {
		this.config = config;
		this.configStore = configStore;
	}

	/**
	 * Initialize async resources (embeddings, database)
	 * Only needed when semantic search is enabled
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// For now, just mark as initialized
		// Semantic search initialization would go here
		this.initialized = true;
	}

	/**
	 * Get relevant context for a task
	 * Primary entry point - used before implementing anything
	 */
	async getContext(params: ContextInput): Promise<ContextResult> {
		const { task, files = [], keywords = [] } = params;

		// Extract keywords from task if none provided
		const effectiveKeywords = keywords.length > 0 ? keywords : this.extractKeywords(task);

		// Load context sections
		const architecture = this.configStore.loadArchitecture();
		const constraints = this.configStore.loadConstraints();
		const patterns = this.configStore.loadPatterns();

		// Filter to relevant sections
		const contextSections = this.filterRelevantSections([architecture, patterns].join("\n\n"), effectiveKeywords);

		// Get hard rules (always include)
		const hardRules = this.extractHardRules(constraints);

		// Load recent violations
		const recentViolations = this.getRecentViolations(effectiveKeywords, files);

		// Load relevant learnings
		const relevantLearnings = this.getRelevantLearnings(effectiveKeywords);

		return {
			task,
			contextSections,
			hardRules,
			patterns,
			recentViolations,
			relevantLearnings,
			hint: this.generateHint(recentViolations.length, relevantLearnings.length),
		};
	}

	/**
	 * Extract keywords from a task description
	 */
	private extractKeywords(task: string): string[] {
		const stopWords = new Set([
			"the",
			"a",
			"an",
			"is",
			"are",
			"was",
			"were",
			"be",
			"been",
			"being",
			"have",
			"has",
			"had",
			"do",
			"does",
			"did",
			"will",
			"would",
			"could",
			"should",
			"may",
			"might",
			"must",
			"shall",
			"can",
			"need",
			"to",
			"of",
			"in",
			"for",
			"on",
			"with",
			"at",
			"by",
			"from",
			"as",
			"into",
			"through",
			"during",
			"before",
			"after",
			"above",
			"below",
			"between",
			"under",
			"again",
			"further",
			"then",
			"once",
			"here",
			"there",
			"when",
			"where",
			"why",
			"how",
			"all",
			"each",
			"few",
			"more",
			"most",
			"other",
			"some",
			"such",
			"no",
			"nor",
			"not",
			"only",
			"own",
			"same",
			"so",
			"than",
			"too",
			"very",
			"just",
			"and",
			"but",
			"if",
			"or",
			"because",
			"until",
			"while",
			"this",
			"that",
			"these",
			"those",
			"i",
			"me",
			"my",
			"we",
			"our",
			"you",
			"your",
			"it",
			"its",
		]);

		return task
			.toLowerCase()
			.split(/\W+/)
			.filter((word) => word.length > 2 && !stopWords.has(word))
			.slice(0, 10);
	}

	/**
	 * Filter content to relevant sections based on keywords
	 */
	private filterRelevantSections(content: string, keywords: string[]): string {
		const sections = content.split(/(?=## )/);
		const lowerKeywords = keywords.map((k) => k.toLowerCase());

		const relevantSections = sections.filter((section) => {
			const lowerSection = section.toLowerCase();
			return lowerKeywords.some((kw) => lowerSection.includes(kw));
		});

		// If no relevant sections found, return first few sections as fallback
		if (relevantSections.length === 0) {
			return sections.slice(0, 3).join("\n");
		}

		return relevantSections.join("\n");
	}

	/**
	 * Extract hard rules from constraints
	 */
	private extractHardRules(constraints: string): string {
		// Find the "Hard Rules" section
		const hardRulesMatch = constraints.match(/## Hard Rules[\s\S]*?(?=## |$)/i);
		return hardRulesMatch ? hardRulesMatch[0] : "";
	}

	/**
	 * Get recent violations relevant to keywords/files
	 */
	private getRecentViolations(
		keywords: string[],
		files: string[],
	): Array<{ type: string; file: string; message: string; timestamp: string }> {
		const violationsPath = path.join(this.config.rootDir, this.config.violationsFile);
		const violations = loadJsonl<Violation>(violationsPath);

		const lowerKeywords = keywords.map((k) => k.toLowerCase());

		return violations
			.filter((v) => {
				// Match by file
				if (files.some((f) => v.file.includes(f))) {
					return true;
				}
				// Match by keyword in type or message
				const text = `${v.type} ${v.whatHappened}`.toLowerCase();
				return lowerKeywords.some((kw) => text.includes(kw));
			})
			.slice(-5)
			.map((v) => ({
				type: v.type,
				file: v.file,
				message: v.whatHappened,
				timestamp: v.timestamp,
			}));
	}

	/**
	 * Get learnings relevant to keywords
	 */
	private getRelevantLearnings(keywords: string[]): Array<{ trigger: string; action: string; type: string }> {
		const learningsPath = path.join(this.config.rootDir, this.config.learningsDir, "learnings.jsonl");
		const learnings = loadJsonl<Learning>(learningsPath);

		const lowerKeywords = keywords.map((k) => k.toLowerCase());

		return learnings
			.filter((l) => {
				const triggers = Array.isArray(l.trigger) ? l.trigger : [l.trigger];
				const text = [...triggers, l.action].join(" ").toLowerCase();
				return lowerKeywords.some((kw) => text.includes(kw));
			})
			.slice(-5)
			.map((l) => ({
				trigger: Array.isArray(l.trigger) ? l.trigger.join(", ") : l.trigger,
				action: l.action,
				type: l.type,
			}));
	}

	/**
	 * Generate a contextual hint based on findings
	 */
	private generateHint(violationCount: number, learningCount: number): string {
		if (violationCount > 0 && learningCount > 0) {
			return "Review violations and learnings before implementing. These are patterns learned from past mistakes.";
		}
		if (violationCount > 0) {
			return "Recent violations found for this area. Review before proceeding.";
		}
		if (learningCount > 0) {
			return "Relevant learnings found. Apply these patterns.";
		}
		return "No specific patterns found. Check CONSTRAINTS.md for rules.";
	}

	/**
	 * Dispose resources
	 */
	async dispose(): Promise<void> {
		// Clean up any resources (embeddings database, etc.)
		this.initialized = false;
	}
}
