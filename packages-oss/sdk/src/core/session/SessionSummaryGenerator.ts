/**
 * Session Summary Generator - Creates deterministic summaries for sessions
 *
 * This module provides platform-agnostic utilities for generating human-readable
 * summaries of sessions by analyzing the changes across all files in a session.
 *
 * @module SessionSummaryGenerator
 */

import * as path from "node:path";
import type { Snapshot } from "@snapback-oss/contracts";
import { createSilentLogger } from "@snapback-oss/contracts";
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
export class SessionSummaryGenerator {
	private snapshotProvider?: ISnapshotProvider;
	private logger: ILogger;

	/**
	 * Creates a new SessionSummaryGenerator
	 *
	 * @param options - Configuration options (optional)
	 */
	constructor(options?: SessionSummaryGeneratorOptions) {
		this.snapshotProvider = options?.snapshotProvider;
		this.logger = options?.logger || createSilentLogger();
	}

	/**
	 * Generates a deterministic summary for a session
	 *
	 * Creates a human-readable summary that describes the changes in a session
	 * without including any sensitive content or file paths.
	 *
	 * @param session - Session manifest to summarize
	 * @returns Promise that resolves to a session summary
	 */
	async generateSummary(session: SessionManifest): Promise<string> {
		try {
			// If we have a snapshot provider, we can do more detailed analysis
			if (this.snapshotProvider) {
				return await this.generateDetailedSummary(session);
			}

			// Fallback to metadata-based summary
			return this.generateMetadataSummary(session);
		} catch (error) {
			this.logger.error("Failed to generate session summary", error instanceof Error ? error : undefined, {
				error,
			});
			return "Session summary unavailable";
		}
	}

	/**
	 * Generates a detailed summary by analyzing actual file changes
	 *
	 * @param session - Session manifest to summarize
	 * @returns Promise that resolves to a detailed session summary
	 */
	private async generateDetailedSummary(session: SessionManifest): Promise<string> {
		try {
			// Collect identifiers from all files in the session
			const allIdentifiers = new Set<string>();

			// Process each file in the session
			for (const fileEntry of session.files) {
				try {
					// Retrieve the snapshot
					const snapshot = await this.snapshotProvider?.get(fileEntry.snapshotId);
					if (snapshot?.fileContents) {
						// Extract identifiers from each file's content
						for (const [filePath, content] of Object.entries(snapshot.fileContents)) {
							const identifiers = await this.extractTopIdentifiers(content, filePath);
							for (const identifier of identifiers) {
								allIdentifiers.add(identifier);
							}
						}
					}
				} catch (error) {
					this.logger.error(`Failed to process file ${fileEntry.uri} for summary`, undefined, {
						error,
					});
				}
			}

			// Generate summary based on collected data
			const fileCount = session.files.length;
			const duration = Math.round((session.endedAt - session.startedAt) / 1000);

			// Create a more descriptive summary
			let summary = "";

			if (fileCount === 0) {
				summary = "Empty session";
			} else if (fileCount === 1) {
				summary = `Modified 1 file over ${duration}s`;
			} else {
				summary = `Modified ${fileCount} files over ${duration}s`;
			}

			// Add AI assistance indicator if detected
			const aiTags = session.tags?.filter(
				(tag) => tag.includes("ai") || tag.includes("copilot") || tag.includes("claude"),
			);
			if (aiTags && aiTags.length > 0) {
				summary = `[AI] ${summary}`;
			}

			// Add key identifiers if we found any
			if (allIdentifiers.size > 0) {
				const topIdentifiers = Array.from(allIdentifiers).slice(0, 3);
				summary += ` - ${topIdentifiers.join(", ")}`;
			}

			return summary;
		} catch (error) {
			this.logger.error(
				"Failed to generate detailed session summary",
				error instanceof Error ? error : undefined,
				{ error },
			);
			return this.generateMetadataSummary(session);
		}
	}

	/**
	 * Generates a summary based on session metadata only
	 *
	 * @param session - Session manifest to summarize
	 * @returns Session summary based on metadata
	 */
	private generateMetadataSummary(session: SessionManifest): string {
		const fileCount = session.files.length;
		const duration = Math.round((session.endedAt - session.startedAt) / 1000);

		// Create a simple summary based on session metadata
		if (fileCount === 0) {
			return "Empty session";
		}

		// Add AI assistance indicator if detected
		const aiTags = session.tags?.filter(
			(tag) => tag.includes("ai") || tag.includes("copilot") || tag.includes("claude"),
		);
		const aiPrefix = aiTags && aiTags.length > 0 ? "[AI] " : "";

		if (fileCount === 1) {
			return `${aiPrefix}Modified 1 file over ${duration}s`;
		}

		return `${aiPrefix}Modified ${fileCount} files over ${duration}s`;
	}

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
	async extractTopIdentifiers(content: string, filePath: string): Promise<string[]> {
		try {
			// Determine file type
			const extension = path.extname(filePath).toLowerCase();

			if (extension === ".ts" || extension === ".js" || extension === ".tsx" || extension === ".jsx") {
				// Use regex extraction for TypeScript/JavaScript files
				return this.extractIdentifiersWithRegex(content);
			}
			// For non-TS/JS files, use regex fallback
			return this.extractIdentifiersWithRegex(content);
		} catch (error) {
			this.logger.error(`Failed to extract identifiers from ${filePath}`, undefined, {
				error,
			});
			// Fallback to simple regex extraction
			return this.extractIdentifiersWithRegex(content);
		}
	}

	/**
	 * Extracts identifiers using regex patterns
	 *
	 * @param content - File content
	 * @returns Array of identifiers
	 */
	private extractIdentifiersWithRegex(content: string): string[] {
		// Extract function names, class names, and variable names
		const patterns = [
			/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // function declarations
			/const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // const declarations
			/let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // let declarations
			/var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // var declarations
			/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // class declarations
			/interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // interface declarations
			/async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, // async method declarations
			/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g, // method/function declarations
		];

		const identifiers = new Set<string>();

		for (const pattern of patterns) {
			let match = pattern.exec(content);
			while (match !== null) {
				// Only include identifiers that are reasonably long and not common keywords
				const identifier = match[1];
				if (identifier.length > 2 && !this.isCommonKeyword(identifier)) {
					identifiers.add(identifier);
				}
				match = pattern.exec(content);
			}
		}

		// Return top 5 identifiers
		return Array.from(identifiers).slice(0, 5);
	}

	/**
	 * Checks if an identifier is a common keyword that should be excluded
	 *
	 * @param identifier - Identifier to check
	 * @returns True if it's a common keyword
	 */
	isCommonKeyword(identifier: string): boolean {
		const commonKeywords = new Set([
			"if",
			"else",
			"for",
			"while",
			"do",
			"switch",
			"case",
			"break",
			"continue",
			"try",
			"catch",
			"finally",
			"throw",
			"return",
			"yield",
			"await",
			"async",
			"function",
			"const",
			"let",
			"var",
			"class",
			"interface",
			"type",
			"enum",
			"import",
			"export",
			"from",
			"as",
			"default",
			"extends",
			"implements",
			"static",
			"public",
			"private",
			"protected",
			"readonly",
			"abstract",
			"get",
			"set",
			"constructor",
			"super",
			"this",
			"new",
			"delete",
			"typeof",
			"instanceof",
			"in",
			"of",
			"void",
			"null",
			"undefined",
			"true",
			"false",
			"boolean",
			"number",
			"string",
			"object",
			"symbol",
			"bigint",
			"any",
			"unknown",
			"never",
			"void",
			"undefined",
			"null",
			"Promise",
			"Array",
			"String",
			"Number",
			"Boolean",
			"Object",
			"Function",
			"RegExp",
			"Date",
			"Error",
			"Map",
			"Set",
			"WeakMap",
			"WeakSet",
			"Proxy",
			"Reflect",
		]);

		return commonKeywords.has(identifier);
	}
}
