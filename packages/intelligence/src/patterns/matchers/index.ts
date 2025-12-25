/**
 * Pattern Matchers Index
 *
 * Exports all built-in pattern matchers.
 *
 * @module patterns/matchers
 */

import type { PatternMatcher } from "../types.js";
import { errorHandlingMatchers } from "./error-handling.js";
import { performanceMatchers } from "./performance.js";
import { securityMatchers } from "./security.js";
import { testingMatchers } from "./testing.js";

/**
 * Create all built-in matchers
 */
export function createBuiltInMatchers(): PatternMatcher[] {
	return [...errorHandlingMatchers, ...securityMatchers, ...testingMatchers, ...performanceMatchers];
}

// Re-export individual matcher groups
export { errorHandlingMatchers } from "./error-handling.js";
export { performanceMatchers } from "./performance.js";
export { securityMatchers } from "./security.js";
export { testingMatchers } from "./testing.js";
