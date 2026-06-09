/**
 * Shared logger for mcp-server
 *
 * Replaces three inline `const logger` objects in:
 *   - src/index.ts
 *   - src/metrics/capability-metrics.ts
 *   - src/analytics/posthog.ts
 *
 * Log-level control via LOG_LEVEL env var:
 *   - "silent"  → suppresses info/debug output
 *   - "debug"   → enables debug output
 *   - anything else (default) → info/warn/error enabled, debug suppressed
 *
 * @module utils/logger
 */

type LogContext = Record<string, unknown>;

function fmt(level: string, msg: string, ctx?: LogContext): string {
	return `[${level}] ${msg}${ctx ? ` ${JSON.stringify(ctx)}` : ""}\n`;
}

export const logger = {
	info(msg: string, ctx?: LogContext): void {
		if (process.env.LOG_LEVEL !== "silent") {
			process.stdout.write(fmt("INFO", msg, ctx));
		}
	},

	warn(msg: string, ctx?: LogContext): void {
		process.stderr.write(fmt("WARN", msg, ctx));
	},

	error(msg: string, ctx?: LogContext): void {
		process.stderr.write(fmt("ERROR", msg, ctx));
	},

	debug(msg: string, ctx?: LogContext): void {
		if (process.env.LOG_LEVEL === "debug") {
			process.stdout.write(fmt("DEBUG", msg, ctx));
		}
	},
};
