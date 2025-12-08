/**
 * @snapback/testing
 *
 * Centralized testing utilities for the SnapBack monorepo.
 *
 * ## Exports
 *
 * - MSW handlers and server: `@snapback/testing/msw`
 * - Authentication mocks: `@snapback/testing/mocks/auth`
 * - VS Code mocks: `@snapback/testing/mocks/vscode`
 * - Test setup hooks: `@snapback/testing/setup/hooks`
 * - Performance testing: `@snapback/testing/utils/performance`
 * - Console utilities: `@snapback/testing/utils/console`
 * - Test cleanup: `@snapback/testing/utils/TestCleanupManager`
 * - Deterministic time: `@snapback/testing/utils/DeterministicTime`
 * - Custom matchers: `@snapback/testing/matchers`
 * - Test fixtures: `@snapback/testing/fixtures`
 * - Test factories: `@snapback/testing/fixtures/factories`
 * - Vitest config presets: `@snapback/testing/vitest-config`
 *
 * @example
 * ```typescript
 * // MSW
 * import { server } from "@snapback/testing/msw/server";
 *
 * // Auth mocks
 * import { authenticate } from "@snapback/testing/mocks/auth";
 *
 * // VS Code mocks
 * import { mockVscode, setupVscodeMock } from "@snapback/testing/mocks/vscode";
 *
 * // Test hooks
 * import { setupTestHooks, createTestContext } from "@snapback/testing/setup/hooks";
 *
 * // Console utilities
 * import { silenceConsole, captureConsole } from "@snapback/testing/utils/console";
 *
 * // Custom matchers (import for side effects)
 * import "@snapback/testing/matchers";
 *
 * // Performance testing
 * import { createBenchmark } from "@snapback/testing/utils/performance";
 *
 * // Test infrastructure (2025 best practices)
 * import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";
 * import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";
 * import { createTestUser, createTestSnapshot } from "@snapback/testing/fixtures/factories";
 *
 * // Vitest config presets
 * import { nodePreset, createVitestConfig } from "@snapback/testing/vitest-config";
 * ```
 */

// Core exports
export * from "./fixtures/factories";
export { authenticate, getUserInfo, validateScopes } from "./mocks/auth";
// VS Code mocks exports
export {
	createMockDiagnosticCollection,
	createMockFileSystemWatcher,
	createMockOutputChannel,
	createMockStatusBarItem,
	createMockTextDocument,
	createVscodeMock,
	MockDisposable,
	MockEventEmitter,
	MockPosition,
	MockRange,
	MockTreeItem,
	MockWorkspaceEdit,
	mockVscode,
	setupVscodeMock,
} from "./mocks/vscode";
// MSW exports
export { handlers, server } from "./msw";
// Setup hooks exports
export {
	createBurstPattern,
	createFileChangeEvent,
	createMockCheckpoint,
	createMockCommitMessage,
	createMockWorkspace,
	createTestContext,
	measurePerformance,
	retry,
	setupTestHooks,
	TEST_CONSTANTS,
	TEST_ENV_VARS,
	useFakeTimers,
	waitFor,
} from "./setup/hooks";
export {
	captureConsole,
	expectNoConsoleErrors,
	expectNoConsoleWarnings,
	restoreConsole,
	silenceConsole,
	withCapturedConsole,
	withSilentConsole,
} from "./utils/console";
// Utility exports
export { addTime, DeterministicTime, toTimestamp } from "./utils/DeterministicTime";
export { ALPHA_BUDGETS, checkBudget, createBenchmark } from "./utils/performance";
export { TestCleanupManager } from "./utils/TestCleanupManager";

// Vitest config exports
export {
	COVERAGE_THRESHOLDS,
	createVitestConfig,
	e2ePreset,
	integrationPreset,
	jsdomPreset,
	mergeConfigs,
	nodePreset,
	TEST_TIMEOUTS,
} from "./vitest-config";
