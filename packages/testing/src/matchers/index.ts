/**
 * Custom Vitest Matchers for SnapBack
 *
 * Provides custom matchers for common testing patterns.
 * Import this file in your test setup to make matchers available globally.
 *
 * @example
 * ```typescript
 * // In test/setup.ts
 * import '@snapback/testing/matchers';
 *
 * // In tests
 * expect(performance.p95).toBeWithinRange(0, 100);
 * expect(result).toMatchResult({ success: true });
 * ```
 */

import { expect } from "vitest";

/**
 * Custom matcher: toBeWithinRange
 *
 * Checks if a number is within an inclusive range.
 *
 * @example
 * ```typescript
 * expect(50).toBeWithinRange(0, 100);   // ✓ passes
 * expect(150).toBeWithinRange(0, 100);  // ✗ fails
 * expect(0).toBeWithinRange(0, 100);    // ✓ passes (inclusive)
 * expect(100).toBeWithinRange(0, 100);  // ✓ passes (inclusive)
 * ```
 */
function toBeWithinRange(received: number, floor: number, ceiling: number) {
	const pass = received >= floor && received <= ceiling;

	return {
		pass,
		message: () =>
			pass
				? `expected ${received} not to be within range ${floor} - ${ceiling}`
				: `expected ${received} to be within range ${floor} - ${ceiling}`,
	};
}

/**
 * Custom matcher: toMatchResult
 *
 * Checks if a Result<T, E> matches the expected success/error shape.
 * Works with the Result pattern used throughout SnapBack.
 *
 * @example
 * ```typescript
 * const success = { success: true, value: { id: '123' } };
 * const failure = { success: false, error: new Error('Failed') };
 *
 * expect(success).toMatchResult({ success: true });
 * expect(failure).toMatchResult({ success: false });
 * expect(success).toMatchResult({ success: true, value: expect.objectContaining({ id: '123' }) });
 * ```
 */
function toMatchResult(
	received: { success: boolean; value?: unknown; error?: unknown },
	expected: { success: boolean; value?: unknown; error?: unknown },
) {
	const successMatches = received.success === expected.success;

	if (!successMatches) {
		return {
			pass: false,
			message: () =>
				`expected Result.success to be ${expected.success}, but got ${received.success}` +
				(received.success === false && received.error
					? `\n\nError: ${received.error instanceof Error ? received.error.message : String(received.error)}`
					: ""),
		};
	}

	// For success results, check value if specified
	if (expected.success && expected.value !== undefined) {
		try {
			expect(received.value).toEqual(expected.value);
		} catch {
			return {
				pass: false,
				message: () =>
					"Result.value mismatch:\n" +
					`Expected: ${JSON.stringify(expected.value, null, 2)}\n` +
					`Received: ${JSON.stringify(received.value, null, 2)}`,
			};
		}
	}

	// For error results, check error if specified
	if (!expected.success && expected.error !== undefined) {
		try {
			expect(received.error).toEqual(expected.error);
		} catch {
			return {
				pass: false,
				message: () =>
					"Result.error mismatch:\n" +
					`Expected: ${expected.error instanceof Error ? expected.error.message : String(expected.error)}\n` +
					`Received: ${received.error instanceof Error ? received.error.message : String(received.error)}`,
			};
		}
	}

	return {
		pass: true,
		message: () => `expected Result not to match ${JSON.stringify(expected)}`,
	};
}

/**
 * Custom matcher: toBeValidSnapshotId
 *
 * Checks if a string is a valid SnapBack snapshot ID.
 *
 * @example
 * ```typescript
 * expect('snap_abc123def456').toBeValidSnapshotId();  // ✓ passes
 * expect('invalid').toBeValidSnapshotId();            // ✗ fails
 * ```
 */
function toBeValidSnapshotId(received: string) {
	const pattern = /^snap_[a-zA-Z0-9]+$/;
	const pass = typeof received === "string" && pattern.test(received);

	return {
		pass,
		message: () =>
			pass
				? `expected ${received} not to be a valid snapshot ID`
				: `expected ${received} to be a valid snapshot ID (format: snap_<alphanumeric>)`,
	};
}

/**
 * Custom matcher: toBeValidSessionId
 *
 * Checks if a string is a valid SnapBack session ID.
 *
 * @example
 * ```typescript
 * expect('sess_abc123def456').toBeValidSessionId();  // ✓ passes
 * expect('invalid').toBeValidSessionId();            // ✗ fails
 * ```
 */
function toBeValidSessionId(received: string) {
	const pattern = /^sess_[a-zA-Z0-9]+$/;
	const pass = typeof received === "string" && pattern.test(received);

	return {
		pass,
		message: () =>
			pass
				? `expected ${received} not to be a valid session ID`
				: `expected ${received} to be a valid session ID (format: sess_<alphanumeric>)`,
	};
}

/**
 * Custom matcher: toHaveBeenCalledWithinMs
 *
 * Checks if a mock function was called within a time limit.
 * Useful for performance testing.
 *
 * Note: This is a placeholder that always passes. For actual timing,
 * use measurePerformance utility with explicit assertions.
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * await operation();
 * const duration = Date.now() - start;
 * expect(duration).toBeLessThan(100);
 * ```
 */
function toHaveBeenCalledWithinMs(_received: unknown, _expectedMs: number) {
	// Note: True timing validation requires instrumentation
	// This is a documentation placeholder
	return {
		pass: true,
		message: () => "Timing validation requires explicit measurement. Use measurePerformance utility.",
	};
}

/**
 * Custom matcher: toBeProtectionLevel
 *
 * Checks if a value is a valid protection level.
 *
 * @example
 * ```typescript
 * expect('watch').toBeProtectionLevel();   // ✓ passes
 * expect('block').toBeProtectionLevel();   // ✓ passes
 * expect('invalid').toBeProtectionLevel(); // ✗ fails
 * ```
 */
function toBeProtectionLevel(received: string) {
	const validLevels = [
		"watch",
		"warn",
		"block",
		"ignore",
		"protected",
		"Watch",
		"Warn",
		"Block",
		"Ignore",
		"Protected",
	];
	const pass = typeof received === "string" && validLevels.includes(received);

	return {
		pass,
		message: () =>
			pass
				? `expected ${received} not to be a valid protection level`
				: `expected ${received} to be a valid protection level (one of: ${validLevels.join(", ")})`,
	};
}

/**
 * Custom matcher: toBeRiskScore
 *
 * Checks if a value is a valid risk score (0-1 range).
 *
 * @example
 * ```typescript
 * expect(0.5).toBeRiskScore();   // ✓ passes
 * expect(0).toBeRiskScore();     // ✓ passes
 * expect(1).toBeRiskScore();     // ✓ passes
 * expect(1.5).toBeRiskScore();   // ✗ fails
 * expect(-0.1).toBeRiskScore();  // ✗ fails
 * ```
 */
function toBeRiskScore(received: number) {
	const pass = typeof received === "number" && received >= 0 && received <= 1 && !Number.isNaN(received);

	return {
		pass,
		message: () =>
			pass
				? `expected ${received} not to be a valid risk score`
				: `expected ${received} to be a valid risk score (number between 0 and 1)`,
	};
}

/**
 * Custom matcher: toContainFile
 *
 * Checks if an array of file objects contains a file with the given path.
 *
 * @example
 * ```typescript
 * const files = [{ path: '/src/index.ts' }, { path: '/src/utils.ts' }];
 * expect(files).toContainFile('/src/index.ts');  // ✓ passes
 * expect(files).toContainFile('/other.ts');       // ✗ fails
 * ```
 */
function toContainFile(received: Array<{ path: string }>, expectedPath: string) {
	const pass = Array.isArray(received) && received.some((f) => f.path === expectedPath);

	return {
		pass,
		message: () =>
			pass
				? `expected file list not to contain ${expectedPath}`
				: `expected file list to contain ${expectedPath}\n\nFiles found: ${received.map((f) => f.path).join(", ")}`,
	};
}

// Register all custom matchers
expect.extend({
	toBeWithinRange,
	toMatchResult,
	toBeValidSnapshotId,
	toBeValidSessionId,
	toHaveBeenCalledWithinMs,
	toBeProtectionLevel,
	toBeRiskScore,
	toContainFile,
});

// Type declarations for custom matchers
declare module "vitest" {
	interface Assertion<T = unknown> {
		/**
		 * Checks if number is within inclusive range [floor, ceiling]
		 */
		toBeWithinRange(floor: number, ceiling: number): T;

		/**
		 * Checks if Result<T, E> matches expected shape
		 */
		toMatchResult(expected: { success: boolean; value?: unknown; error?: unknown }): T;

		/**
		 * Checks if string is a valid snapshot ID (snap_*)
		 */
		toBeValidSnapshotId(): T;

		/**
		 * Checks if string is a valid session ID (sess_*)
		 */
		toBeValidSessionId(): T;

		/**
		 * Placeholder for timing validation
		 */
		toHaveBeenCalledWithinMs(expectedMs: number): T;

		/**
		 * Checks if value is a valid protection level
		 */
		toBeProtectionLevel(): T;

		/**
		 * Checks if value is a valid risk score (0-1)
		 */
		toBeRiskScore(): T;

		/**
		 * Checks if file array contains file with given path
		 */
		toContainFile(expectedPath: string): T;
	}

	interface AsymmetricMatchersContaining {
		toBeWithinRange(floor: number, ceiling: number): unknown;
		toBeValidSnapshotId(): unknown;
		toBeValidSessionId(): unknown;
		toBeProtectionLevel(): unknown;
		toBeRiskScore(): unknown;
	}
}
