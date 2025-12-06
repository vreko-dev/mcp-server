/**
 * Global test setup for Vitest unit tests.
 * Runs before all test files.
 */

import { afterEach, beforeEach, vi } from "vitest";
import { testUtils } from "./__mocks__/vscode";

// Reset all mocks between tests
beforeEach(() => {
	testUtils.resetAll();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// Global error handler for unhandled rejections in tests
process.on("unhandledRejection", (reason) => {
	console.error("Unhandled Rejection in test:", reason);
});

// Extend Vitest's expect with custom matchers if needed
// expect.extend({
//   toBeWithinBudget(received: number, budget: number) {
//     const pass = received <= budget;
//     return {
//       pass,
//       message: () =>
//         pass
//           ? `Expected ${received}ms to exceed budget of ${budget}ms`
//           : `Expected ${received}ms to be within budget of ${budget}ms`,
//     };
//   },
// });
