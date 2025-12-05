/**
 * TestCleanupManager - Automatic Resource Cleanup Tracker
 *
 * Manages cleanup callbacks for tests to prevent resource leaks and ensure
 * proper test isolation. Following 2025 best practices for deterministic testing.
 *
 * @example
 * ```typescript
 * import { TestCleanupManager } from "@snapback/testing/utils/TestCleanupManager";
 *
 * let cleanup: TestCleanupManager;
 *
 * beforeEach(() => {
 *   cleanup = new TestCleanupManager();
 * });
 *
 * afterEach(async () => {
 *   await cleanup.runAll();
 * });
 *
 * it("should manage resources properly", async () => {
 *   const server = createServer();
 *   cleanup.register(() => server.close());
 *
 *   const dbConnection = await connectToDb();
 *   cleanup.register(async () => await dbConnection.close());
 *
 *   // Test code...
 *   // Cleanup runs automatically in afterEach
 * });
 * ```
 */
export class TestCleanupManager {
	private cleanups: Array<() => void | Promise<void>> = [];
	private executed = false;

	/**
	 * Register a cleanup callback to be executed when runAll() is called
	 *
	 * Callbacks are executed in LIFO order (last registered, first executed)
	 * to ensure proper cleanup sequence (e.g., close connections before servers)
	 *
	 * @param cleanup - Sync or async cleanup function
	 *
	 * @example
	 * ```typescript
	 * // Register multiple cleanups
	 * cleanup.register(() => server.close());
	 * cleanup.register(async () => await db.disconnect());
	 * cleanup.register(() => delete process.env.TEST_VAR);
	 * ```
	 */
	register(cleanup: () => void | Promise<void>): void {
		if (this.executed) {
			throw new Error(
				"Cannot register cleanup after runAll() has been called. Create a new TestCleanupManager instance.",
			);
		}
		this.cleanups.push(cleanup);
	}

	/**
	 * Execute all registered cleanup callbacks in reverse order
	 *
	 * Errors during cleanup are collected and thrown as an aggregate error
	 * to ensure all cleanups are attempted even if some fail.
	 *
	 * @throws {AggregateError} If any cleanup callback fails
	 *
	 * @example
	 * ```typescript
	 * afterEach(async () => {
	 *   await cleanup.runAll();
	 * });
	 * ```
	 */
	async runAll(): Promise<void> {
		this.executed = true;

		const errors: Error[] = [];

		// Execute in reverse order (LIFO)
		for (const cleanup of this.cleanups.reverse()) {
			try {
				await cleanup();
			} catch (error) {
				errors.push(error instanceof Error ? error : new Error(String(error)));
			}
		}

		this.cleanups = [];

		if (errors.length > 0) {
			throw new AggregateError(errors, `${errors.length} cleanup callback(s) failed`);
		}
	}

	/**
	 * Clear all registered cleanups without executing them
	 *
	 * Useful for test scenarios where you want to skip cleanup
	 * or manage cleanup manually.
	 *
	 * @example
	 * ```typescript
	 * cleanup.clear();
	 * ```
	 */
	clear(): void {
		this.cleanups = [];
		this.executed = false;
	}

	/**
	 * Get the number of registered cleanup callbacks
	 *
	 * @returns Number of registered cleanups
	 *
	 * @example
	 * ```typescript
	 * expect(cleanup.count()).toBe(3);
	 * ```
	 */
	count(): number {
		return this.cleanups.length;
	}

	/**
	 * Check if any cleanups have been registered
	 *
	 * @returns True if cleanups are registered
	 *
	 * @example
	 * ```typescript
	 * if (!cleanup.isEmpty()) {
	 *   await cleanup.runAll();
	 * }
	 * ```
	 */
	isEmpty(): boolean {
		return this.cleanups.length === 0;
	}
}
