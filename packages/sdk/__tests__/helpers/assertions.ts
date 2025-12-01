/**
 * Custom matchers and assertions for SDK tests
 */
import { expect } from "vitest";

/**
 * Assert that a value is between min and max (inclusive)
 */
export function expectBetween(value: number, min: number, max: number, message?: string) {
	expect(value, message || `Expected ${value} to be between ${min} and ${max}`).toBeGreaterThanOrEqual(min);
	expect(value, message || `Expected ${value} to be between ${min} and ${max}`).toBeLessThanOrEqual(max);
}

/**
 * Assert that a score is normalized (0-1 range)
 */
export function expectNormalizedScore(score: number, label = "score") {
	expectBetween(score, 0, 1, `Expected ${label} to be normalized (0-1)`);
}

/**
 * Assert that a confidence value is valid (0-1 range)
 */
export function expectValidConfidence(confidence: number) {
	expectNormalizedScore(confidence, "confidence");
}

/**
 * Assert that a timestamp is recent (within last N seconds)
 */
export function expectRecentTimestamp(timestamp: number, maxAgeSeconds = 60) {
	const now = Date.now();
	const age = (now - timestamp) / 1000;
	expect(age).toBeLessThanOrEqual(maxAgeSeconds);
	expect(age).toBeGreaterThanOrEqual(0);
}

/**
 * Assert that an async function completes within timeout
 */
export async function expectCompletesWithin<T>(fn: () => Promise<T>, timeoutMs: number, message?: string): Promise<T> {
	const start = Date.now();
	const result = await fn();
	const duration = Date.now() - start;
	expect(
		duration,
		message || `Expected operation to complete within ${timeoutMs}ms, took ${duration}ms`,
	).toBeLessThanOrEqual(timeoutMs);
	return result;
}

/**
 * Assert that a risk score matches expected severity
 */
export function expectRiskSeverity(score: number, expectedSeverity: "critical" | "high" | "medium" | "low") {
	const severityRanges = {
		critical: [0.8, 1.0],
		high: [0.7, 0.8],
		medium: [0.5, 0.7],
		low: [0, 0.5],
	};

	const [min, max] = severityRanges[expectedSeverity];
	if (expectedSeverity === "critical") {
		expectBetween(score, min, max, "Expected critical severity risk score");
	} else if (expectedSeverity === "high") {
		expectBetween(score, min, max, "Expected high severity risk score");
	} else if (expectedSeverity === "medium") {
		expectBetween(score, min, max, "Expected medium severity risk score");
	} else {
		expectBetween(score, min, max, "Expected low severity risk score");
	}
}

/**
 * Assert that an array has unique elements
 */
export function expectUniqueElements<T>(arr: T[], message?: string) {
	const unique = new Set(arr);
	expect(unique.size, message || "Expected array to have unique elements").toBe(arr.length);
}

/**
 * Assert that an object has required keys
 */
export function expectHasKeys<T extends object>(obj: T, keys: (keyof T)[], message?: string) {
	for (const key of keys) {
		expect(obj, message || `Expected object to have key '${String(key)}'`).toHaveProperty(key);
	}
}

/**
 * Assert that a string matches a pattern
 */
export function expectMatchesPattern(str: string, pattern: RegExp, message?: string) {
	expect(str, message || `Expected string to match pattern ${pattern}`).toMatch(pattern);
}

/**
 * Assert that a collection is sorted
 */
export function expectSorted<T>(arr: T[], compareFn?: (a: T, b: T) => number, message?: string) {
	const sorted = [...arr].sort(compareFn);
	expect(arr, message || "Expected array to be sorted").toEqual(sorted);
}

/**
 * Assert that a value is a valid UUID
 */
export function expectValidUUID(uuid: string) {
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	expectMatchesPattern(uuid, uuidPattern, "Expected valid UUID format");
}
