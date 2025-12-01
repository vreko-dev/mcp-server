import pino from "pino";

// Redaction options for sensitive data
const redactOptions = {
	paths: [
		"password",
		"token",
		"apiKey",
		"secret",
		"authorization",
		"cookie",
		"*.password",
		"*.token",
		"*.apiKey",
		"*.secret",
		"*.authorization",
		"*.cookie",
		"*.path",
		"*.file",
		"*.filePath",
	],
	censor: "[REDACTED]",
};

// Only use pino-pretty in development for better DX
// In production, use fast JSON output for performance
// NEVER use transports in VS Code extensions (causes bundling issues)
const isProduction = process.env.NODE_ENV === "production";
const isVSCodeExtension = process.env.VSCODE_EXTENSION === "true";

// Create core logger directly using pino
export const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	redact: {
		paths: redactOptions.paths,
		censor: redactOptions.censor,
	},
	// Only use transport in non-production AND non-VSCode environments
	...(isProduction || isVSCodeExtension
		? {}
		: {
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:standard",
						ignore: "pid,hostname",
					},
				},
			}),
});

// Export different log levels for convenience
export const log = {
	info: logger.info.bind(logger),
	warn: logger.warn.bind(logger),
	error: logger.error.bind(logger),
	debug: logger.debug.bind(logger),
	trace: logger.trace.bind(logger),
};

// Re-export the logger interface from contracts
export type { Logger } from "@snapback/contracts";
export { LogLevel } from "@snapback/contracts";

// For backward compatibility, also export the convenience methods
export const logError = (msg: string, obj?: unknown) => logger.error(obj, msg);
export const logWarn = (msg: string, obj?: unknown) => logger.warn(obj, msg);
export const logInfo = (msg: string, obj?: unknown) => logger.info(obj, msg);
export const logDebug = (msg: string, obj?: unknown) => logger.debug(obj, msg);
