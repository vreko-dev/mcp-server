/**
 * Simple structured logger for SessionManager
 * Based on observability best practices (Azure/AWS circuit breaker patterns)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
	[key: string]: unknown;
}

/**
 * Structured logger interface
 * In production, this should be replaced with @snapback/infrastructure logger
 */
class SessionLogger {
	private enabled: boolean;

	constructor(enabled = true) {
		this.enabled = enabled;
	}

	private log(level: LogLevel, message: string, context?: LogContext): void {
		if (!this.enabled) return;

		const timestamp = new Date().toISOString();
		const logEntry = {
			timestamp,
			level,
			message,
			...context,
		};

		// In production, send to structured logging service
		// For now, use console with JSON formatting
		const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

		method(JSON.stringify(logEntry));
	}

	debug(message: string, context?: LogContext): void {
		this.log("debug", message, context);
	}

	info(message: string, context?: LogContext): void {
		this.log("info", message, context);
	}

	warn(message: string, context?: LogContext): void {
		this.log("warn", message, context);
	}

	error(message: string, context?: LogContext): void {
		this.log("error", message, context);
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}
}

// Singleton instance
export const logger = new SessionLogger(process.env.NODE_ENV !== "test");
