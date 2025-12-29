/**
 * MCP Services - Shared business logic
 */

// Dependency Graph Service (P1 - cached dependency analysis)
export type { DependencyContext } from "./dependency-graph-service.js";
export {
	createDependencyGraphService,
	DependencyGraphService,
	getDependencyGraphService,
} from "./dependency-graph-service.js";
// Error Cache Service (P0)
export { createErrorCacheService, ErrorCacheService } from "./error-cache-service.js";
// Git Context Service (P0)
export { createGitContextService, GitContextService } from "./git-context-service.js";
// Session File Tracker (P1 - bridges MCP-only mode)
export type { TrackedFile } from "./session-file-tracker.js";
export {
	createSessionFileTracker,
	getSessionFileTracker,
	SessionFileTracker,
} from "./session-file-tracker.js";
// Snapshot Service
export type { FileHashResult, SnapshotOptions, SnapshotResult } from "./snapshot-service.js";
export { createSnapshotService, findMatchingSnapshot, getFileHashes, SnapshotService } from "./snapshot-service.js";
// Test Coverage Service (P1 - cached coverage analysis)
export type { TestCoverageContext, TestRunResult } from "./test-coverage-service.js";
export {
	createTestCoverageService,
	getTestCoverageService,
	TestCoverageService,
} from "./test-coverage-service.js";
// Tiered Learning Service (P0 token efficiency)
export type {
	LoadTieredLearningsOptions,
	ScoredLearning,
	TaskIntent,
	TrackedLearning,
} from "./tiered-learning-service.js";
export {
	createTieredLearningService,
	HOT_TIER_BOOST,
	HOT_TIER_PROMOTION_THRESHOLD,
	INTENT_LEARNING_FILES,
	TieredLearningService,
} from "./tiered-learning-service.js";
