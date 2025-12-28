/**
 * Built-in Advisory Rules
 *
 * Exports all default advisory rules for pattern detection.
 * Rules are used by AdvisoryEngine to generate proactive suggestions.
 *
 * @see Session Feedback Implementation spec
 */

// Pattern Detection Rules
export { AnyTypeRule } from "./AnyTypeRule.js";
export { ConsecutiveModificationRule } from "./ConsecutiveModificationRule.js";
export { ConsoleLogRule } from "./ConsoleLogRule.js";
export { FragileFileRule } from "./FragileFileRule.js";
export { GenericSuggestionsRule } from "./GenericSuggestionsRule.js";
export { LoopDetectionRule } from "./LoopDetectionRule.js";
export { SkippedTestRule } from "./SkippedTestRule.js";
export { ViolationHistoryRule } from "./ViolationHistoryRule.js";
