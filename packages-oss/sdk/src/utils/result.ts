/**
 * Result Type for Type-Safe Error Handling
 *
 * Implements the Result pattern inspired by Rust and functional programming.
 * Provides type-safe error handling without exceptions.
 *
 * @module result
 */

import { toError } from "./errorHelpers.js";

// =============================================================================
// RESULT TYPE DEFINITION
// =============================================================================

/**
 * Discriminated union type for success/failure outcomes
 *
 * @example
 * ```typescript
 * type MyResult = Result<User, UserNotFoundError>;
 *
 * // Success case
 * const success: MyResult = { success: true, value: user };
 *
 * // Error case
 * const failure: MyResult = { success: false, error: new UserNotFoundError() };
 * ```
 */
export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

// =============================================================================
// CONSTRUCTORS
// =============================================================================

/**
 * Create a success Result
 *
 * @param value - The success value
 * @returns Result with success=true
 *
 * @example
 * ```typescript
 * const result = ok({ id: '123', name: 'Test' });
 * // { success: true, value: { id: '123', name: 'Test' } }
 * ```
 */
export function ok<T>(value: T): Result<T, never> {
	return { success: true, value };
}

/**
 * Create a failure Result
 *
 * @param error - The error value
 * @returns Result with success=false
 *
 * @example
 * ```typescript
 * const result = err(new NotFoundError('User not found'));
 * // { success: false, error: NotFoundError }
 * ```
 */
export function err<E>(error: E): Result<never, E> {
	return { success: false, error };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if Result is success
 *
 * @param result - Result to check
 * @returns True if success, narrows type to { success: true; value: T }
 *
 * @example
 * ```typescript
 * if (isOk(result)) {
 *   console.log(result.value); // TypeScript knows value exists
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
	return result.success === true;
}

/**
 * Check if Result is failure
 *
 * @param result - Result to check
 * @returns True if failure, narrows type to { success: false; error: E }
 *
 * @example
 * ```typescript
 * if (isErr(result)) {
 *   console.error(result.error.message); // TypeScript knows error exists
 * }
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
	return result.success === false;
}

// =============================================================================
// TRANSFORMATIONS
// =============================================================================

/**
 * Map the success value of a Result
 *
 * @param result - Result to transform
 * @param fn - Function to apply to success value
 * @returns New Result with transformed value
 *
 * @example
 * ```typescript
 * const userResult = ok({ id: '123', name: 'Alice' });
 * const nameResult = map(userResult, u => u.name);
 * // { success: true, value: 'Alice' }
 * ```
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
	if (isOk(result)) {
		return ok(fn(result.value));
	}
	return result;
}

/**
 * Map the error value of a Result
 *
 * @param result - Result to transform
 * @param fn - Function to apply to error value
 * @returns New Result with transformed error
 *
 * @example
 * ```typescript
 * const result = err(new Error('original'));
 * const mapped = mapErr(result, e => new WrappedError(e));
 * ```
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
	if (isErr(result)) {
		return err(fn(result.error));
	}
	return result;
}

/**
 * Chain Result-returning operations (flatMap/bind)
 *
 * @param result - Initial Result
 * @param fn - Function that returns a Result
 * @returns New Result from the chain
 *
 * @example
 * ```typescript
 * const result = andThen(
 *   getUser(id),
 *   user => getProfile(user.id)
 * );
 * ```
 */
export function andThen<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
	if (isOk(result)) {
		return fn(result.value);
	}
	return result;
}

// =============================================================================
// UNWRAPPING
// =============================================================================

/**
 * Get the success value or throw if error
 *
 * @param result - Result to unwrap
 * @returns The success value
 * @throws The error if Result is failure
 *
 * @example
 * ```typescript
 * const value = unwrap(result); // Throws if error
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>): T {
	if (isOk(result)) {
		return result.value;
	}
	if (result.error instanceof Error) {
		throw result.error;
	}
	throw new Error(String(result.error));
}

/**
 * Get the success value or return a default
 *
 * @param result - Result to unwrap
 * @param defaultValue - Value to return if error
 * @returns The success value or default
 *
 * @example
 * ```typescript
 * const name = unwrapOr(getUser(id), { name: 'Unknown' }).name;
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	if (isOk(result)) {
		return result.value;
	}
	return defaultValue;
}

/**
 * Get the success value or compute a default from the error
 *
 * @param result - Result to unwrap
 * @param fn - Function to compute default from error
 * @returns The success value or computed default
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
	if (isOk(result)) {
		return result.value;
	}
	return fn(result.error);
}

// =============================================================================
// PROMISE INTEGRATION
// =============================================================================

/**
 * Convert a Promise to a Result
 *
 * @param promise - Promise to convert
 * @returns Promise of Result
 *
 * @example
 * ```typescript
 * const result = await fromPromise(fetch('/api/users'));
 * if (isErr(result)) {
 *   console.error('Network error:', result.error.message);
 * }
 * ```
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
	try {
		const value = await promise;
		return ok(value);
	} catch (error) {
		return err(toError(error));
	}
}

/**
 * Convert a Promise to a Result with custom error mapper
 *
 * @param promise - Promise to convert
 * @param errorMapper - Function to map caught error
 * @returns Promise of Result
 */
export async function fromPromiseWith<T, E>(
	promise: Promise<T>,
	errorMapper: (error: unknown) => E,
): Promise<Result<T, E>> {
	try {
		const value = await promise;
		return ok(value);
	} catch (error) {
		return err(errorMapper(error));
	}
}

// =============================================================================
// COMBINATORS
// =============================================================================

/**
 * Combine multiple Results into a single Result of array
 *
 * @param results - Array of Results
 * @returns Result containing array of values, or first error
 *
 * @example
 * ```typescript
 * const results = [ok(1), ok(2), ok(3)];
 * const combined = sequence(results);
 * // { success: true, value: [1, 2, 3] }
 *
 * const withError = [ok(1), err('fail'), ok(3)];
 * const failed = sequence(withError);
 * // { success: false, error: 'fail' }
 * ```
 */
export function sequence<T, E>(results: Result<T, E>[]): Result<T[], E> {
	const values: T[] = [];
	for (const result of results) {
		if (isErr(result)) {
			return result;
		}
		values.push(result.value);
	}
	return ok(values);
}

/**
 * Try multiple fallback operations until one succeeds
 *
 * @param operations - Array of Result-returning operations
 * @returns First success or last error
 */
export function tryAll<T, E>(operations: Array<() => Result<T, E>>): Result<T, E[]> {
	const errors: E[] = [];
	for (const op of operations) {
		const result = op();
		if (isOk(result)) {
			return result;
		}
		errors.push(result.error);
	}
	return err(errors);
}

// =============================================================================
// SIDE EFFECTS
// =============================================================================

/**
 * Execute side effect on success without changing the Result
 *
 * @param result - Result to tap
 * @param fn - Side effect function
 * @returns Original Result unchanged
 *
 * @example
 * ```typescript
 * const result = tap(getUserResult, user => {
 *   analytics.track('user_fetched', { id: user.id });
 * });
 * ```
 */
export function tap<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E> {
	if (isOk(result)) {
		fn(result.value);
	}
	return result;
}

/**
 * Execute side effect on error without changing the Result
 *
 * @param result - Result to tap
 * @param fn - Side effect function
 * @returns Original Result unchanged
 */
export function tapErr<T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E> {
	if (isErr(result)) {
		fn(result.error);
	}
	return result;
}

// =============================================================================
// PATTERN MATCHING
// =============================================================================

/**
 * Pattern match on Result for exhaustive handling
 *
 * @param result - Result to match
 * @param handlers - Object with ok and err handlers
 * @returns Result of the matched handler
 *
 * @example
 * ```typescript
 * const message = match(result, {
 *   ok: user => `Welcome, ${user.name}!`,
 *   err: error => `Error: ${error.message}`,
 * });
 * ```
 */
export function match<T, E, R>(
	result: Result<T, E>,
	handlers: {
		ok: (value: T) => R;
		err: (error: E) => R;
	},
): R {
	if (isOk(result)) {
		return handlers.ok(result.value);
	}
	return handlers.err(result.error);
}
