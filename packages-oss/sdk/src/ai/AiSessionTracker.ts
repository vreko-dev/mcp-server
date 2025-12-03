/**
 * @fileoverview AiSessionTracker - Session-level AI usage classification
 *
 * Classifies AI assistance level based on:
 * - Environment detection (provider presence)
 * - Change patterns (large inserts, total volume)
 *
 * Key principles:
 * - Truth-first: never claims "AI wrote this code"
 * - Confidence capping: inference-only scenarios capped at 7.5
 * - Anti-paste guard: single huge insert ≠ heavy AI usage
 */

import type { SimpleChangeTracker } from "./SimpleChangeTracker";

export type { ChangeEvent, ChangeMetrics } from "./SimpleChangeTracker";
export { SimpleChangeTracker } from "./SimpleChangeTracker";

export type AiAssistLevel = "none" | "light" | "medium" | "heavy" | "unknown";

export interface AiEnvDetection {
	provider: "cursor" | "claude" | "none" | "unknown";
	hasAI: boolean;
	confidence: number;
}

export interface AiSessionResult {
	level: AiAssistLevel;
	confidence: number;
	provider: AiEnvDetection["provider"];
	reasoning: string;
	metrics: ReturnType<SimpleChangeTracker["snapshot"]>;
}

/**
 * Classification thresholds
 */
const THRESHOLDS = {
	// Light: 1 large insert with modest total chars
	light: {
		minLargeInserts: 1,
		maxTotalChars: 800,
	},
	// Medium: 2+ large inserts OR higher volume
	medium: {
		minLargeInserts: 2,
		minTotalChars: 400,
	},
	// Heavy: 3+ large inserts AND high total volume
	heavy: {
		minLargeInserts: 3,
		minTotalChars: 2000,
	},
	// Anti-paste guard: if only 1 large insert, cap at medium regardless of size
	maxLargeInsertsForSinglePaste: 1,
} as const;

/**
 * Confidence caps
 */
const CONFIDENCE = {
	unknown: 0,
	noneWithNoProvider: 8.5,
	noneWithProvider: 7.5,
	inferenceOnlyCap: 7.5, // When classification is based only on patterns, not provider
	withProvider: 9,
} as const;

export class AiSessionTracker {
	private sessionId: string | null = null;

	constructor(
		private readonly detectEnv: () => AiEnvDetection,
		private readonly changeTracker: SimpleChangeTracker,
		private isEnabled = true,
	) {}

	/**
	 * Starts a new session
	 */
	startSession(sessionId: string): void {
		this.sessionId = sessionId;
	}

	/**
	 * Records a change event
	 */
	recordChange(event: import("./SimpleChangeTracker").ChangeEvent): void {
		if (!this.isEnabled) {
			return; // Silent no-op when disabled
		}
		this.changeTracker.recordChange(event);
	}

	/**
	 * Finalizes the session and returns classification result
	 */
	finalizeSession(): AiSessionResult {
		// Early guard: disabled takes priority
		if (!this.isEnabled) {
			return {
				level: "unknown",
				confidence: 0,
				provider: "none",
				reasoning: "AI detection disabled",
				metrics: this.changeTracker.snapshot(),
			};
		}

		if (!this.sessionId) {
			return {
				level: "unknown",
				confidence: CONFIDENCE.unknown,
				provider: "none",
				reasoning: "No session started",
				metrics: this.changeTracker.snapshot(),
			};
		}

		// Capture environment detection at finalization time
		const provider = this.detectEnv();

		const metrics = this.changeTracker.snapshot();
		const level = this.classifyLevel(metrics, provider);
		const confidence = this.calculateConfidence(level, provider, metrics);
		const reasoning = this.generateReasoning(level, provider, metrics);

		return {
			level,
			confidence,
			provider: provider.provider,
			reasoning,
			metrics,
		};
	}

	/**
	 * Resets session state
	 */
	reset(): void {
		this.sessionId = null;
		this.changeTracker.reset();
	}

	private classifyLevel(
		metrics: ReturnType<SimpleChangeTracker["snapshot"]>,
		_provider: AiEnvDetection,
	): AiAssistLevel {
		const { largeInsertCount, totalChars } = metrics;

		// No large inserts → none (regardless of provider)
		if (largeInsertCount === 0) {
			return "none";
		}

		// Anti-paste guard: single large insert (even if huge) → max medium
		if (largeInsertCount === THRESHOLDS.maxLargeInsertsForSinglePaste) {
			// If it's a modest insert, classify as light
			if (totalChars <= THRESHOLDS.light.maxTotalChars) {
				return "light";
			}
			// Otherwise medium (never heavy for single insert)
			return "medium";
		}

		// Heavy: multiple large inserts + high volume
		if (largeInsertCount >= THRESHOLDS.heavy.minLargeInserts && totalChars >= THRESHOLDS.heavy.minTotalChars) {
			return "heavy";
		}

		// Medium: 2+ large inserts OR significant volume
		if (largeInsertCount >= THRESHOLDS.medium.minLargeInserts || totalChars >= THRESHOLDS.medium.minTotalChars) {
			return "medium";
		}

		// Light: has large inserts but below medium threshold
		return "light";
	}

	/**
	 * Calculates confidence score based on signals available
	 */
	private calculateConfidence(
		level: AiAssistLevel,
		provider: AiEnvDetection,
		_metrics: ReturnType<SimpleChangeTracker["snapshot"]>,
	): number {
		if (level === "unknown") {
			return CONFIDENCE.unknown;
		}

		if (level === "none") {
			return provider.hasAI ? CONFIDENCE.noneWithProvider : CONFIDENCE.noneWithNoProvider;
		}

		// For non-none classifications based on patterns:
		// If we have a known provider, use higher confidence
		if (provider.hasAI && provider.provider !== "unknown" && provider.provider !== "none") {
			// Still cap below absolute certainty since we're inferring usage from patterns
			return Math.min(provider.confidence, CONFIDENCE.inferenceOnlyCap);
		}

		// No provider or unknown provider → cap at inference-only level
		return CONFIDENCE.inferenceOnlyCap;
	}

	/**
	 * Generates human-readable reasoning
	 */
	private generateReasoning(
		level: AiAssistLevel,
		provider: AiEnvDetection,
		metrics: ReturnType<SimpleChangeTracker["snapshot"]>,
	): string {
		if (level === "unknown") {
			return "No session started";
		}

		const providerName =
			provider.provider === "cursor" ? "Cursor" : provider.provider === "claude" ? "Claude" : null;

		if (level === "none") {
			if (providerName) {
				return `${providerName} detected but no large inserts observed`;
			}
			return "No AI provider detected, no large inserts";
		}

		// For non-none levels, build reasoning
		const parts: string[] = [];

		// Provider context
		if (providerName) {
			parts.push(`${providerName} detected`);
		} else if (provider.provider === "unknown") {
			parts.push("No AI provider detected");
		}

		// Pattern description
		const { largeInsertCount, totalChars } = metrics;

		if (largeInsertCount === 1) {
			parts.push("single large insert");
		} else {
			parts.push(`${largeInsertCount} large inserts`);
		}

		parts.push(`(${totalChars} chars total)`);

		// Level-specific suffix
		if (level === "heavy") {
			parts.push("- heavy AI-like usage inferred from change patterns");
		} else if (level === "medium") {
			parts.push("- multiple large inserts inferred from change patterns");
		} else {
			parts.push("- inferred from change patterns");
		}

		return parts.join(", ");
	}
}
