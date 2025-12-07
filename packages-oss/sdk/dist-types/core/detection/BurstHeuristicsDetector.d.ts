/**
 * @fileoverview Burst Heuristics Detector - Detects AI-like editing bursts
 *
 * This module provides utilities for detecting rapid, large insertions that
 * might indicate AI-assisted coding sessions. It analyzes editing patterns
 * to identify characteristic AI behaviors.
 *
 * Migrated from apps/vscode to SDK for platform-wide reuse.
 */
/**
 * Configuration interface for burst detection
 */
export interface BurstDetectorConfig {
    /** Time window in milliseconds to consider for burst detection */
    timeWindow?: number;
    /** Minimum number of characters inserted to qualify as burst */
    minCharsInserted?: number;
    /** Maximum time between keystrokes to qualify as burst */
    maxKeystrokeInterval?: number;
    /** Minimum number of lines affected to qualify as burst */
    minLinesAffected?: number;
    /** Minimum ratio of inserted to deleted chars to qualify as burst */
    minInsertDeleteRatio?: number;
}
/**
 * Results of burst detection analysis
 */
export interface BurstDetectionResult {
    /** Whether a burst pattern was detected */
    isBurst: boolean;
    /** Confidence level (0-1) */
    confidence: number;
    /** Details about the detected burst */
    details?: {
        /** Total characters inserted */
        totalInserted: number;
        /** Total characters deleted */
        totalDeleted: number;
        /** Insert/delete ratio */
        ratio: number;
        /** Number of changes in burst */
        changeCount: number;
        /** Duration of burst */
        duration: number;
    };
}
/**
 * Tracks and detects AI-like burst patterns in editing
 */
export declare class BurstHeuristicsDetector {
    /** Recent text changes for analysis */
    private recentChanges;
    /** Timestamp of last change */
    private lastChangeTime;
    /** Configuration for burst detection */
    private config;
    /**
     * Creates a new BurstHeuristicsDetector
     *
     * @param config Optional configuration to override defaults
     */
    constructor(config?: BurstDetectorConfig);
    /**
     * Records a text change event for burst analysis
     *
     * @param charsInserted Number of characters inserted
     * @param charsDeleted Number of characters deleted
     * @param linesAffected Number of lines affected
     */
    recordChange(charsInserted: number, charsDeleted: number, linesAffected: number): void;
    /**
     * Analyzes recent changes to detect burst patterns
     *
     * @returns Burst detection result
     */
    analyzeBurst(): BurstDetectionResult;
    /**
     * Trims old changes outside the analysis time window
     */
    private trimOldChanges;
    /**
     * Clears all recorded changes
     */
    clear(): void;
}
//# sourceMappingURL=BurstHeuristicsDetector.d.ts.map