/**
 * SnapBack Error Hierarchy
 *
 * Provides structured, type-safe error classes for the entire SnapBack platform.
 * Each error includes a code, message, optional context, and optional cause for chaining.
 *
 * @module errors
 */

// =============================================================================
// BASE ERROR CLASS
// =============================================================================

/**
 * Base error class for all SnapBack errors
 *
 * @example
 * ```typescript
 * throw new SnapBackError('Operation failed', 'OPERATION_FAILED', { userId: '123' });
 * ```
 */
export class SnapBackError extends Error {
	public readonly timestamp: number;

	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = this.constructor.name;
		this.timestamp = Date.now();

		// Maintain stack trace in V8 engines (Node.js)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Serialize error to JSON for logging/API responses
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
			timestamp: this.timestamp,
			stack: this.stack,
			cause: this.cause
				? {
						name: this.cause.name,
						message: this.cause.message,
						stack: this.cause.stack,
					}
				: undefined,
		};
	}
}

// =============================================================================
// SNAPSHOT ERRORS
// =============================================================================

/**
 * Base class for snapshot-related errors
 */
export class SnapshotError extends SnapBackError {
	constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
		super(message, code, context, cause);
	}
}

/**
 * Snapshot not found in storage
 */
export class SnapshotNotFoundError extends SnapshotError {
	constructor(
		public readonly snapshotId: string,
		cause?: Error,
	) {
		super(`Snapshot not found: ${snapshotId}`, "SNAPSHOT_NOT_FOUND", { snapshotId }, cause);
	}
}

/**
 * Snapshot creation failed
 */
export class SnapshotCreationError extends SnapshotError {
	constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
		super(message, "SNAPSHOT_CREATION_ERROR", context, cause);
	}
}

/**
 * Duplicate snapshot detected (deduplication)
 */
export class SnapshotDuplicateError extends SnapshotError {
	constructor(
		public readonly existingId?: string,
		context?: Record<string, unknown>,
	) {
		super(
			existingId ? `Duplicate snapshot detected (existing: ${existingId})` : "Duplicate snapshot detected",
			"SNAPSHOT_DUPLICATE",
			{ existingId, ...context },
		);
	}
}

/**
 * Snapshot is protected and cannot be modified/deleted
 */
export class SnapshotProtectedError extends SnapshotError {
	constructor(public readonly snapshotId: string) {
		super(`Cannot modify protected snapshot: ${snapshotId}`, "SNAPSHOT_PROTECTED", { snapshotId });
	}
}

/**
 * Snapshot restore failed
 */
export class SnapshotRestoreError extends SnapshotError {
	constructor(
		message: string,
		public readonly snapshotId: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, "SNAPSHOT_RESTORE_ERROR", { snapshotId, ...context }, cause);
	}
}

/**
 * Snapshot version incompatible
 */
export class SnapshotVersionError extends SnapshotError {
	constructor(
		public readonly version: string,
		public readonly supportedVersions: string[],
	) {
		super(
			`Incompatible snapshot version: ${version}. Supported: ${supportedVersions.join(", ")}`,
			"SNAPSHOT_VERSION_INCOMPATIBLE",
			{ version, supportedVersions },
		);
	}
}

/**
 * Snapshot verification failed (checksum mismatch)
 */
export class SnapshotVerificationError extends SnapshotError {
	constructor(
		public readonly filePath: string,
		public readonly expected: string,
		public readonly actual: string,
	) {
		super(`Verification failed for ${filePath}: checksum mismatch`, "SNAPSHOT_VERIFICATION_FAILED", {
			filePath,
			expected,
			actual,
		});
	}
}

// =============================================================================
// STORAGE ERRORS
// =============================================================================

/**
 * Base class for storage-related errors
 */
export class StorageError extends SnapBackError {
	constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
		super(message, code, context, cause);
	}
}

/**
 * Storage is full
 */
export class StorageFullError extends StorageError {
	constructor(
		public readonly required: number,
		public readonly available: number,
		cause?: Error,
	) {
		super(
			`Storage full: ${required}MB required, ${available}MB available`,
			"STORAGE_FULL",
			{ required, available, retryable: false },
			cause,
		);
	}
}

/**
 * Storage resource is locked
 */
export class StorageLockError extends StorageError {
	constructor(
		public readonly resource: string,
		cause?: Error,
	) {
		super(`Resource locked: ${resource}`, "STORAGE_LOCK", { resource, retryable: true }, cause);
	}
}

/**
 * Storage IO error
 */
export class StorageIOError extends StorageError {
	constructor(
		message: string,
		public readonly path?: string,
		cause?: Error,
	) {
		super(message, "STORAGE_IO_ERROR", { path }, cause);
	}
}

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

/**
 * Base class for validation errors
 */
export class ValidationError extends SnapBackError {
	constructor(message: string, code = "VALIDATION_ERROR", context?: Record<string, unknown>, cause?: Error) {
		super(message, code, context, cause);
	}
}

/**
 * Input validation failed
 */
export class InputValidationError extends ValidationError {
	constructor(
		message: string,
		public readonly field: string,
		public readonly value?: unknown,
	) {
		super(message, "INPUT_VALIDATION_ERROR", { field, value });
	}
}

/**
 * Path security validation failed
 */
export class PathValidationError extends ValidationError {
	constructor(
		message: string,
		public readonly path: string,
	) {
		super(message, "PATH_VALIDATION_ERROR", { path });
	}
}

/**
 * Missing required content
 */
export class MissingContentError extends ValidationError {
	constructor(public readonly filePath: string) {
		super(`Missing content for file: ${filePath}`, "MISSING_CONTENT", { filePath });
	}
}

// =============================================================================
// API ERRORS
// =============================================================================

/**
 * Base class for API errors
 */
export class ApiError extends SnapBackError {
	constructor(
		message: string,
		code: string,
		public readonly status?: number,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, { status, ...context }, cause);
	}
}

/**
 * API rate limit exceeded
 */
export class RateLimitError extends ApiError {
	constructor(
		public readonly retryAfter: number,
		cause?: Error,
	) {
		super(
			`Rate limit exceeded. Retry after ${retryAfter}ms`,
			"RATE_LIMIT_EXCEEDED",
			429,
			{ retryAfter, retryable: true },
			cause,
		);
	}
}

/**
 * API authentication failed
 */
export class AuthenticationError extends ApiError {
	constructor(message = "Authentication required", cause?: Error) {
		super(message, "AUTHENTICATION_REQUIRED", 401, undefined, cause);
	}
}

/**
 * API authorization failed
 */
export class AuthorizationError extends ApiError {
	constructor(message = "Access denied", cause?: Error) {
		super(message, "ACCESS_DENIED", 403, undefined, cause);
	}
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if error is a SnapBackError
 */
export function isSnapBackError(error: unknown): error is SnapBackError {
	return error instanceof SnapBackError;
}

/**
 * Check if error is a SnapshotError
 */
export function isSnapshotError(error: unknown): error is SnapshotError {
	return error instanceof SnapshotError;
}

/**
 * Check if error is a StorageError
 */
export function isStorageError(error: unknown): error is StorageError {
	return error instanceof StorageError;
}

/**
 * Check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError;
}

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
	if (isSnapBackError(error)) {
		return error.context?.retryable === true;
	}
	return false;
}

// =============================================================================
// ERROR CONVERSION
// =============================================================================

/**
 * Convert unknown error to Error instance
 */
export function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}
	if (typeof error === "string") {
		return new Error(error);
	}
	if (typeof error === "object" && error !== null) {
		if ("message" in error && typeof error.message === "string") {
			return new Error(error.message);
		}
		try {
			return new Error(JSON.stringify(error));
		} catch {
			return new Error(String(error));
		}
	}
	return new Error(String(error));
}

/**
 * Wrap any error in a SnapBackError
 */
export function ensureSnapBackError(
	error: unknown,
	code = "UNKNOWN_ERROR",
	context?: Record<string, unknown>,
): SnapBackError {
	if (error instanceof SnapBackError) {
		return error;
	}
	const baseError = toError(error);
	return new SnapBackError(baseError.message, code, context, baseError);
}
