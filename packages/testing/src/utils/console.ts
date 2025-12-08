/**
 * Console Control Utilities for Tests
 *
 * Provides utilities to silence, restore, and capture console output during tests.
 * Useful for keeping test output clean while still being able to debug when needed.
 *
 * @example
 * ```typescript
 * import { silenceConsole, restoreConsole, captureConsole } from '@snapback/testing/utils/console';
 *
 * // Silence all console output
 * silenceConsole();
 *
 * // Restore original console
 * restoreConsole();
 *
 * // Capture console calls for assertions
 * const capture = captureConsole();
 * console.log('test');
 * expect(capture.logs).toContain('test');
 * ```
 */

import { vi } from "vitest";

/**
 * Original console methods stored for restoration
 */
const originalConsole = {
	log: console.log,
	warn: console.warn,
	error: console.error,
	debug: console.debug,
	info: console.info,
	trace: console.trace,
};

/**
 * Silence all console output
 *
 * Replaces console methods with no-op functions.
 * Call restoreConsole() to restore original behavior.
 *
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * silenceConsole();
 * console.log('This will not appear'); // Silenced
 *
 * silenceConsole({ keepErrors: true });
 * console.error('This WILL appear'); // Shown
 * ```
 */
export function silenceConsole(
	options: {
		/**
		 * Keep console.error enabled for debugging
		 * @default false
		 */
		keepErrors?: boolean;
		/**
		 * Keep console.warn enabled
		 * @default false
		 */
		keepWarnings?: boolean;
	} = {},
): void {
	const { keepErrors = false, keepWarnings = false } = options;

	console.log = vi.fn();
	console.debug = vi.fn();
	console.info = vi.fn();
	console.trace = vi.fn();

	if (!keepWarnings) {
		console.warn = vi.fn();
	}

	if (!keepErrors) {
		console.error = vi.fn();
	}
}

/**
 * Restore original console behavior
 *
 * Undoes the effects of silenceConsole().
 *
 * @example
 * ```typescript
 * silenceConsole();
 * // ... tests ...
 * restoreConsole();
 * ```
 */
export function restoreConsole(): void {
	console.log = originalConsole.log;
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	console.debug = originalConsole.debug;
	console.info = originalConsole.info;
	console.trace = originalConsole.trace;
}

/**
 * Console capture result
 */
export interface ConsoleCaptureResult {
	/**
	 * All console.log calls
	 */
	logs: string[];
	/**
	 * All console.warn calls
	 */
	warnings: string[];
	/**
	 * All console.error calls
	 */
	errors: string[];
	/**
	 * All console.debug calls
	 */
	debugs: string[];
	/**
	 * All console.info calls
	 */
	infos: string[];
	/**
	 * Restore original console and stop capturing
	 */
	restore: () => void;
	/**
	 * Clear all captured output
	 */
	clear: () => void;
	/**
	 * Check if any errors were logged
	 */
	hasErrors: () => boolean;
	/**
	 * Check if any warnings were logged
	 */
	hasWarnings: () => boolean;
}

/**
 * Capture console output for assertions
 *
 * Replaces console methods with capturing functions that store output.
 * Useful for testing that code logs expected messages.
 *
 * @returns Capture result with arrays of logged messages
 *
 * @example
 * ```typescript
 * const capture = captureConsole();
 *
 * console.log('Hello');
 * console.warn('Warning!');
 * console.error('Error!');
 *
 * expect(capture.logs).toContain('Hello');
 * expect(capture.hasWarnings()).toBe(true);
 * expect(capture.errors).toHaveLength(1);
 *
 * capture.restore();
 * ```
 */
export function captureConsole(): ConsoleCaptureResult {
	const logs: string[] = [];
	const warnings: string[] = [];
	const errors: string[] = [];
	const debugs: string[] = [];
	const infos: string[] = [];

	// Replace with capturing functions
	console.log = vi.fn((...args: unknown[]) => {
		logs.push(args.map(String).join(" "));
	});

	console.warn = vi.fn((...args: unknown[]) => {
		warnings.push(args.map(String).join(" "));
	});

	console.error = vi.fn((...args: unknown[]) => {
		errors.push(args.map(String).join(" "));
	});

	console.debug = vi.fn((...args: unknown[]) => {
		debugs.push(args.map(String).join(" "));
	});

	console.info = vi.fn((...args: unknown[]) => {
		infos.push(args.map(String).join(" "));
	});

	return {
		logs,
		warnings,
		errors,
		debugs,
		infos,
		restore: restoreConsole,
		clear: () => {
			logs.length = 0;
			warnings.length = 0;
			errors.length = 0;
			debugs.length = 0;
			infos.length = 0;
		},
		hasErrors: () => errors.length > 0,
		hasWarnings: () => warnings.length > 0,
	};
}

/**
 * Run function with console output suppressed
 *
 * Temporarily silences console during function execution,
 * then restores original behavior.
 *
 * @param fn - Function to run with silenced console
 * @param options - Silence options
 * @returns Function result
 *
 * @example
 * ```typescript
 * const result = await withSilentConsole(async () => {
 *   // This won't pollute test output
 *   await noisyOperation();
 *   return 'done';
 * });
 * ```
 */
export async function withSilentConsole<T>(
	fn: () => T | Promise<T>,
	options: Parameters<typeof silenceConsole>[0] = {},
): Promise<T> {
	silenceConsole(options);
	try {
		return await fn();
	} finally {
		restoreConsole();
	}
}

/**
 * Run function with console capture
 *
 * Captures console output during function execution,
 * returns both result and captured output.
 *
 * @param fn - Function to run with captured console
 * @returns Object with result and captured output
 *
 * @example
 * ```typescript
 * const { result, capture } = await withCapturedConsole(async () => {
 *   console.log('Processing...');
 *   return doWork();
 * });
 *
 * expect(capture.logs).toContain('Processing...');
 * ```
 */
export async function withCapturedConsole<T>(
	fn: () => T | Promise<T>,
): Promise<{ result: T; capture: Omit<ConsoleCaptureResult, "restore" | "clear"> }> {
	const capture = captureConsole();
	try {
		const result = await fn();
		return {
			result,
			capture: {
				logs: [...capture.logs],
				warnings: [...capture.warnings],
				errors: [...capture.errors],
				debugs: [...capture.debugs],
				infos: [...capture.infos],
				hasErrors: capture.hasErrors,
				hasWarnings: capture.hasWarnings,
			},
		};
	} finally {
		capture.restore();
	}
}

/**
 * Assert no console errors during function execution
 *
 * Runs function and fails test if any console.error calls occur.
 *
 * @param fn - Function to run
 * @param message - Optional failure message
 * @returns Function result
 *
 * @example
 * ```typescript
 * await expectNoConsoleErrors(async () => {
 *   await initializeApp();
 * }, 'App initialization should not log errors');
 * ```
 */
export async function expectNoConsoleErrors<T>(fn: () => T | Promise<T>, message?: string): Promise<T> {
	const { result, capture } = await withCapturedConsole(fn);

	if (capture.hasErrors()) {
		const errorMsg = message ?? "Expected no console.error calls";
		throw new Error(`${errorMsg}\n\nConsole errors:\n${capture.errors.join("\n")}`);
	}

	return result;
}

/**
 * Assert no console warnings during function execution
 *
 * Runs function and fails test if any console.warn calls occur.
 *
 * @param fn - Function to run
 * @param message - Optional failure message
 * @returns Function result
 *
 * @example
 * ```typescript
 * await expectNoConsoleWarnings(async () => {
 *   await initializeApp();
 * }, 'App initialization should not log warnings');
 * ```
 */
export async function expectNoConsoleWarnings<T>(fn: () => T | Promise<T>, message?: string): Promise<T> {
	const { result, capture } = await withCapturedConsole(fn);

	if (capture.hasWarnings()) {
		const warnMsg = message ?? "Expected no console.warn calls";
		throw new Error(`${warnMsg}\n\nConsole warnings:\n${capture.warnings.join("\n")}`);
	}

	return result;
}
