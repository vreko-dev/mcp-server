/**
 * Platform-agnostic error handling utilities
 *
 * Provides utilities for converting any value to an Error object,
 * ensuring consistent error handling across all SnapBack applications.
 *
 * @module errorHelpers
 */
/**
 * Convert any value to an Error object
 *
 * This function ensures that any value can be safely converted to an Error instance,
 * which is useful for error handling in catch blocks where the caught value might not be an Error.
 *
 * @param error - The value to convert
 * @returns An Error object
 *
 * @example
 * ```typescript
 * try {
 *   // Some code that might throw
 * } catch (error) {
 *   const err = toError(error);
 *   console.log(err.message);
 * }
 * ```
 */
export declare function toError(error: unknown): Error;
//# sourceMappingURL=errorHelpers.d.ts.map
