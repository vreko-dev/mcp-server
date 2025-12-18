/**
 * Minimal logging interface for public packages
 *
 * This interface allows public packages (@snapback/sdk, @snapback/core, @snapback/mcp-server)
 * to log without depending on the private @snapback/infrastructure package.
 *
 * Browser-safe: No dynamic requires, no node:fs dependencies
 * Server packages can enhance this with infrastructure logger via DI using registerLoggerFactory()
 *
 * Private packages can use the full @snapback/infrastructure implementation,
 * which provides advanced features like structured logging, log levels, etc.
 */

// Global logger factory registry for server-side enhancement
let _loggerFactory: ((options: LoggerOptions) => Logger) | null = null;

/**
 * Register an enhanced logger factory (called by server packages)
 * This allows @snapback/infrastructure to enhance logging without
 * being a compile-time dependency.
 *
 * @example
 * ```typescript
 * // In @snapback/infrastructure/src/index.ts
 * import { registerLoggerFactory } from '@snapback/contracts'
 * registerLoggerFactory((options) => createPinoLogger(options))
 * ```
 */
export function registerLoggerFactory(factory: (options: LoggerOptions) => Logger): void {
	_loggerFactory = factory;
}

/**
 * Get the registered logger factory, if any
 * @internal
 */
function getLoggerFactory(): ((options: LoggerOptions) => Logger) | null {
	return _loggerFactory;
}

export interface Logger {
	/**
	 * Log a debug message (verbose, for development)
	 */
	debug(message: string, meta?: Record<string, unknown>): void;

	/**
	 * Log an info message (general informational messages)
	 */
	info(message: string, meta?: Record<string, unknown>): void;

	/**
	 * Log a warning message (non-critical issues)
	 */
	warn(message: string, meta?: Record<string, unknown>): void;

	/**
	 * Log an error message (errors and exceptions)
	 */
	error(message: string, meta?: Record<string, unknown> | Error): void;
}

/**
 * Log levels
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	SILENT = 4,
}

/**
 * Logger options
 */
export interface LoggerOptions {
	/**
	 * Name/context for the logger (e.g., 'sdk', 'mcp-server')
	 */
	name: string;

	/**
	 * Minimum log level to output
	 * @default LogLevel.INFO
	 */
	level?: LogLevel;

	/**
	 * Whether to include timestamps
	 * @default false
	 */
	timestamps?: boolean;
}

/**
 * Enhanced logger that uses registered factory when available,
 * otherwise falls back to minimal console-based implementation
 *
 * @example
 * ```typescript
 * import { createLogger } from '@snapback/contracts'
 *
 * const logger = createLogger({ name: 'sdk' })
 * logger.info('SDK initialized')
 * logger.error('Failed to create snapshot', { error: err })
 * ```
 */
export function createLogger(options: LoggerOptions): Logger {
	// If a logger factory has been registered (by @snapback/infrastructure), use it
	const factory = getLoggerFactory();
	if (factory) {
		return factory(options);
	}

	// Fallback to minimal console implementation
	const { name, level = LogLevel.INFO, timestamps = false } = options;

	const formatMessage = (levelStr: string, message: string): string => {
		const prefix = timestamps ? `[${new Date().toISOString()}] ` : "";
		return `${prefix}[${name}] ${levelStr}: ${message}`;
	};

	const formatMeta = (meta?: Record<string, unknown> | Error): string => {
		if (!meta) {
			return "";
		}

		if (meta instanceof Error) {
			return `\n  Error: ${meta.message}\n  Stack: ${meta.stack}`;
		}

		try {
			return `
  ${JSON.stringify(meta, null, 2)}`;
		} catch {
			return "\n  [Circular or non-serializable metadata]";
		}
	};

	return {
		debug(message: string, meta?: Record<string, unknown>): void {
			if (level <= LogLevel.DEBUG) {
				console.debug(formatMessage("DEBUG", message) + formatMeta(meta));
			}
		},

		info(message: string, meta?: Record<string, unknown>): void {
			if (level <= LogLevel.INFO) {
				console.info(formatMessage("INFO", message) + formatMeta(meta));
			}
		},

		warn(message: string, meta?: Record<string, unknown>): void {
			if (level <= LogLevel.WARN) {
				console.warn(formatMessage("WARN", message) + formatMeta(meta));
			}
		},

		error(message: string, meta?: Record<string, unknown> | Error): void {
			if (level <= LogLevel.ERROR) {
				console.error(formatMessage("ERROR", message) + formatMeta(meta));
			}
		},
	};
}

/**
 * No-op logger (silences all logs)
 *
 * Useful for testing or when logs should be completely disabled.
 */
export function createSilentLogger(): Logger {
	return {
		debug: () => {},
		info: () => {},
		warn: () => {},
		error: () => {},
	};
}
