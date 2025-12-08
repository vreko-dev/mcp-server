/**
 * Centralized Test Hooks
 *
 * Provides standardized beforeEach/afterEach hooks for test isolation.
 * Import and call these in your test setup files for consistent behavior.
 *
 * @example
 * ```typescript
 * import { setupTestHooks, createTestContext } from '@snapback/testing/setup/hooks';
 *
 * // In vitest.config.ts setupFiles
 * setupTestHooks();
 *
 * // Or in individual test files
 * describe('MyComponent', () => {
 *   const ctx = createTestContext();
 *
 *   it('should work', () => {
 *     ctx.cleanup.register(() => cleanup());
 *   });
 * });
 * ```
 */

import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { TestCleanupManager } from "../utils/TestCleanupManager";

/**
 * Default test environment variables
 */
export const TEST_ENV_VARS = {
	NODE_ENV: "test",
	SNAPBACK_TEST_MODE: "true",
	TZ: "UTC",
} as const;

/**
 * Setup test hooks for automatic mock cleanup and environment isolation
 *
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * // In test/setup.ts
 * import { setupTestHooks } from '@snapback/testing/setup/hooks';
 *
 * setupTestHooks({
 *   useFakeTimers: true,
 *   silenceConsole: true,
 * });
 * ```
 */
export function setupTestHooks(
	options: {
		/**
		 * Use fake timers by default
		 * @default false
		 */
		useFakeTimers?: boolean;
		/**
		 * Silence console output in tests
		 * @default false
		 */
		silenceConsole?: boolean;
		/**
		 * Set environment variables
		 * @default TEST_ENV_VARS
		 */
		envVars?: Record<string, string>;
		/**
		 * Timeout for tests in ms
		 * @default 10000
		 */
		testTimeout?: number;
	} = {},
): void {
	const { useFakeTimers = false, silenceConsole = false, envVars = TEST_ENV_VARS, testTimeout = 10000 } = options;

	// Set environment variables
	for (const [key, value] of Object.entries(envVars)) {
		process.env[key] = value;
	}

	// Configure vitest
	vi.setConfig({ testTimeout });

	beforeAll(() => {
		if (useFakeTimers) {
			vi.useFakeTimers({ shouldAdvanceTime: true });
		}
	});

	afterAll(() => {
		if (useFakeTimers) {
			vi.useRealTimers();
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();

		if (silenceConsole) {
			vi.spyOn(console, "log").mockImplementation(() => {});
			vi.spyOn(console, "warn").mockImplementation(() => {});
			vi.spyOn(console, "debug").mockImplementation(() => {});
			// Keep console.error for debugging failing tests
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllTimers();
	});
}

/**
 * Test context with automatic cleanup
 *
 * Provides a cleanup manager that runs after each test.
 * Use this pattern for resource cleanup in tests.
 *
 * @example
 * ```typescript
 * import { createTestContext } from '@snapback/testing/setup/hooks';
 *
 * describe('Database', () => {
 *   const ctx = createTestContext();
 *
 *   it('should create record', async () => {
 *     const db = await connectDb();
 *     ctx.cleanup.register(() => db.close());
 *
 *     const record = await db.create({ name: 'test' });
 *     ctx.cleanup.register(() => db.delete(record.id));
 *
 *     expect(record.name).toBe('test');
 *   });
 *   // Cleanup runs automatically after test
 * });
 * ```
 */
export function createTestContext(): {
	cleanup: TestCleanupManager;
} {
	let cleanup: TestCleanupManager;

	beforeEach(() => {
		cleanup = new TestCleanupManager();
	});

	afterEach(async () => {
		await cleanup.runAll();
	});

	return {
		get cleanup() {
			return cleanup;
		},
	};
}

/**
 * Interface for mock file system
 */
export interface MockFile {
	path: string;
	content: string;
	mtime?: Date;
	size?: number;
}

/**
 * Interface for mock workspace
 */
export interface MockWorkspace {
	rootPath: string;
	files: MockFile[];
}

/**
 * Creates a mock workspace for testing
 *
 * @param options - Workspace configuration
 * @returns Mock workspace object
 *
 * @example
 * ```typescript
 * const workspace = createMockWorkspace({
 *   rootPath: '/test/project',
 *   files: [
 *     { path: 'src/index.ts', content: 'export const x = 1;' },
 *     { path: 'package.json', content: '{"name": "test"}' },
 *   ],
 * });
 * ```
 */
export function createMockWorkspace(options: Partial<MockWorkspace> = {}): MockWorkspace {
	return {
		rootPath: options.rootPath ?? "/test-workspace",
		files: options.files ?? [],
	};
}

/**
 * Creates mock file change event
 *
 * @param uri - File path
 * @param changeType - Type of change
 * @returns Mock event object
 *
 * @example
 * ```typescript
 * const event = createFileChangeEvent('/src/index.ts', 'change');
 * ```
 */
export function createFileChangeEvent(
	uri: string,
	changeType: "create" | "change" | "delete" = "change",
): { uri: { fsPath: string }; type: string } {
	return {
		uri: { fsPath: uri },
		type: changeType,
	};
}

/**
 * Creates burst pattern for AI detection testing
 *
 * @param basePath - Base path for files
 * @param fileCount - Number of files in burst
 * @param intervalMs - Interval between changes
 * @returns Array of file change events with timestamps
 *
 * @example
 * ```typescript
 * const burst = await createBurstPattern('/src', 5, 50);
 * // Returns 5 file changes, 50ms apart
 * ```
 */
export function createBurstPattern(
	basePath: string,
	fileCount: number,
	intervalMs = 50,
): { uri: { fsPath: string }; timestamp: number }[] {
	const events: { uri: { fsPath: string }; timestamp: number }[] = [];
	const startTime = Date.now();

	for (let i = 0; i < fileCount; i++) {
		events.push({
			uri: { fsPath: `${basePath}/file${i}.ts` },
			timestamp: startTime + i * intervalMs,
		});
	}

	return events;
}

/**
 * Waits for condition or timeout
 *
 * @param condition - Condition function to check
 * @param timeoutMs - Maximum wait time
 * @param intervalMs - Check interval
 *
 * @example
 * ```typescript
 * await waitFor(() => myComponent.isReady);
 * await waitFor(() => api.getStatus() === 'complete', 10000);
 * ```
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeoutMs = 5000,
	intervalMs = 50,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

/**
 * Helper to create mock checkpoint for testing
 *
 * @param overrides - Override default values
 * @returns Mock checkpoint object
 *
 * @example
 * ```typescript
 * const checkpoint = createMockCheckpoint({
 *   id: 'snap_custom',
 *   tool: 'cursor',
 *   confidence: 0.95,
 * });
 * ```
 */
export function createMockCheckpoint(
	overrides: Partial<{
		id: string;
		timestamp: Date;
		files: string[];
		tool: string;
		confidence: number;
		message: string;
	}> = {},
): {
	id: string;
	timestamp: Date;
	files: string[];
	tool: string;
	confidence: number;
	message: string;
} {
	return {
		id: overrides.id ?? `snap_${Date.now()}`,
		timestamp: overrides.timestamp ?? new Date(),
		files: overrides.files ?? ["src/index.ts"],
		tool: overrides.tool ?? "unknown",
		confidence: overrides.confidence ?? 0.5,
		message: overrides.message ?? "Auto checkpoint",
	};
}

/**
 * Creates mock commit message with co-author tags
 *
 * @param message - Base commit message
 * @param coAuthors - List of co-authors
 * @returns Formatted commit message
 *
 * @example
 * ```typescript
 * const msg = createMockCommitMessage('Add feature', ['AI Assistant <ai@example.com>']);
 * // Returns: 'Add feature\n\nCo-authored-by: AI Assistant <ai@example.com>'
 * ```
 */
export function createMockCommitMessage(message: string, coAuthors: string[] = []): string {
	let fullMessage = message;

	for (const author of coAuthors) {
		fullMessage += `\n\nCo-authored-by: ${author}`;
	}

	return fullMessage;
}

/**
 * Performance measurement utility for tests
 *
 * @param fn - Function to measure
 * @param label - Optional label for logging
 * @returns Result and duration
 *
 * @example
 * ```typescript
 * const { result, durationMs } = await measurePerformance(
 *   () => expensiveOperation(),
 *   'expensive-op'
 * );
 * expect(durationMs).toBeLessThan(100);
 * ```
 */
export async function measurePerformance<T>(
	fn: () => T | Promise<T>,
	label?: string,
): Promise<{ result: T; durationMs: number }> {
	const start = performance.now();
	const result = await fn();
	const durationMs = performance.now() - start;

	if (label && process.env.VERBOSE_TESTS === "true") {
		console.log(`[PERF] ${label}: ${durationMs.toFixed(2)}ms`);
	}

	return { result, durationMs };
}

/**
 * Fake timers utility with convenient helpers
 *
 * @returns Fake timer control object
 *
 * @example
 * ```typescript
 * const timers = useFakeTimers();
 *
 * // Advance time synchronously
 * timers.tick(1000);
 *
 * // Advance time and flush promises
 * await timers.tickAsync(1000);
 *
 * // Restore real timers
 * timers.restore();
 * ```
 */
export function useFakeTimers(): {
	tick: (ms: number) => void;
	tickAsync: (ms: number) => Promise<void>;
	restore: () => void;
} {
	vi.useFakeTimers();

	return {
		tick: (ms: number) => vi.advanceTimersByTime(ms),
		tickAsync: async (ms: number) => {
			await vi.advanceTimersByTimeAsync(ms);
		},
		restore: () => vi.useRealTimers(),
	};
}

/**
 * Retry utility for flaky tests (use sparingly!)
 *
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum retry attempts
 * @param delayMs - Delay between attempts
 * @returns Result of successful attempt
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => flakeyApiCall(),
 *   3,
 *   100
 * );
 * ```
 */
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

/**
 * Constants for tests
 */
export const TEST_CONSTANTS = {
	DEFAULT_TIMEOUT: 5000,
	PERFORMANCE_THRESHOLD_MS: 200,
	TEST_WORKSPACE: "/tmp/test-snapback-workspace",
	TEST_USER_ID: "test-user-123",
	TEST_SESSION_ID: "test-session-456",
} as const;
