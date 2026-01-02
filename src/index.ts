/**
 * SnapBack MCP Server - Streamable HTTP Transport
 *
 * Remote MCP server using the MCP 2025-03-26 Streamable HTTP transport.
 * Directly integrates with @snapback/mcp instead of spawning CLI subprocess.
 *
 * @module apps/mcp-server
 */

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { createHttpTransport, type HttpTransportManager } from "@snapback/mcp";
import { linkWorkspace, resolveTierByWorkspaceId } from "@snapback/platform/db/queries";
import {
	getAllowedCorsOrigin,
	getMaxBodySize,
	validateApiKey,
	validateWorkspace,
	validateWorkspaceId,
} from "./validation.js";

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const NODE_ENV = process.env.NODE_ENV || "development";
const MCP_VERSION = process.env.MCP_VERSION || "2.0.0";

// Simple logger (no external dependencies)
const logger = {
	info: (msg: string, context?: Record<string, unknown>) => {
		if (process.env.LOG_LEVEL !== "silent") {
			console.log(`[INFO] ${msg}`, context ? JSON.stringify(context) : "");
		}
	},
	warn: (msg: string, context?: Record<string, unknown>) => {
		console.warn(`[WARN] ${msg}`, context ? JSON.stringify(context) : "");
	},
	error: (msg: string, context?: Record<string, unknown>) => {
		console.error(`[ERROR] ${msg}`, context ? JSON.stringify(context) : "");
	},
};

// Transport manager cache keyed by workspace
const transportManagers: Map<string, HttpTransportManager> = new Map();

/**
 * Get or create transport manager for a workspace
 */
function getTransportManager(workspace: string, tier: "free" | "pro" | "enterprise"): HttpTransportManager {
	const key = `${workspace}:${tier}`;

	if (!transportManagers.has(key)) {
		const manager = createHttpTransport({
			workspaceRoot: workspace,
			tier,
			enableJsonResponse: true,
			sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
			maxSessions: 100,
		});
		transportManagers.set(key, manager);
		logger.info("Created transport manager", { workspace, tier });
	}

	return transportManagers.get(key)!;
}

/**
 * Handle health check requests
 */
function handleHealth(res: ServerResponse): void {
	const activeSessions = Array.from(transportManagers.values()).reduce(
		(sum, manager) => sum + manager.getSessionCount(),
		0,
	);

	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(
		JSON.stringify({
			status: "healthy",
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			version: MCP_VERSION,
			transport: "streamable-http",
			activeSessions,
		}),
	);
}

/**
 * Handle MCP requests via Streamable HTTP transport
 */
async function handleMcp(
	req: IncomingMessage,
	res: ServerResponse,
	body: string,
	requestId: string,
	url: URL,
): Promise<void> {
	// For initialization requests, we need workspace and apiKey from the body
	// For subsequent requests, session ID routes to existing transport
	const sessionId = req.headers["mcp-session-id"] as string | undefined;

	// If we have a session ID, find the transport and handle directly
	if (sessionId) {
		// Find the transport manager that has this session
		for (const manager of transportManagers.values()) {
			// Try to handle - the manager will validate session internally
			try {
				const parsedBody = body ? JSON.parse(body) : undefined;
				await manager.handleRequest(req, res, parsedBody);
				return;
			} catch {
				// Not found in this manager, continue searching
			}
		}

		// Session not found
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				jsonrpc: "2.0",
				error: { code: -32000, message: "Session not found or expired" },
				id: null,
			}),
		);
		return;
	}

	// No session ID - this must be an initialize request with workspace info
	let parsedBody: { workspace?: string; apiKey?: string; workspaceId?: string; tier?: string } & Record<
		string,
		unknown
	>;
	try {
		parsedBody = JSON.parse(body);
	} catch (parseError) {
		logger.error("JSON parse failed", { requestId, error: String(parseError) });
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "BAD_REQUEST", message: "Invalid JSON body" }));
		return;
	}

	// Extract workspace from (in priority order):
	// 1. Request body or initialize params
	// 2. Query parameter (?workspace=/path/to/project)
	// 3. X-Workspace-Path header
	const workspace =
		parsedBody.workspace ||
		((parsedBody.params as Record<string, unknown>)?.workspace as string) ||
		url.searchParams.get("workspace") ||
		(req.headers["x-workspace-path"] as string);

	// Validate workspace path
	const workspaceValidation = validateWorkspace(workspace);
	if (!workspaceValidation.valid) {
		logger.warn("Workspace validation failed", { requestId, error: workspaceValidation.error });
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "BAD_REQUEST", message: workspaceValidation.error }));
		return;
	}

	// Authentication: Workspace ID (preferred) or API key (legacy)
	// Workspace ID enables tier resolution without storing API keys in MCP config
	const workspaceId =
		parsedBody.workspaceId ||
		(req.headers["x-workspace-id"] as string) ||
		((parsedBody.params as Record<string, unknown>)?.workspaceId as string);
	const apiKey = parsedBody.apiKey || (req.headers["x-api-key"] as string);

	let tier: "free" | "pro" | "enterprise" = "free";

	// Priority 1: Workspace ID authentication (preferred)
	if (workspaceId) {
		const workspaceIdValidation = validateWorkspaceId(workspaceId);
		if (!workspaceIdValidation.valid) {
			logger.warn("Workspace ID validation failed", { requestId, error: workspaceIdValidation.error });
			res.writeHead(401, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "UNAUTHORIZED", message: workspaceIdValidation.error }));
			return;
		}

		// Resolve tier from database
		try {
			const tierResult = await resolveTierByWorkspaceId(workspaceId);
			tier = tierResult.tier;
			logger.info("Tier resolved via workspace ID", {
				requestId,
				workspaceId: `${workspaceId.slice(0, 10)}...`,
				tier,
				linked: tierResult.found,
			});
		} catch (error) {
			// Database error - fallback to free tier
			logger.warn("Tier resolution failed, using free tier", { requestId, error: String(error) });
			tier = "free";
		}
	}
	// Priority 2: API key authentication (legacy)
	else if (apiKey) {
		const apiKeyValidation = validateApiKey(apiKey);
		if (!apiKeyValidation.valid) {
			logger.warn("API key validation failed", { requestId, error: apiKeyValidation.error });
			res.writeHead(401, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "UNAUTHORIZED", message: apiKeyValidation.error }));
			return;
		}
		// For now, API key presence implies pro tier (Phase 2 will verify with database)
		tier = "pro";
	}
	// No authentication provided - use free tier (default)
	else {
		logger.info("No authentication provided, using free tier", { requestId });
		tier = "free";
	}

	// Get or create transport manager for this workspace
	const manager = getTransportManager(workspace, tier);

	logger.info("Handling MCP request", { requestId, workspace, tier, method: req.method });

	// Handle the request
	await manager.handleRequest(req, res, parsedBody);
}

/**
 * Handle workspace linking requests
 *
 * Called after successful OAuth in VS Code extension to link workspace to user.
 * Requires API key authentication via Authorization header.
 */
async function handleLinkWorkspace(
	req: IncomingMessage,
	res: ServerResponse,
	body: string,
	requestId: string,
): Promise<void> {
	// Only accept POST
	if (req.method !== "POST") {
		res.writeHead(405, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "METHOD_NOT_ALLOWED", message: "Only POST is allowed" }));
		return;
	}

	// Require API key authentication
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		res.writeHead(401, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "UNAUTHORIZED", message: "Missing or invalid Authorization header" }));
		return;
	}

	const apiKey = authHeader.slice(7); // Remove "Bearer "
	const apiKeyValidation = validateApiKey(apiKey);
	if (!apiKeyValidation.valid) {
		logger.warn("Link workspace: API key validation failed", { requestId, error: apiKeyValidation.error });
		res.writeHead(401, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "UNAUTHORIZED", message: apiKeyValidation.error }));
		return;
	}

	// Parse body
	let parsedBody: { workspace_id?: string; user_id?: string; tier?: string; display_name?: string };
	try {
		parsedBody = JSON.parse(body);
	} catch {
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "BAD_REQUEST", message: "Invalid JSON body" }));
		return;
	}

	// Validate workspace ID
	const workspaceId = parsedBody.workspace_id;
	const workspaceIdValidation = validateWorkspaceId(workspaceId);
	if (!workspaceIdValidation.valid) {
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "BAD_REQUEST", message: workspaceIdValidation.error }));
		return;
	}

	// User ID and tier come from the authenticated request
	// In Phase 2, we'd verify these against the API key's associated user
	// For now, trust the client-provided values
	const userId = parsedBody.user_id;
	if (!userId) {
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "BAD_REQUEST", message: "Missing user_id" }));
		return;
	}

	const tier = (parsedBody.tier || "free") as "free" | "pro" | "enterprise";

	try {
		await linkWorkspace({
			workspaceId: workspaceId!,
			userId,
			tier,
			displayName: parsedBody.display_name,
		});

		logger.info("Workspace linked successfully", {
			requestId,
			workspaceId: `${workspaceId?.slice(0, 10)}...`,
			tier,
		});

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ linked: true, tier }));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error("Failed to link workspace", { requestId, error: message });
		res.writeHead(500, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				error: "INTERNAL_ERROR",
				message: NODE_ENV === "production" ? "Failed to link workspace" : message,
			}),
		);
	}
}

/**
 * Set CORS headers on response
 */
function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
	const corsOrigin = process.env.CORS_ORIGIN || "*";
	const requestOrigin = req.headers.origin;
	const allowedOrigin = getAllowedCorsOrigin(requestOrigin, corsOrigin);

	res.setHeader("Access-Control-Allow-Origin", allowedOrigin || corsOrigin);
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization, mcp-session-id, x-api-key, x-workspace-id",
	);
	res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

/**
 * Create and start HTTP server
 */
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
	setCorsHeaders(req, res);

	// Handle preflight
	if (req.method === "OPTIONS") {
		res.writeHead(200);
		res.end();
		return;
	}

	const requestId = randomUUID();
	const url = new URL(req.url || "", `http://${req.headers.host}`);

	logger.info("Incoming request", {
		requestId,
		method: req.method,
		path: url.pathname,
		sessionId: req.headers["mcp-session-id"],
	});

	// Collect body with size limit
	const maxSize = getMaxBodySize();
	let body = "";
	let bodySize = 0;
	let aborted = false;

	req.on("data", (chunk) => {
		if (aborted) {
			return;
		}
		bodySize += chunk.length;
		if (bodySize > maxSize) {
			aborted = true;
			res.writeHead(413, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					error: "PAYLOAD_TOO_LARGE",
					message: `Request body exceeds maximum size of ${maxSize} bytes`,
				}),
			);
			req.destroy();
			return;
		}
		body += chunk.toString();
	});

	req.on("end", async () => {
		if (aborted) {
			return;
		}

		try {
			// Route based on path
			if (url.pathname === "/health") {
				handleHealth(res);
			} else if (url.pathname === "/mcp") {
				await handleMcp(req, res, body, requestId, url);
			} else if (url.pathname === "/auth/link-workspace") {
				await handleLinkWorkspace(req, res, body, requestId);
			} else {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "NOT_FOUND", message: "Endpoint not found" }));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error("Unhandled error", { requestId, error: message });
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					error: "INTERNAL_ERROR",
					message: NODE_ENV === "production" ? "Internal server error" : message,
				}),
			);
		}
	});
});

// Start server
server.listen(PORT, () => {
	logger.info("SnapBack MCP Server started", {
		port: PORT,
		env: NODE_ENV,
		version: MCP_VERSION,
		transport: "streamable-http",
		timestamp: new Date().toISOString(),
	});
});

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
	logger.info(`${signal} received, shutting down gracefully`);

	// Close all transport managers
	for (const [key, manager] of transportManagers) {
		await manager.close();
		logger.info("Closed transport manager", { key });
	}
	transportManagers.clear();

	server.close(() => {
		logger.info("Server closed");
		process.exit(0);
	});

	// Force exit after 10 seconds
	setTimeout(() => {
		logger.error("Forced shutdown after timeout");
		process.exit(1);
	}, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
