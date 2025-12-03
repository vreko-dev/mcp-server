/**
 * Minimal logging interface for public packages
 *
 * This interface allows public packages (@snapback/sdk, @snapback/core, @snapback/mcp-server)
 * to log without depending on the private @snapback/infrastructure package.
 *
 * Private packages can use the full @snapback/infrastructure implementation,
 * which provides advanced features like structured logging, log levels, etc.
 */
// For private packages, we'll use the infrastructure logger when available
// For public packages, we'll fall back to the minimal console implementation
let infrastructureLogger = null;
try {
	// Try to import the infrastructure logger
	infrastructureLogger = require("@snapback/infrastructure").logger;
} catch (_error) {
	// If infrastructure logger is not available, we'll use the minimal implementation
	infrastructureLogger = null;
}
/**
 * Log levels
 */
export var LogLevel;
(function (LogLevel) {
	LogLevel[(LogLevel["DEBUG"] = 0)] = "DEBUG";
	LogLevel[(LogLevel["INFO"] = 1)] = "INFO";
	LogLevel[(LogLevel["WARN"] = 2)] = "WARN";
	LogLevel[(LogLevel["ERROR"] = 3)] = "ERROR";
	LogLevel[(LogLevel["SILENT"] = 4)] = "SILENT";
})(LogLevel || (LogLevel = {}));
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
export function createLogger(options) {
	// If infrastructure logger is available, use it
	if (infrastructureLogger) {
		// Create a child logger with the specified name
		const childLogger = infrastructureLogger.child({
			module: options.name,
		});
		// Map log levels
		const levelMap = {
			[LogLevel.DEBUG]: "debug",
			[LogLevel.INFO]: "info",
			[LogLevel.WARN]: "warn",
			[LogLevel.ERROR]: "error",
			[LogLevel.SILENT]: "silent",
		};
		// Set the log level if specified
		if (options.level !== undefined) {
			childLogger.level = levelMap[options.level] || "info";
		}
		return {
			debug: (message, meta) => {
				if (
					options.level === undefined ||
					options.level <= LogLevel.DEBUG
				) {
					childLogger.debug(meta, message);
				}
			},
			info: (message, meta) => {
				if (
					options.level === undefined ||
					options.level <= LogLevel.INFO
				) {
					childLogger.info(meta, message);
				}
			},
			warn: (message, meta) => {
				if (
					options.level === undefined ||
					options.level <= LogLevel.WARN
				) {
					childLogger.warn(meta, message);
				}
			},
			error: (message, meta) => {
				if (
					options.level === undefined ||
					options.level <= LogLevel.ERROR
				) {
					if (meta instanceof Error) {
						childLogger.error(meta, message);
					} else {
						childLogger.error(meta, message);
					}
				}
			},
		};
	}
	// Fallback to minimal console implementation
	const { name, level = LogLevel.INFO, timestamps = false } = options;
	const formatMessage = (levelStr, message) => {
		const prefix = timestamps ? `[${new Date().toISOString()}] ` : "";
		return `${prefix}[${name}] ${levelStr}: ${message}`;
	};
	const formatMeta = (meta) => {
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
		debug(message, meta) {
			if (level <= LogLevel.DEBUG) {
				console.debug(
					formatMessage("DEBUG", message) + formatMeta(meta)
				);
			}
		},
		info(message, meta) {
			if (level <= LogLevel.INFO) {
				console.info(formatMessage("INFO", message) + formatMeta(meta));
			}
		},
		warn(message, meta) {
			if (level <= LogLevel.WARN) {
				console.warn(formatMessage("WARN", message) + formatMeta(meta));
			}
		},
		error(message, meta) {
			if (level <= LogLevel.ERROR) {
				console.error(
					formatMessage("ERROR", message) + formatMeta(meta)
				);
			}
		},
	};
}
/**
 * No-op logger (silences all logs)
 *
 * Useful for testing or when logs should be completely disabled.
 */
export function createSilentLogger() {
	return {
		debug: () => {},
		info: () => {},
		warn: () => {},
		error: () => {},
	};
}
