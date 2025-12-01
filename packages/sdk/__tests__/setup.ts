/**
 * Global test setup for SDK tests
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

// Suppress console output in tests unless explicitly needed
const originalConsole = {
	log: console.log,
	warn: console.warn,
	error: console.error,
	debug: console.debug,
};

// Only show errors in tests by default
if (process.env.VERBOSE_TESTS !== "true") {
	console.log = vi.fn();
	console.warn = vi.fn();
	console.debug = vi.fn();
}

// Export utilities for tests that need to restore console
export function restoreConsole() {
	console.log = originalConsole.log;
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	console.debug = originalConsole.debug;
}

export function silenceConsole() {
	console.log = vi.fn();
	console.warn = vi.fn();
	console.error = vi.fn();
	console.debug = vi.fn();
}

// Global test helpers
export const TEST_CONSTANTS = {
	DEFAULT_TIMEOUT: 5000,
	PERFORMANCE_THRESHOLD_MS: 200,
	TEST_WORKSPACE: "/tmp/test-snapback-workspace",
	TEST_USER_ID: "test-user-123",
	TEST_SESSION_ID: "test-session-456",
};

// Mock timers utility
export function useFakeTimers() {
	vi.useFakeTimers();
	return {
		tick: (ms: number) => vi.advanceTimersByTime(ms),
		tickAsync: async (ms: number) => vi.advanceTimersByTimeAsync(ms),
		restore: () => vi.useRealTimers(),
	};
}

// Performance testing utility
export async function measurePerformance<T>(fn: () => Promise<T> | T): Promise<{ result: T; durationMs: number }> {
	const start = performance.now();
	const result = await fn();
	const durationMs = performance.now() - start;
	return { result, durationMs };
}

// Retry utility for flaky tests
export async function retry<T>(fn: () => Promise<T>, maxAttempts = 3, delayMs = 100): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			if (attempt < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}

	throw lastError;
}
