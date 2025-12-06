/**
 * @fileoverview Session Tagger - Tags sessions based on AI presence and burst patterns
 *
 * This module provides utilities for automatically tagging sessions based on
 * detected AI assistants and burst patterns. This enables features like
 * automatic checkpointing for AI-assisted coding sessions.
 *
 * Migrated from apps/vscode to SDK for platform-wide reuse.
 */
import type { BurstDetectionResult } from "../detection/BurstHeuristicsDetector";
import type { SessionManifest } from "./types";
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
 * Tags that can be applied to sessions
 */
export type SessionTag = "ai-assisted" | "copilot-like" | "claude-like" | "tabnine-like" | "codeium-like" | "burst" | "large-edits" | "multi-file" | "long-session" | "short-session" | "git-commit" | "manual" | "idle-break" | string;
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
export declare class SessionTagger {
    private aiPresenceDetector?;
    private config;
    /**
     * Creates a new SessionTagger
     *
     * @param options Optional configuration and dependencies
     */
    constructor(options?: SessionTaggerOptions);
    /**
     * Analyzes a session and generates appropriate tags
     *
     * @param manifest Session manifest to analyze
     * @param burstResult Optional burst detection result
     * @returns Session tagging result with tags and confidence levels
     */
    tagSession(manifest: SessionManifest, burstResult?: BurstDetectionResult): SessionTaggingResult;
    /**
     * Updates a session manifest with appropriate tags
     *
     * @param manifest Session manifest to update
     * @param burstResult Optional burst detection result
     * @returns Updated session manifest with tags
     */
    updateSessionWithTags(manifest: SessionManifest, burstResult?: BurstDetectionResult): SessionManifest;
    /**
     * Adds tags based on session finalization reason
     */
    private addReasonTags;
}
//# sourceMappingURL=SessionTagger.d.ts.map