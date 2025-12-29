/**
 * Logger for Intelligence package
 *
 * Uses the contracts Logger interface for consistency across packages.
 * Wraps createLogger from @snapback/contracts with intelligence-specific configuration.
 */

import { createLogger, type Logger } from "@snapback/contracts";

/**
 * Intelligence package logger instance
 * Uses contracts' createLogger for consistent logging interface
 */
export const logger: Logger = createLogger({
	name: "intelligence",
	timestamps: process.env.NODE_ENV !== "test",
});
