/**
 * Session Summary Generator - Creates deterministic summaries for sessions
 *
 * This module provides platform-agnostic utilities for generating human-readable
 * summaries of sessions by analyzing the changes across all files in a session.
 *
 * @module SessionSummaryGenerator
 */
import type { Snapshot } from "@snapback-oss/contracts";
import type { ILogger } from "./interfaces.js";
import type { SessionManifest } from "./types.js";
/**
 * Interface for snapshot providers
 *
 * This allows dependency injection so different platforms can provide
 * their own snapshot retrieval implementation.
 */
export interface ISnapshotProvider {
    /**
     * Retrieves a snapshot by ID
     *
     * @param id - Snapshot ID
     * @returns Promise that resolves to the snapshot or null if not found
     */
    get(id: string): Promise<Snapshot | null>;
}
/**
 * Configuration options for SessionSummaryGenerator
 */
export interface SessionSummaryGeneratorOptions {
    /** Optional snapshot provider for detailed analysis */
    snapshotProvider?: ISnapshotProvider;
    /** Optional logger for debug/info messages */
    logger?: ILogger;
}
/**
 * SessionSummaryGenerator - Platform-agnostic session summary generation
 *
 * Generates human-readable summaries of sessions by analyzing file changes
 * and extracting key identifiers. Supports both metadata-only and detailed
 * (content-aware) summary generation.
 *
 * @example
 * ```typescript
 * const generator = new SessionSummaryGenerator({
 *   snapshotProvider: mySnapshotProvider,
 *   logger: myLogger
 * });
 *
 * const summary = await generator.generateSummary(session);
 * // "Modified 3 files over 120s - UserService, createUser, validateInput"
 * ```
 */
export declare class SessionSummaryGenerator {
    private snapshotProvider?;
    private logger;
    /**
     * Creates a new SessionSummaryGenerator
     *
     * @param options - Configuration options (optional)
     */
    constructor(options?: SessionSummaryGeneratorOptions);
    /**
     * Generates a deterministic summary for a session
     *
     * Creates a human-readable summary that describes the changes in a session
     * without including any sensitive content or file paths.
     *
     * @param session - Session manifest to summarize
     * @returns Promise that resolves to a session summary
     */
    generateSummary(session: SessionManifest): Promise<string>;
    /**
     * Generates a detailed summary by analyzing actual file changes
     *
     * @param session - Session manifest to summarize
     * @returns Promise that resolves to a detailed session summary
     */
    private generateDetailedSummary;
    /**
     * Generates a summary based on session metadata only
     *
     * @param session - Session manifest to summarize
     * @returns Session summary based on metadata
     */
    private generateMetadataSummary;
    /**
     * Extracts top identifiers from file content for use in summaries
     *
     * Uses regex-based extraction to identify the most important identifiers
     * (functions, classes, variables) in the file content.
     *
     * @param content - File content to analyze
     * @param filePath - Path to the file (used to determine language)
     * @returns Promise that resolves to array of top identifiers
     */
    extractTopIdentifiers(content: string, filePath: string): Promise<string[]>;
    /**
     * Extracts identifiers using regex patterns
     *
     * @param content - File content
     * @returns Array of identifiers
     */
    private extractIdentifiersWithRegex;
    /**
     * Checks if an identifier is a common keyword that should be excluded
     *
     * @param identifier - Identifier to check
     * @returns True if it's a common keyword
     */
    isCommonKeyword(identifier: string): boolean;
}
//# sourceMappingURL=SessionSummaryGenerator.d.ts.map