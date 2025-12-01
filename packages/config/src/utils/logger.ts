export interface Logger {
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
	debug(message: string, ...args: any[]): void;
}

export class ConsoleLogger implements Logger {
	info(message: string, ...args: any[]): void {
		console.log(`[INFO] ${message}`, ...args);
	}

	warn(message: string, ...args: any[]): void {
		console.warn(`[WARN] ${message}`, ...args);
	}

	error(message: string, ...args: any[]): void {
		console.error(`[ERROR] ${message}`, ...args);
	}

	debug(message: string, ...args: any[]): void {
		console.debug(`[DEBUG] ${message}`, ...args);
	}
}

// Default logger instance
let defaultLogger: Logger = new ConsoleLogger();

export function setLogger(logger: Logger): void {
	defaultLogger = logger;
}

export function getLogger(): Logger {
	return defaultLogger;
}

// Convenience functions
export function info(message: string, ...args: any[]): void {
	defaultLogger.info(message, ...args);
}

export function warn(message: string, ...args: any[]): void {
	defaultLogger.warn(message, ...args);
}

export function error(message: string, ...args: any[]): void {
	defaultLogger.error(message, ...args);
}

export function debug(message: string, ...args: any[]): void {
	defaultLogger.debug(message, ...args);
}
