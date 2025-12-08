/**
 * Global test setup for SDK tests
 *
 * Uses centralized testing utilities from @snapback/testing.
 */
import { afterEach, beforeEach, vi } from "vitest";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.SNAPBACK_TEST_MODE = "true";

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Setup before each test
beforeEach(() => {
	// Reset Date.now() mock if used
	vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
	// Clear all timers
	vi.clearAllTimers();

	// Clear all mocks
	vi.restoreAllMocks();
});

// Re-export utilities from centralized testing package
// These are available but won't work until the package is built
export {
	measurePerformance,
	restoreConsole,
	retry,
	silenceConsole,
	TEST_CONSTANTS,
	useFakeTimers,
} from "@snapback/testing";
