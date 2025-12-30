/**
 * Runtime Invariant System
 *
 * Provides reporting-enabled assertions that:
 * 1. Throw in development (fail fast)
 * 2. Report to telemetry in production (graceful degradation)
 * 3. Track violation patterns for automated learning
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Invariant violation details for reporting
 */
export interface InvariantViolation {
	/** Unique identifier for this invariant */
	invariantId: string;
	/** Human-readable message */
	message: string;
	/** File where violation occurred */
	file?: string;
	/** Line number */
	line?: number;
	/** Additional context */
	context?: Record<string, unknown>;
	/** Timestamp */
	timestamp: number;
	/** Stack trace (development only) */
	stack?: string;
}

/**
 * Invariant reporter interface
 */
export interface InvariantReporter {
	/** Report a violation */
	report(violation: InvariantViolation): void;
	/** Flush pending reports */
	flush?(): Promise<void>;
}

/**
 * Invariant configuration
 */
export interface InvariantConfig {
	/** Environment: development throws, production reports */
	env: "development" | "production" | "test";
	/** Custom reporter (default: console) */
	reporter?: InvariantReporter;
	/** Enable stack traces */
	includeStack?: boolean;
}

// =============================================================================
// Default Configuration
// =============================================================================

let globalConfig: InvariantConfig = {
	env: (process.env.NODE_ENV as InvariantConfig["env"]) || "development",
	includeStack: true,
};

const violationCounts = new Map<string, number>();

/**
 * Console reporter for development
 */
const consoleReporter: InvariantReporter = {
	report(violation) {
		console.error(`[INVARIANT VIOLATION] ${violation.invariantId}: ${violation.message}`);
		if (violation.file) {
			console.error(`  at ${violation.file}${violation.line ? `:${violation.line}` : ""}`);
		}
		if (violation.context) {
			console.error("  context:", violation.context);
		}
	},
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Configure the invariant system
 */
export function configureInvariant(config: Partial<InvariantConfig>): void {
	globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current invariant configuration
 */
export function getInvariantConfig(): InvariantConfig {
	return { ...globalConfig };
}

/**
 * Reset violation counts (for testing)
 */
export function resetViolationCounts(): void {
	violationCounts.clear();
}

/**
 * Get violation counts by invariant ID
 */
export function getViolationCounts(): Map<string, number> {
	return new Map(violationCounts);
}

/**
 * Core invariant function with reporting
 *
 * @param condition - Condition that must be true
 * @param invariantId - Unique identifier for this invariant
 * @param message - Human-readable message if condition fails
 * @param context - Optional additional context
 *
 * @example
 * ```typescript
 * // Basic usage
 * invariant(user != null, "user-exists", "User must exist");
 *
 * // With context
 * invariant(
 *   storage.path.startsWith(workspaceRoot),
 *   "storage-path-valid",
 *   "Storage path must be within workspace",
 *   { path: storage.path, workspaceRoot }
 * );
 * ```
 */
export function invariant(
	condition: unknown,
	invariantId: string,
	message: string,
	context?: Record<string, unknown>,
): asserts condition {
	if (condition) {
		return;
	}

	// Track violation count
	const count = (violationCounts.get(invariantId) || 0) + 1;
	violationCounts.set(invariantId, count);

	// Build violation details
	const violation: InvariantViolation = {
		invariantId,
		message,
		context,
		timestamp: Date.now(),
	};

	// Add stack trace if configured
	if (globalConfig.includeStack) {
		const err = new Error();
		violation.stack = err.stack;

		// Extract file/line from stack
		const stackLines = err.stack?.split("\n") || [];
		const callerLine = stackLines[2]; // Skip Error and invariant lines
		const match = callerLine?.match(/at\s+(?:.+?\s+)?\(?(.+?):(\d+):\d+\)?/);
		if (match) {
			violation.file = match[1];
			violation.line = Number.parseInt(match[2], 10);
		}
	}

	// Report violation
	const reporter = globalConfig.reporter || consoleReporter;
	reporter.report(violation);

	// Behavior based on environment
	if (globalConfig.env === "development" || globalConfig.env === "test") {
		// Development: throw immediately
		const err = new Error(`Invariant violation [${invariantId}]: ${message}`);
		err.name = "InvariantError";
		throw err;
	}

	// Production: log but don't throw (graceful degradation)
	// The reporter should send to telemetry
}

/**
 * Soft invariant - warns instead of throwing in development
 *
 * Use for conditions that indicate a problem but shouldn't crash the app.
 */
export function softInvariant(
	condition: unknown,
	invariantId: string,
	message: string,
	context?: Record<string, unknown>,
): boolean {
	if (condition) {
		return true;
	}

	// Track violation count
	const count = (violationCounts.get(invariantId) || 0) + 1;
	violationCounts.set(invariantId, count);

	// Build violation details
	const violation: InvariantViolation = {
		invariantId,
		message: `[SOFT] ${message}`,
		context,
		timestamp: Date.now(),
	};

	// Report violation
	const reporter = globalConfig.reporter || consoleReporter;
	reporter.report(violation);

	return false;
}

/**
 * Type guard invariant - asserts type with runtime check
 *
 * @example
 * ```typescript
 * const maybeUser = getUser();
 * typeInvariant(maybeUser, isUser, "user-type", "Expected User type");
 * // maybeUser is now typed as User
 * ```
 */
export function typeInvariant<T>(
	value: unknown,
	guard: (v: unknown) => v is T,
	invariantId: string,
	message: string,
	context?: Record<string, unknown>,
): asserts value is T {
	invariant(guard(value), invariantId, message, {
		...context,
		actualType: typeof value,
		actualValue: value,
	});
}

/**
 * Create a scoped invariant function for a specific domain
 *
 * @example
 * ```typescript
 * const storageInvariant = createScopedInvariant("storage");
 * storageInvariant(path.exists, "path-exists", "Storage path must exist");
 * // Reports as "storage:path-exists"
 * ```
 */
export function createScopedInvariant(scope: string) {
	return function scopedInvariant(
		condition: unknown,
		id: string,
		message: string,
		context?: Record<string, unknown>,
	): asserts condition {
		invariant(condition, `${scope}:${id}`, message, context);
	};
}

// =============================================================================
// Predefined Invariant Helpers
// =============================================================================

/**
 * Assert value is not null or undefined
 */
export function assertDefined<T>(
	value: T | null | undefined,
	invariantId: string,
	message: string,
): asserts value is T {
	invariant(value != null, invariantId, message, { value });
}

/**
 * Assert value is a non-empty string
 */
export function assertNonEmptyString(value: unknown, invariantId: string, message: string): asserts value is string {
	invariant(typeof value === "string" && value.length > 0, invariantId, message, {
		actualType: typeof value,
		length: typeof value === "string" ? value.length : "N/A",
	});
}

/**
 * Assert value is a positive number
 */
export function assertPositiveNumber(value: unknown, invariantId: string, message: string): asserts value is number {
	invariant(typeof value === "number" && value > 0 && !Number.isNaN(value), invariantId, message, {
		actualType: typeof value,
		value,
	});
}

/**
 * Assert array is non-empty
 */
export function assertNonEmptyArray<T>(value: unknown, invariantId: string, message: string): asserts value is T[] {
	invariant(Array.isArray(value) && value.length > 0, invariantId, message, {
		isArray: Array.isArray(value),
		length: Array.isArray(value) ? value.length : "N/A",
	});
}

/**
 * Assert path is within allowed root (prevents path traversal)
 */
export function assertPathWithinRoot(path: string, root: string, invariantId: string): void {
	const normalizedPath = path.replace(/\\/g, "/");
	const normalizedRoot = root.replace(/\\/g, "/");

	invariant(
		normalizedPath.startsWith(normalizedRoot) && !normalizedPath.includes(".."),
		invariantId,
		"Path must be within allowed root directory",
		{ path, root },
	);
}
