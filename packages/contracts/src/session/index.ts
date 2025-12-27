/**
 * Session Contracts
 *
 * Re-exports session-related types from multiple files.
 */

// File modification types (real-time tracking)
export {
	// Utilities
	countAIAttributedModifications,
	type FileModification,
	type FileModificationInput,
	FileModificationSchema,
	filterModificationsSince,
	fromIntelligenceFileModification,
	// Adapters
	fromMCPFileChange,
	getTotalLinesChanged,
	getUniqueModifiedPaths,
	groupByAITool,
	type MCPFileChange,
	type ModificationSource,
	ModificationSourceSchema,
	type ModificationType,
	ModificationTypeSchema,
	parseFileModification,
	toIntelligenceFileModification,
	toMCPFileChange,
} from "./file-modification.js";

// Re-export existing session types from parent
// (These are already exported via session.ts in the parent directory)
