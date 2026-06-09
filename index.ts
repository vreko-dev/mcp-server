/**
 * Vreko MCP Server - Thin Proxy to API
 *
 * Thin proxy server that delegates all business logic to the API.
 * All workspace context, capabilities, and analytics are handled by apps/api.
 *
 * @module apps/mcp-server
 */

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { createSentryConfig, Sentry } from "@vreko/sentry-privacy";
import { destroyPools, fetchWithPooling } from "./http-client.js";
import { logger } from "./utils/logger.js";
import {
	getAllowedCorsOrigin,
	getMaxBodySize,
	validateApiKeyWithDatabase,
	validateWorkspace,
	validateWorkspaceId,
} from "./validation.js";

// Sentry must be initialized before any other logic, including error handlers.
// Key priority: SENTRY_DSN_MCP (per-surface key set by bootstrap) → SENTRY_DSN (fallback).
Sentry.init(
	createSentryConfig({
		dsn: process.env.SENTRY_DSN_MCP || process.env.SENTRY_DSN || "",
		surface: "mcp-proxy",
	}),
);

// A4: Process-level error handlers  -  must be registered at module load
process.once("uncaughtException", (error: Error) => {
	Sentry.captureException(error, { tags: { component: "uncaughtException" } });
	logger.error("Uncaught exception", { message: error.message, stack: error.stack });
	process.exit(1);
});
process.once("unhandledRejection", (reason: unknown) => {
	Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
		tags: { component: "unhandledRejection" },
		level: "warning",
	});
	logger.warn("Unhandled rejection", { reason: String(reason) });
});

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const _NODE_ENV = process.env.NODE_ENV || "development";
const MCP_VERSION = process.env.MCP_VERSION || "2025-03-26";
const API_URL = process.env.VREKO_API_URL || "https://api.vreko.dev";

// Graceful shutdown state
let isShuttingDown = false;
let isReady = false;
const startTime = Date.now();

async function proxyToApi(endpoint: string, method: string, body: unknown, headers: Record<string, string>) {
	try {
		const res = await fetchWithPooling(`${API_URL}/api/v1/mcp${endpoint}`, {
			method,
			headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
			body: body ? JSON.stringify(body) : undefined,
		});
		const resBody = await res.text();
		const resHeaders: Record<string, string> = {
			/* intentionally empty */
		};
		res.headers.forEach((v, k) => {
			resHeaders[k] = v;
		});
		return { status: res.status, body: resBody, headers: resHeaders };
	} catch (_e) {
		return {
			status: 503,
			body: JSON.stringify({ error: "SERVICE_UNAVAILABLE" }),
			headers: { "Content-Type": "application/json" },
		};
	}
}

function setCors(req: IncomingMessage, res: ServerResponse) {
	const origin = getAllowedCorsOrigin(req.headers.origin, process.env.CORS_ORIGIN || "*");
	res.setHeader("Access-Control-Allow-Origin", origin || "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization, mcp-session-id, x-api-key, x-workspace-id",
	);
	res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
	setCors(req, res);
	if (req.method === "OPTIONS") {
		res.writeHead(200);
		res.end();
		return;
	}

	// Origin validation for production security (defense-in-depth)
	const nodeEnv = process.env.NODE_ENV || "development";
	const requestOrigin = req.headers.origin;
	if (nodeEnv === "production" && requestOrigin) {
		const allowedOrigins = (process.env.CORS_ORIGIN || "")
			.split(",")
			.map((o) => o.trim())
			.filter(Boolean);
		// Allow requests without origin (e.g., CLI, MCP clients) or from allowed origins
		if (allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin) && allowedOrigins[0] !== "*") {
			logger.warn("Blocked request from unauthorized origin", { origin: requestOrigin });
			res.writeHead(403, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "FORBIDDEN", message: "Origin not allowed" }));
			return;
		}
	}

	const requestId = randomUUID();
	const url = new URL(req.url || "", `http://${req.headers.host}`);
	logger.info("Request", { requestId, method: req.method, path: url.pathname });

	const maxSize = getMaxBodySize();
	const chunks: Buffer[] = [];
	let size = 0;
	let aborted = false;

	req.on("data", (chunk) => {
		if (aborted) {
			return;
		}
		size += chunk.length;
		if (size > maxSize) {
			aborted = true;
			res.writeHead(413, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }));
			req.destroy();
			return;
		}
		chunks.push(chunk);
	});

	req.on("end", async () => {
		if (aborted) {
			return;
		}
		const body = chunks.length === 0 ? "" : Buffer.concat(chunks, size).toString("utf8");

		try {
			let result: { status: number; body: string; headers: Record<string, string> } | undefined;
			const path = url.pathname;

			// SSE streaming for MCP GET (server-to-client notifications)
			// Must be handled before body buffering logic since SSE is a long-lived stream
			if (path === "/mcp" && req.method === "GET") {
				const sessionId = req.headers["mcp-session-id"] as string | undefined;
				if (!sessionId) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "mcp-session-id header required" }));
					return;
				}

				const upstreamHeaders: Record<string, string> = {
					"mcp-session-id": sessionId,
					Accept: "text/event-stream",
				};
				if (req.headers["x-api-key"]) {
					upstreamHeaders["x-api-key"] = req.headers["x-api-key"] as string;
				}
				if (req.headers.authorization?.startsWith("Bearer ")) {
					upstreamHeaders.Authorization = req.headers.authorization as string;
				}
				if (req.headers["x-workspace-path"]) {
					upstreamHeaders["x-workspace-path"] = req.headers["x-workspace-path"] as string;
				}

				try {
					const upstream = await fetchWithPooling(`${API_URL}/api/v1/mcp`, {
						method: "GET",
						headers: upstreamHeaders,
					});

					// Copy upstream status and headers
					const responseHeaders: Record<string, string> = {};
					upstream.headers.forEach((v, k) => {
						responseHeaders[k] = v;
					});
					res.writeHead(upstream.status, responseHeaders);

					// Pipe SSE stream without buffering
					if (upstream.body) {
						const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
						req.on("close", () =>
							reader.cancel().catch(() => {
								/* stream already closed */
							}),
						);
						(async () => {
							try {
								while (true) {
									const { done, value } = await reader.read();
									if (done) {
										res.end();
										break;
									}
									res.write(value);
								}
							} catch (pipeErr) {
								logger.warn("SSE pipe closed unexpectedly", {
									sessionId,
									error: pipeErr instanceof Error ? pipeErr.message : String(pipeErr),
								});
								Sentry.captureException(
									pipeErr instanceof Error ? pipeErr : new Error(String(pipeErr)),
									{ tags: { component: "sse-pipe" }, extra: { sessionId } },
								);
								res.end();
							}
						})();
					} else {
						res.end();
					}
				} catch (sseErr) {
					logger.warn("SSE upstream connect failed", {
						sessionId,
						error: sseErr instanceof Error ? sseErr.message : String(sseErr),
					});
					Sentry.captureException(sseErr instanceof Error ? sseErr : new Error(String(sseErr)), {
						tags: { component: "sse-upstream" },
						extra: { sessionId },
					});
					res.writeHead(503, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "SERVICE_UNAVAILABLE" }));
				}
				return;
			}

			// Health endpoints - Kubernetes-style probes
			if (path === "/health" || path === "/health/live") {
				// Liveness probe: Is the process alive?
				result = {
					status: 200,
					body: JSON.stringify({
						status: isShuttingDown ? "shutting_down" : "alive",
						timestamp: new Date().toISOString(),
						uptime: Math.floor((Date.now() - startTime) / 1000),
						version: MCP_VERSION,
					}),
					headers: { "Content-Type": "application/json" },
				};
			} else if (path === "/health/ready") {
				// Readiness probe: Is the app ready to serve?
				// Returns 503 if shutting down or API is unreachable
				if (isShuttingDown) {
					result = {
						status: 503,
						body: JSON.stringify({
							status: "not_ready",
							timestamp: new Date().toISOString(),
							message: "Server is shutting down",
						}),
						headers: { "Content-Type": "application/json" },
					};
				} else {
					// Check API connectivity (live check on every probe  -  no cached boolean)
					const apiCheck = await proxyToApi("/health", "GET", null, {});
					const isApiReady = apiCheck.status === 200;
					// Self-heal: if startup check failed but API is now reachable, mark ready
					if (isApiReady && !isReady) {
						isReady = true;
						logger.info("MCP Server recovered  -  API reachable on readiness probe");
					}
					result = {
						status: isApiReady ? 200 : 503,
						body: JSON.stringify({
							status: isApiReady ? "ready" : "not_ready",
							timestamp: new Date().toISOString(),
							api: isApiReady ? "connected" : "disconnected",
							uptime: Math.floor((Date.now() - startTime) / 1000),
							version: MCP_VERSION,
						}),
						headers: { "Content-Type": "application/json" },
					};
				}
			} else if (path === "/health/startup") {
				// Startup probe: Has the app started successfully?
				// Returns 200 once the server has completed startup
				result = {
					status: isReady ? 200 : 503,
					body: JSON.stringify({
						status: isReady ? "started" : "starting",
						timestamp: new Date().toISOString(),
					}),
					headers: { "Content-Type": "application/json" },
				};
			} else if (path === "/mcp") {
				const sessionId = req.headers["mcp-session-id"] as string | undefined;
				let parsed = {};
				try {
					parsed = JSON.parse(body || "{}");
				} catch {
					res.writeHead(400);
					res.end(JSON.stringify({ error: "BAD_REQUEST" }));
					return;
				}

				const workspace =
					(parsed as Record<string, unknown>).workspace ||
					url.searchParams.get("workspace") ||
					req.headers["x-workspace-path"] ||
					"default";
				if (!validateWorkspace(workspace as string).valid) {
					res.writeHead(400);
					res.end(JSON.stringify({ error: "BAD_REQUEST" }));
					return;
				}

				const workspaceId = (parsed as Record<string, unknown>).workspaceId || req.headers["x-workspace-id"];
				if (workspaceId && !validateWorkspaceId(workspaceId as string).valid) {
					res.writeHead(401);
					res.end(JSON.stringify({ error: "UNAUTHORIZED" }));
					return;
				}

				// P0-C: DB-backed API key validation before proxying
				const apiKey = req.headers["x-api-key"] as string | undefined;
				if (apiKey) {
					const validation = await validateApiKeyWithDatabase(apiKey);
					if (!validation.valid) {
						if (validation.transient) {
							// Transient network error  -  return 503 so MCP clients can retry
							// (clients do not retry 401, so mapping to 503 preserves retryability)
							res.writeHead(503, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									jsonrpc: "2.0",
									error: {
										code: -32003,
										message: "Auth service temporarily unavailable",
										data: { reason: "auth_service_unavailable", retryable: true },
									},
									id: (parsed as Record<string, unknown>)?.id ?? null,
								}),
							);
							return;
						}
						// Permanent auth failure  -  key invalid or revoked
						const errorResponse = {
							jsonrpc: "2.0",
							error: {
								code: -32001,
								message: "Unauthorized",
								data: { reason: validation.error || "key_not_found_or_revoked" },
							},
							id: (parsed as Record<string, unknown>)?.id ?? null,
						};
						res.writeHead(401, { "Content-Type": "application/json" });
						res.end(JSON.stringify(errorResponse));
						return;
					}
					// Add user context to headers for upstream
					if (validation.userId) {
						logger.debug("API key validated", { userId: validation.userId, tier: validation.tier });
					}
				}

				const headers: Record<string, string> = { "x-workspace-path": workspace as string };
				if (sessionId) {
					headers["mcp-session-id"] = sessionId;
				}
				if (workspaceId) {
					headers["x-workspace-id"] = workspaceId as string;
				}
				if (apiKey) {
					headers["x-api-key"] = apiKey;
				}
				// Support Bearer token (OAuth session) - Better Auth bearer plugin
				if (req.headers.authorization?.startsWith("Bearer ")) {
					headers.Authorization = req.headers.authorization as string;
				}
				result = await proxyToApi("", req.method || "POST", parsed, headers);
			} else if (path === "/auth/link-workspace") {
				if (req.method !== "POST") {
					res.writeHead(405);
					res.end();
					return;
				}
				let parsed = {};
				try {
					parsed = JSON.parse(body);
				} catch {
					res.writeHead(400);
					res.end();
					return;
				}
				result = await proxyToApi(
					"/auth/link-workspace",
					"POST",
					parsed,
					req.headers.authorization ? { Authorization: req.headers.authorization } : {},
				);
			} else if (path === "/bridge/push") {
				if (req.method !== "POST") {
					res.writeHead(405);
					res.end();
					return;
				}
				let parsed = {};
				try {
					parsed = JSON.parse(body);
				} catch {
					res.writeHead(400);
					res.end();
					return;
				}
				result = await proxyToApi("/bridge/push", "POST", parsed, {});
			} else if (path === "/bridge/status") {
				if (req.method !== "GET") {
					res.writeHead(405);
					res.end();
					return;
				}
				const wsId = url.searchParams.get("workspaceId");
				result = await proxyToApi(
					wsId ? `/bridge/status?workspaceId=${encodeURIComponent(wsId)}` : "/bridge/status",
					"GET",
					null,
					{},
				);
			} else if (path === "/capabilities/false-positive") {
				if (req.method !== "POST") {
					res.writeHead(405);
					res.end();
					return;
				}
				let parsed = {};
				try {
					parsed = JSON.parse(body);
				} catch {
					res.writeHead(400);
					res.end();
					return;
				}
				result = await proxyToApi("/capabilities/false-positive", "POST", parsed, {});
			} else if (path === "/capabilities") {
				if (req.method !== "GET") {
					res.writeHead(405);
					res.end();
					return;
				}
				const userId = url.searchParams.get("userId");
				if (!userId) {
					res.writeHead(400);
					res.end(JSON.stringify({ error: "BAD_REQUEST" }));
					return;
				}
				result = await proxyToApi(`/capabilities?userId=${encodeURIComponent(userId)}`, "GET", null, {});
			} else {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "NOT_FOUND" }));
				return;
			}

			// Forward mcp-session-id from upstream so clients can make follow-up requests.
			// The GET/SSE handler already forwards all upstream headers; the POST path
			// must also forward mcp-session-id or initialize handshakes silently fail.
			const responseHeaders: Record<string, string> = {
				"Content-Type": result.headers["content-type"] || "application/json",
			};
			if (result.headers["mcp-session-id"]) {
				responseHeaders["mcp-session-id"] = result.headers["mcp-session-id"];
			}
			res.writeHead(result.status, responseHeaders);
			res.end(result.body);
		} catch (e) {
			logger.error("Error", { requestId, error: String(e) });
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "INTERNAL_ERROR" }));
		}
	});
});

// Graceful shutdown - 2026 Enterprise Pattern
const SHUTDOWN_TIMEOUT_MS = 25000; // Leave 5s buffer for kill_timeout=30s

async function gracefulShutdown(signal: string) {
	if (isShuttingDown) {
		logger.warn("Shutdown already in progress");
		return;
	}

	isShuttingDown = true;
	logger.info("Shutdown initiated", { signal, pid: process.pid });

	// Mark as not ready immediately (stop new traffic)
	isReady = false;
	logger.info("Service marked as not ready");

	// C2: Close all SSE/keep-alive connections immediately
	server.closeAllConnections();
	logger.info("SSE connections closed");

	// Wait for in-flight requests (5 second drain period)
	logger.info("Waiting for in-flight requests to complete...");
	await new Promise((resolve) => setTimeout(resolve, 5000));

	// C1: Destroy connection pools before forced exit
	destroyPools();
	logger.info("Connection pools destroyed");

	// Flush Sentry before closing
	try {
		await Sentry.close(2000);
	} catch {
		// Sentry flush must not block shutdown
	}

	// Close server
	logger.info("Closing server...");
	server.close(() => {
		logger.info("Server closed, exiting");
		process.exit(0);
	});

	// Force exit after timeout
	setTimeout(() => {
		logger.error("Forced exit due to timeout");
		process.exit(1);
	}, SHUTDOWN_TIMEOUT_MS);
}

process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server and mark as ready
// MUST bind to 0.0.0.0 for Fly.io deployment (localhost binding will fail health checks)
server.listen(PORT, "0.0.0.0", () => {
	logger.info("MCP Server started", { port: PORT, host: "0.0.0.0", version: MCP_VERSION, apiUrl: API_URL });

	// E3: Replace fixed 1-second timer with actual API connectivity check
	(async () => {
		try {
			const check = await fetchWithPooling(`${API_URL}/health`, {
				method: "GET",
				headers: { Accept: "application/json" },
			});
			if (check.ok) {
				isReady = true;
				logger.info("MCP Server ready  -  API reachable", { status: check.status });
			} else {
				logger.warn("MCP Server started but API not reachable", { status: check.status });
				// isReady stays false; /health/ready will return 503 until next probe interval restores it
			}
		} catch (err) {
			logger.warn("MCP Server started but API health check failed", {
				error: err instanceof Error ? err.message : String(err),
			});
		}
	})();
});

export default server;
