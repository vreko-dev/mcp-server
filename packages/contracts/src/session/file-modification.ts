/**
 * File Modification Contracts
 *
 * Canonical type for real-time file modification tracking across all surfaces:
 * - VS Code Extension (records modifications on save)
 * - MCP Server (queries modifications for what_changed)
 * - CLI Daemon (receives modifications from extension)
 * - Intelligence package (stores and queries modifications)
 *
 * Design Decisions:
 * - 'path' (not 'file') - consistent with Node.js/VS Code conventions
 * - 'update' (not 'modified') - matches VS Code file system events
 * - 'source' required - enables debugging cross-surface issues
 * - AI attribution optional - graceful when detection unavailable
 */

import { z } from "zod";

/**
 * Source surfaces that can record file modifications
 */
export const ModificationSourceSchema = z.enum(["extension", "mcp", "daemon", "cli"]);
export type ModificationSource = z.infer<typeof ModificationSourceSchema>;

/**
 * File modification operation types
 * - create: New file created
 * - update: Existing file modified
 * - delete: File deleted
 */
export const ModificationTypeSchema = z.enum(["create", "update", "delete"]);
export type ModificationType = z.infer<typeof ModificationTypeSchema>;

/**
 * Canonical file modification type used across all surfaces.
 *
 * All fields with sensible defaults to minimize required data at recording time.
 */
export const FileModificationSchema = z.object({
	/** Absolute path to the modified file */
	path: z.string().min(1, "Path cannot be empty"),

	/** Modification timestamp (ms since epoch) */
	timestamp: z.number().positive("Timestamp must be positive"),

	/** Type of modification */
	type: ModificationTypeSchema,

	/** Lines changed (0 if unknown or delete) */
	linesChanged: z.number().int().nonnegative().default(0),

	/** Whether this change was AI-attributed (detected by AIPresenceDetector) */
	aiAttributed: z.boolean().default(false),

	/** Which AI tool made the change, if detected (e.g., 'copilot', 'cursor', 'claude') */
	aiTool: z.string().nullable().default(null),

	/** Source surface that recorded this modification */
	source: ModificationSourceSchema,
});

export type FileModification = z.infer<typeof FileModificationSchema>;

/**
 * Input type for recording modifications (source required, others have defaults)
 */
export type FileModificationInput = {
	path: string;
	timestamp: number;
	type: ModificationType;
	source: ModificationSource;
	linesChanged?: number;
	aiAttributed?: boolean;
	aiTool?: string | null;
};

/**
 * Parse and validate a FileModification input
 */
export function parseFileModification(input: FileModificationInput): FileModification {
	return FileModificationSchema.parse(input);
}

// =============================================================================
// ADAPTERS: Convert between surface-specific types and canonical type
// =============================================================================

/**
 * MCP's FileChange type (from packages/mcp/src/session/state.ts)
 */
export interface MCPFileChange {
	file: string;
	type: "created" | "modified" | "deleted";
	timestamp: number;
	aiAttributed: boolean;
	linesChanged: number;
}

/**
 * Convert MCP's FileChange to canonical FileModification
 */
export function fromMCPFileChange(change: MCPFileChange): FileModification {
	return {
		path: change.file,
		timestamp: change.timestamp,
		type: change.type === "created" ? "create" : change.type === "deleted" ? "delete" : "update",
		linesChanged: change.linesChanged,
		aiAttributed: change.aiAttributed,
		aiTool: null, // MCP doesn't track specific AI tool
		source: "mcp",
	};
}

/**
 * Convert canonical FileModification to MCP's FileChange
 */
export function toMCPFileChange(mod: FileModification): MCPFileChange {
	return {
		file: mod.path,
		type: mod.type === "create" ? "created" : mod.type === "delete" ? "deleted" : "modified",
		timestamp: mod.timestamp,
		aiAttributed: mod.aiAttributed,
		linesChanged: mod.linesChanged,
	};
}

/**
 * Intelligence's internal FileModification type (from packages/intelligence/src/types/session.ts)
 * Note: Intelligence will be updated to use the canonical type directly
 */
export interface IntelligenceFileModification {
	path: string;
	timestamp: number;
	type: "create" | "update" | "delete";
	linesChanged?: number;
}

/**
 * Convert Intelligence's FileModification to canonical FileModification
 */
export function fromIntelligenceFileModification(
	mod: IntelligenceFileModification,
	source: ModificationSource = "extension",
): FileModification {
	return {
		path: mod.path,
		timestamp: mod.timestamp,
		type: mod.type,
		linesChanged: mod.linesChanged ?? 0,
		aiAttributed: false, // Intelligence doesn't track this currently
		aiTool: null,
		source,
	};
}

/**
 * Convert canonical FileModification to Intelligence's format
 * (for backwards compatibility during migration)
 */
export function toIntelligenceFileModification(mod: FileModification): IntelligenceFileModification {
	return {
		path: mod.path,
		timestamp: mod.timestamp,
		type: mod.type,
		linesChanged: mod.linesChanged,
	};
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Filter modifications to only those after a given timestamp
 */
export function filterModificationsSince(mods: FileModification[], since: number): FileModification[] {
	return mods.filter((m) => m.timestamp >= since);
}

/**
 * Get unique file paths from modifications
 */
export function getUniqueModifiedPaths(mods: FileModification[]): string[] {
	return [...new Set(mods.map((m) => m.path))];
}

/**
 * Count AI-attributed modifications
 */
export function countAIAttributedModifications(mods: FileModification[]): number {
	return mods.filter((m) => m.aiAttributed).length;
}

/**
 * Get total lines changed across all modifications
 */
export function getTotalLinesChanged(mods: FileModification[]): number {
	return mods.reduce((sum, m) => sum + m.linesChanged, 0);
}

/**
 * Group modifications by AI tool
 */
export function groupByAITool(mods: FileModification[]): Map<string | null, FileModification[]> {
	const groups = new Map<string | null, FileModification[]>();
	for (const mod of mods) {
		const tool = mod.aiTool;
		if (!groups.has(tool)) {
			groups.set(tool, []);
		}
		groups.get(tool)?.push(mod);
	}
	return groups;
}
