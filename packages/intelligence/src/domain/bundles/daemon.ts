/**
 * Daemon Domain Bundle
 *
 * Domain-specific patterns for daemon/server code.
 * Detects missing signal handlers, socket permissions, buffer limits, etc.
 *
 * @module domain/bundles/daemon
 */

import type { AnalysisIssue, DomainBundle, Severity } from "@snapback/core";

/**
 * Helper to create issue ID
 */
function createIssueId(pattern: string, file: string, line?: number): string {
	return `domain/daemon/${pattern}/${file}${line ? `/${line}` : ""}`;
}

/**
 * Helper to find line number for a pattern
 */
function findLine(content: string, search: string): number | undefined {
	const lines = content.split("\n");
	const idx = lines.findIndex((l) => l.includes(search));
	return idx >= 0 ? idx + 1 : undefined;
}

/**
 * Daemon/Server domain-specific patterns
 */
export const daemonPatterns: DomainBundle = {
	id: "daemon",
	name: "Daemon/Server Patterns",
	keywords: ["daemon", "server", "socket", "ipc", "listen", "spawn", "worker", "process"],
	patterns: [
		{
			id: "daemon/signal-handlers",
			name: "Missing Signal Handlers",
			detect: (content: string, file: string): AnalysisIssue[] => {
				const issues: AnalysisIssue[] = [];

				// Detect daemon/server context
				const isDaemon =
					content.includes(".listen(") ||
					file.includes("daemon") ||
					file.includes("server") ||
					file.includes("worker") ||
					content.includes("net.createServer") ||
					content.includes("http.createServer");

				if (!isDaemon) return issues;

				// Check for signal handlers
				const hasSIGTERM = content.includes("process.on('SIGTERM'") || content.includes('process.on("SIGTERM"');
				const hasSIGINT = content.includes("process.on('SIGINT'") || content.includes('process.on("SIGINT"');

				if (!hasSIGTERM && !hasSIGINT) {
					issues.push({
						id: createIssueId("signal-handlers", file),
						severity: "high" as Severity,
						type: "MISSING_PATTERN",
						message: "Daemon/server missing signal handlers (SIGTERM/SIGINT)",
						file,
						fix: "Add process.on('SIGTERM', gracefulShutdown) for clean shutdown",
					});
				}

				return issues;
			},
		},
		{
			id: "daemon/socket-permissions",
			name: "Socket Permissions",
			detect: (content: string, file: string): AnalysisIssue[] => {
				const issues: AnalysisIssue[] = [];

				// Check for Unix socket usage
				const hasUnixSocket =
					(content.includes(".listen(") && content.includes(".sock")) ||
					(content.includes("createServer") && content.includes(".sock"));

				if (!hasUnixSocket) return issues;

				// Check for permission setting
				const setsPermissions =
					content.includes("chmod") ||
					content.includes("0o600") ||
					content.includes("0o700") ||
					content.includes("chmodSync");

				if (!setsPermissions) {
					const line = findLine(content, ".sock");
					issues.push({
						id: createIssueId("socket-permissions", file, line),
						severity: "high" as Severity,
						type: "MISSING_PATTERN",
						message: "Unix socket without explicit permissions",
						file,
						line,
						fix: "Add fs.chmodSync(socketPath, 0o600) after listen() to restrict access",
					});
				}

				return issues;
			},
		},
		{
			id: "daemon/buffer-limits",
			name: "Buffer Limits",
			detect: (content: string, file: string): AnalysisIssue[] => {
				const issues: AnalysisIssue[] = [];

				// Check for data reading
				const readsData =
					content.includes(".on('data'") ||
					content.includes('.on("data"') ||
					content.includes("socket.read") ||
					content.includes("stream.read");

				if (!readsData) return issues;

				// Check for buffer limits
				const hasLimit =
					content.includes("MAX_BUFFER") ||
					content.includes("maxSize") ||
					content.includes("maxLength") ||
					/\.length\s*[<>]/.test(content) ||
					content.includes("Buffer.allocUnsafe") ||
					content.includes("highWaterMark");

				if (!hasLimit) {
					const line = findLine(content, ".on('data'") || findLine(content, '.on("data"');
					issues.push({
						id: createIssueId("buffer-limits", file, line),
						severity: "high" as Severity,
						type: "BUFFER_OVERFLOW",
						message: "Reading data without buffer limits (potential DoS vulnerability)",
						file,
						line,
						fix: "Add buffer size limit check before processing data",
					});
				}

				return issues;
			},
		},
		{
			id: "daemon/lock-acquisition",
			name: "Lock Acquisition",
			detect: (content: string, file: string): AnalysisIssue[] => {
				const issues: AnalysisIssue[] = [];

				// Check for daemon start code
				const isDaemonStart =
					content.includes("daemon.start") ||
					content.includes("startDaemon") ||
					content.includes("spawnDaemon") ||
					(file.includes("daemon") && content.includes(".start("));

				if (!isDaemonStart) return issues;

				// Check for lock/pid file
				const hasLock =
					content.includes("acquireLock") ||
					content.includes(".pid") ||
					content.includes("pidFile") ||
					content.includes("lockFile") ||
					content.includes("proper-lockfile") ||
					(content.includes("fs.writeFileSync") && content.includes("process.pid"));

				if (!hasLock) {
					issues.push({
						id: createIssueId("lock-acquisition", file),
						severity: "medium" as Severity,
						type: "MISSING_PATTERN",
						message: "Daemon starts without lock file (may allow multiple instances)",
						file,
						fix: "Acquire lock via PID file before starting daemon to prevent duplicates",
					});
				}

				return issues;
			},
		},
		{
			id: "daemon/error-recovery",
			name: "Error Recovery",
			detect: (content: string, file: string): AnalysisIssue[] => {
				const issues: AnalysisIssue[] = [];

				// Check if this is daemon/server code
				const isDaemon =
					content.includes(".listen(") ||
					file.includes("daemon") ||
					file.includes("server") ||
					content.includes("net.createServer");

				if (!isDaemon) return issues;

				// Check for uncaughtException handler
				const hasUncaughtHandler =
					content.includes("process.on('uncaughtException'") ||
					content.includes('process.on("uncaughtException"') ||
					content.includes("process.on('unhandledRejection'") ||
					content.includes('process.on("unhandledRejection"');

				if (!hasUncaughtHandler) {
					issues.push({
						id: createIssueId("error-recovery", file),
						severity: "medium" as Severity,
						type: "MISSING_PATTERN",
						message: "Daemon missing uncaughtException/unhandledRejection handlers",
						file,
						fix: "Add handlers to log errors and optionally restart gracefully",
					});
				}

				return issues;
			},
		},
		{
			id: "daemon/health-check",
			name: "Health Check Endpoint",
			detect: (content: string, file: string): AnalysisIssue[] => {
				const issues: AnalysisIssue[] = [];

				// Check if this is HTTP server code
				const isHttpServer =
					content.includes("http.createServer") ||
					content.includes("express()") ||
					content.includes("fastify") ||
					content.includes("Hono") ||
					content.includes("koa");

				if (!isHttpServer) return issues;

				// Check for health endpoint
				const hasHealthEndpoint =
					content.includes("/health") ||
					content.includes("/healthz") ||
					content.includes("/ready") ||
					content.includes("/live") ||
					content.includes("healthCheck");

				if (!hasHealthEndpoint) {
					issues.push({
						id: createIssueId("health-check", file),
						severity: "low" as Severity,
						type: "MISSING_PATTERN",
						message: "HTTP server missing health check endpoint",
						file,
						fix: "Add /health or /healthz endpoint for monitoring and orchestration",
					});
				}

				return issues;
			},
		},
		{
			id: "daemon/graceful-shutdown",
			name: "Graceful Shutdown",
			detect: (content: string, file: string): AnalysisIssue[] => {
				const issues: AnalysisIssue[] = [];

				// Check if this is server code with connections
				const hasServer =
					content.includes(".listen(") ||
					content.includes("server.close") ||
					content.includes("createServer");

				if (!hasServer) return issues;

				// Check for graceful shutdown implementation
				const hasGracefulShutdown =
					content.includes("server.close") ||
					content.includes("gracefulShutdown") ||
					content.includes("drainConnections") ||
					content.includes("closeAllConnections") ||
					(content.includes("SIGTERM") && content.includes(".close("));

				if (!hasGracefulShutdown) {
					issues.push({
						id: createIssueId("graceful-shutdown", file),
						severity: "medium" as Severity,
						type: "MISSING_PATTERN",
						message: "Server may not shut down gracefully (in-flight requests may be dropped)",
						file,
						fix: "Implement graceful shutdown: stop accepting new connections, drain existing ones",
					});
				}

				return issues;
			},
		},
	],
};
