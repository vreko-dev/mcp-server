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
export function toError(error: unknown): Error {
	// If it's already an Error (or subclass), return as-is
	if (error instanceof Error) {
		return error;
	}

	// Convert string to Error
	if (typeof error === "string") {
		return new Error(error);
	}

	// Handle objects
	if (typeof error === "object" && error !== null) {
		// If object has a message property that's a string, use it
		if ("message" in error && typeof error.message === "string") {
			return new Error(error.message);
		}

		// Otherwise, try to stringify the object
		try {
			return new Error(JSON.stringify(error));
		} catch (_stringifyError) {
			// If JSON.stringify fails (circular reference), fall back to String()
			return new Error(String(error));
		}
	}

	// For all other types (number, boolean, null, undefined, symbol, etc.)
	return new Error(String(error));
}
