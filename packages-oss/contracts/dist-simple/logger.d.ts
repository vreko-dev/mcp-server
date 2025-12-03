/**
 * Minimal logging interface for public packages
 *
 * This interface allows public packages (@snapback/sdk, @snapback/core, @snapback/mcp-server)
 * to log without depending on the private @snapback/infrastructure package.
 *
 * Private packages can use the full @snapback/infrastructure implementation,
 * which provides advanced features like structured logging, log levels, etc.
 */
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
export declare enum LogLevel {
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
 * Enhanced logger that uses infrastructure logger when available,
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
export declare function createLogger(options: LoggerOptions): Logger;
/**
 * No-op logger (silences all logs)
 *
 * Useful for testing or when logs should be completely disabled.
 */
export declare function createSilentLogger(): Logger;
