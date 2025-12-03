/**
 * @fileoverview Session Tagger - Tags sessions based on AI presence and burst patterns
 *
 * This module provides utilities for automatically tagging sessions based on
 * detected AI assistants and burst patterns. This enables features like
 * automatic checkpointing for AI-assisted coding sessions.
 *
 * Migrated from apps/vscode to SDK for platform-wide reuse.
 */

import { THRESHOLDS } from "../../config/Thresholds.js";
import type { BurstDetectionResult } from "../detection/BurstHeuristicsDetector.js";
import type { SessionManifest } from "./types.js";

/**
 * Configuration for session tagging
 */
export interface SessionTaggerConfig {
	/** Minimum burst confidence to tag as AI-assisted */
	minBurstConfidence?: number;

	/** Minimum session duration to tag as long-session (ms) */
	minLongSessionDuration?: number;

	/** Maximum session duration to tag as short-session (ms) */
	maxShortSessionDuration?: number;

	/** Minimum lines added to tag as large-edits */
	minLargeEditLines?: number;

	/** Normalization constants for confidence calculations */
	normalization?: {
		/** File count threshold for multi-file tag */
		multiFileThreshold?: number;

		/** File count for normalizing multi-file confidence */
		multiFileNormalization?: number;

		/** Duration for normalizing long-session confidence (ms) */
		longSessionNormalization?: number;

		/** Line count for normalizing large-edits confidence */
		largeEditsNormalization?: number;
	};
}

/**
 * Default configuration for session tagging (uses centralized thresholds)
 */
const DEFAULT_CONFIG: Required<SessionTaggerConfig> = {
	minBurstConfidence: THRESHOLDS.tagging.minBurstConfidence,
	minLongSessionDuration: THRESHOLDS.tagging.minLongSessionDuration,
	maxShortSessionDuration: THRESHOLDS.tagging.maxShortSessionDuration,
	minLargeEditLines: THRESHOLDS.tagging.minLargeEditLines,
	normalization: {
		multiFileThreshold: THRESHOLDS.tagging.normalization.multiFileThreshold,
		multiFileNormalization: THRESHOLDS.tagging.normalization.multiFileNormalization,
		longSessionNormalization: THRESHOLDS.tagging.normalization.longSessionNormalization,
		largeEditsNormalization: THRESHOLDS.tagging.normalization.largeEditsNormalization,
	},
};

/**
 * Tags that can be applied to sessions
 */
export type SessionTag =
	| "ai-assisted" // Session involved AI assistance
	| "copilot-like" // Session shows patterns similar to GitHub Copilot
	| "claude-like" // Session shows patterns similar to Claude
	| "tabnine-like" // Session shows patterns similar to Tabnine
	| "codeium-like" // Session shows patterns similar to Codeium
	| "burst" // Session contained rapid, large insertions
	| "large-edits" // Session involved significant changes
	| "multi-file" // Session involved multiple files
	| "long-session" // Session lasted longer than typical
	| "short-session" // Session was unusually short
	| "git-commit" // Session ended with a git commit
	| "manual" // Session was manually finalized
	| "idle-break" // Session ended due to inactivity
	| string; // Allow custom tags

/**
 * Results of session tagging analysis
 */
export interface SessionTaggingResult {
	/** Tags to apply to the session */
	tags: SessionTag[];

	/** Confidence level for each tag (0-1) */
	confidence: Record<string, number>;

	/** Reasons for each tag */
	reasons: Record<string, string>;
}

/**
 * Information about AI presence
 */
export interface AIPresenceInfo {
	/** Whether AI assistants are present */
	hasAI: boolean;

	/** List of detected AI assistant identifiers */
	detectedAssistants: string[];

	/** Human-readable names for detected assistants */
	assistantDetails: Record<string, string>;
}

/**
 * Session tagger initialization options
 */
export interface SessionTaggerOptions {
	/** Optional AI presence detector function */
	aiPresenceDetector?: () => AIPresenceInfo;

	/** Optional configuration overrides */
	config?: SessionTaggerConfig;
}

/**
 * Tracks and tags sessions based on AI presence and burst patterns
 */
export class SessionTagger {
	private aiPresenceDetector?: () => AIPresenceInfo;
	private config: Required<SessionTaggerConfig>;

	/**
	 * Creates a new SessionTagger
	 *
	 * @param options Optional configuration and dependencies
	 */
	constructor(options?: SessionTaggerOptions) {
		this.aiPresenceDetector = options?.aiPresenceDetector;
		this.config = {
			...DEFAULT_CONFIG,
			...options?.config,
			normalization: {
				...DEFAULT_CONFIG.normalization,
				...options?.config?.normalization,
			},
		};
	}

	/**
	 * Analyzes a session and generates appropriate tags
	 *
	 * @param manifest Session manifest to analyze
	 * @param burstResult Optional burst detection result
	 * @returns Session tagging result with tags and confidence levels
	 */
	tagSession(manifest: SessionManifest, burstResult?: BurstDetectionResult): SessionTaggingResult {
		const tags: SessionTag[] = [...(manifest.tags || [])];
		const confidence: Record<string, number> = {};
		const reasons: Record<string, string> = {};

		// Tag based on finalization reason
		this.addReasonTags(manifest.reason, tags, confidence, reasons);

		// Tag based on file count
		const multiFileThreshold = this.config.normalization?.multiFileThreshold;
		if (multiFileThreshold && manifest.files.length > multiFileThreshold) {
			tags.push("multi-file");
			confidence["multi-file"] = Math.min(
				1.0,
				manifest.files.length / (this.config.normalization?.multiFileNormalization || 1),
			);
			reasons["multi-file"] = `Session involved ${manifest.files.length} files`;
		}

		// Tag based on session duration
		const duration = manifest.endedAt - manifest.startedAt;
		if (duration > this.config.minLongSessionDuration) {
			tags.push("long-session");
			confidence["long-session"] = Math.min(
				1.0,
				duration / (this.config.normalization?.longSessionNormalization || 1),
			);
			reasons["long-session"] = `Session lasted ${Math.round(duration / 60000)} minutes`;
		} else if (duration < this.config.maxShortSessionDuration) {
			tags.push("short-session");
			confidence["short-session"] = Math.min(1.0, this.config.maxShortSessionDuration / duration);
			reasons["short-session"] = `Session lasted ${Math.round(duration / 1000)} seconds`;
		}

		// Tag based on change statistics
		const totalAdded = manifest.files.reduce((sum, file) => {
			return sum + (file.changeStats?.added || 0);
		}, 0);

		if (totalAdded > this.config.minLargeEditLines) {
			tags.push("large-edits");
			confidence["large-edits"] = Math.min(
				1.0,
				totalAdded / (this.config.normalization?.largeEditsNormalization || 1),
			);
			reasons["large-edits"] = `Session involved ${totalAdded} lines added`;
		}

		// Tag based on AI presence (if detector provided)
		if (this.aiPresenceDetector) {
			const aiPresence = this.aiPresenceDetector();
			if (aiPresence.hasAI) {
				tags.push("ai-assisted");
				confidence["ai-assisted"] = 0.9;
				reasons["ai-assisted"] = `AI assistants detected: ${aiPresence.detectedAssistants.join(", ")}`;

				// Add specific AI assistant tags
				for (const assistant of aiPresence.detectedAssistants) {
					// Convert assistant name to tag format (e.g., GITHUB_COPILOT -> copilot-like)
					const assistantName = assistant.toLowerCase().replace(/_/g, "-").replace("github-", "");
					const tag = `${assistantName}-like` as SessionTag;
					tags.push(tag);
					confidence[tag] = 0.8;
					reasons[tag] = `Detected ${aiPresence.assistantDetails[assistant]} presence`;
				}
			}
		}

		// Tag based on burst detection
		if (burstResult?.isBurst) {
			tags.push("burst");
			confidence.burst = burstResult.confidence;
			reasons.burst = "Session contained rapid, large insertions characteristic of AI assistance";
		}

		// Remove duplicate tags
		const uniqueTags = Array.from(new Set(tags));

		return {
			tags: uniqueTags,
			confidence,
			reasons,
		};
	}

	/**
	 * Updates a session manifest with appropriate tags
	 *
	 * @param manifest Session manifest to update
	 * @param burstResult Optional burst detection result
	 * @returns Updated session manifest with tags
	 */
	updateSessionWithTags(manifest: SessionManifest, burstResult?: BurstDetectionResult): SessionManifest {
		const taggingResult = this.tagSession(manifest, burstResult);

		return {
			...manifest,
			tags: taggingResult.tags,
		};
	}

	/**
	 * Adds tags based on session finalization reason
	 */
	private addReasonTags(
		reason: string,
		tags: SessionTag[],
		confidence: Record<string, number>,
		reasons: Record<string, string>,
	): void {
		switch (reason) {
			case "manual":
				tags.push("manual");
				confidence.manual = 1.0;
				reasons.manual = "Session was manually finalized";
				break;
			case "idle-break":
				tags.push("manual");
				confidence.manual = 0.8;
				reasons.manual = "Session ended due to idle timeout";
				break;
			case "blur":
				tags.push("manual");
				confidence.manual = 0.8;
				reasons.manual = "Session ended when window lost focus";
				break;
			case "task":
				tags.push("manual");
				confidence.manual = 0.9;
				reasons.manual = "Session ended due to task boundary";
				break;
			case "commit":
				tags.push("manual");
				confidence.manual = 0.95;
				reasons.manual = "Session ended with git commit";
				break;
		}
	}
}
