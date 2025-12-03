/**
 * Test Helper Functions
 *
 * Common utilities for test assertions, mocking, and setup
 * Promotes consistency and reduces boilerplate across tests
 */

import { expect } from "vitest";

/**
 * Assert that a result object is Ok and extract the value
 * Assumes Result type: { success: true; value: T } | { success: false; error: E }
 */
export function expectOk<T, E>(result: { success: boolean; value?: T; error?: E }): T {
	expect(result.success).toBe(true);
	if (result.success && result.value !== undefined) {
		return result.value;
	}
	throw new Error("Expected Ok result");
}

/**
 * Assert that a result object is Err and extract the error
 * Assumes Result type: { success: true; value: T } | { success: false; error: E }
 */
export function expectErr<T, E>(result: { success: boolean; value?: T; error?: E }): E {
	expect(result.success).toBe(false);
	if (!result.success && result.error !== undefined) {
		return result.error;
	}
	throw new Error("Expected Err result");
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
	condition: () => boolean,
	options?: { timeout?: number; interval?: number },
): Promise<void> {
	const timeout = options?.timeout ?? 5000;
	const interval = options?.interval ?? 50;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Wait for a mock function to be called
 */
export async function waitForMockCall(
	mockFn: { mock: { calls: unknown[][] } },
	options?: { timeout?: number; interval?: number },
): Promise<void> {
	await waitFor(() => mockFn.mock.calls.length > 0, options);
}

/**
 * Clear all mocks in an object
 */
export function clearMocks(obj: Record<string, { mockClear?: () => void }>): void {
	for (const key in obj) {
		if (obj[key]?.mockClear) {
			obj[key].mockClear();
		}
	}
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise (resolve/reject can be called externally)
 */
export function createDeferred<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: Error) => void;
} {
	let resolve: (value: T) => void;
	let reject: (error: Error) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return {
		promise,
		resolve: resolve!,
		reject: reject!,
	};
}

/**
 * Measure the execution time of a function
 */
export async function measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
	const startTime = performance.now();
	const result = await fn();
	const duration = performance.now() - startTime;

	return { result, duration };
}

/**
 * Assert that an operation completes within a time budget
 */
export async function expectWithinBudget<T>(fn: () => Promise<T>, budgetMs: number, label?: string): Promise<T> {
	const { result, duration } = await measureTime(fn);

	expect(duration).toBeLessThan(budgetMs);
	if (label) {
		console.log(`✓ ${label}: ${duration.toFixed(2)}ms (budget: ${budgetMs}ms)`);
	}

	return result;
}

/**
 * Collect all error logs from a function execution
 */
export function captureErrors<T>(fn: () => T | Promise<T>): { result: T | Promise<T>; errors: Error[] } {
	const errors: Error[] = [];
	const originalError = console.error;

	console.error = (...args: unknown[]) => {
		const err = args[0];
		if (err instanceof Error) {
			errors.push(err);
		} else {
			errors.push(new Error(String(err)));
		}
	};

	try {
		const result = fn();
		return { result, errors };
	} finally {
		console.error = originalError;
	}
}

/**
 * Assert two objects are structurally equal (ignoring functions)
 */
export function expectStructuralEquality<T>(actual: T, expected: T): void {
	const actualStr = JSON.stringify(actual, stringifyReplacer);
	const expectedStr = JSON.stringify(expected, stringifyReplacer);

	expect(actualStr).toBe(expectedStr);
}

/**
 * JSON replacer that skips functions
 */
function stringifyReplacer(_key: string, value: unknown): unknown {
	if (typeof value === "function") {
		return "[Function]";
	}
	return value;
}
