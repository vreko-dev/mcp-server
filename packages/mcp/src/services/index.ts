/**
 * MCP Services - Shared business logic
 */

// Error Cache Service (P0)
export { createErrorCacheService, ErrorCacheService } from "./error-cache-service.js";

// Git Context Service (P0)
export { createGitContextService, GitContextService } from "./git-context-service.js";

// Snapshot Service
export type { FileHashResult, SnapshotOptions, SnapshotResult } from "./snapshot-service.js";
export { createSnapshotService, findMatchingSnapshot, getFileHashes, SnapshotService } from "./snapshot-service.js";

// Tiered Learning Service (P0 token efficiency)
export type { LoadTieredLearningsOptions, ScoredLearning, TaskIntent } from "./tiered-learning-service.js";
export {
	createTieredLearningService,
	HOT_TIER_BOOST,
	INTENT_LEARNING_FILES,
	TieredLearningService,
} from "./tiered-learning-service.js";
