/**
 * @snapback/testing
 *
 * Centralized testing utilities for the SnapBack monorepo.
 *
 * ## Exports
 *
 * - MSW handlers and server: `@snapback/testing/msw`
 * - Authentication mocks: `@snapback/testing/mocks/auth`
 * - Performance testing: `@snapback/testing/utils/performance`
 * - Test cleanup: `@snapback/testing/utils/TestCleanupManager`
 * - Deterministic time: `@snapback/testing/utils/DeterministicTime`
 * - Test fixtures: `@snapback/testing/fixtures`
 * - Test factories: `@snapback/testing/fixtures/factories`
 *
 * @example
 * ```typescript
 * // MSW
 * import { server } from "@snapback/testing/msw/server";
 *
 * // Auth mocks
 * import { authenticate } from "@snapback/testing/mocks/auth";
 *
 * // Performance testing
 * import { createBenchmark } from "@snapback/testing/utils/performance";
 *
 * // Test infrastructure (2025 best practices)
 * import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";
 * import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";
 * import { createTestUser, createTestSnapshot } from "@snapback/testing/fixtures/factories";
 * ```
 */

export * from "./fixtures/factories";
export { authenticate, getUserInfo, validateScopes } from "./mocks/auth";
// Re-export commonly used utilities for convenience
export { handlers, server } from "./msw";
export { addTime, DeterministicTime, toTimestamp } from "./utils/DeterministicTime";
export { ALPHA_BUDGETS, checkBudget, createBenchmark } from "./utils/performance";
export { TestCleanupManager } from "./utils/TestCleanupManager";
