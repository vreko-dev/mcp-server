/**
 * MCP API Routes
 *
 * Thin proxy endpoints for MCP server operations.
 * All business logic is in services/mcp.ts (C-002)
 * Privacy: Metadata only, no code content (C-006)
 *
 * @module routes/v1/mcp
 */

import { zValidator } from "@hono/zod-validator";
import { auth } from "@snapback/auth";
import { Hono } from "hono";
import { z } from "zod";
import {
	endMcpSession,
	getSessionStats,
	McpServiceError,
	queryUserRecommendations,
	recordActivityEvent,
	recordLearningSignal,
	startMcpSession,
} from "../../services/mcp";

const app = new Hono();

/**
 * Authentication result with user ID and optional tier information
 */
interface AuthResult {
	userId: string;
	tier?: "free" | "pro" | "admin";
	scopes?: string[];
	authType: "session" | "apiKey";
}

/**
 * Get authenticated user ID from request headers.
 * Supports both session tokens (cookies) and API keys (Bearer token).
 *
 * FIX 5: Unified auth that supports both session and API key authentication.
 * This enables MCP tool calls from CLI and external integrations.
 */
async function getAuthenticatedUser(headers: Headers): Promise<AuthResult | null> {
	// First, try session-based authentication (browser cookies)
	try {
		const sessionResult = await auth.api.getSession({ headers });
		if (sessionResult?.user?.id) {
			return {
				userId: sessionResult.user.id,
				authType: "session",
			};
		}
	} catch {
		// Session auth failed, try API key
	}

	// Second, try API key authentication (Bearer token)
	const authHeader = headers.get("authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

		// Skip if it looks like a JWT (has dots) rather than an API key
		if (apiKey.includes(".")) {
			return null;
		}

		// Validate API key format (sk_live_* or sk_test_*)
		if (apiKey.startsWith("sk_live_") || apiKey.startsWith("sk_test_")) {
			try {
				const verified = await auth.api.verifyApiKey({ key: apiKey });
				if (verified?.isValid && verified?.userId) {
					// Determine tier from metadata
					let tier: "free" | "pro" | "admin" = "free";
					if (verified.metadata?.tier === "admin") {
						tier = "admin";
					} else if (verified.metadata?.tier === "pro" || verified.metadata?.plan === "pro") {
						tier = "pro";
					}

					return {
						userId: verified.userId,
						tier,
						scopes: Object.keys(verified.permissions || {}),
						authType: "apiKey",
					};
				}
			} catch {
				// API key verification failed
			}
		}
	}

	// Also check X-API-Key header (alternative header for API keys)
	const xApiKey = headers.get("x-api-key");
	if (xApiKey && (xApiKey.startsWith("sk_live_") || xApiKey.startsWith("sk_test_"))) {
		try {
			const verified = await auth.api.verifyApiKey({ key: xApiKey });
			if (verified?.isValid && verified?.userId) {
				let tier: "free" | "pro" | "admin" = "free";
				if (verified.metadata?.tier === "admin") {
					tier = "admin";
				} else if (verified.metadata?.tier === "pro" || verified.metadata?.plan === "pro") {
					tier = "pro";
				}

				return {
					userId: verified.userId,
					tier,
					scopes: Object.keys(verified.permissions || {}),
					authType: "apiKey",
				};
			}
		} catch {
			// API key verification failed
		}
	}

	return null;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getAuthenticatedUser() instead
 */
async function getAuthenticatedUserId(headers: Headers): Promise<string | null> {
	const result = await getAuthenticatedUser(headers);
	return result?.userId ?? null;
}

// Schema definitions
const StartSessionSchema = z.object({
	workspaceId: z.string().min(1),
	taskDescription: z.string().optional(),
	detectedStack: z.record(z.unknown()).optional(),
});

const GetRecommendationsSchema = z.object({
	workspaceId: z.string().min(1),
	context: z.string().optional(),
	keywords: z.array(z.string()).optional(),
});

const RecordActivitySchema = z.object({
	sessionId: z.string().min(1),
	eventType: z.enum(["snapshot_created", "risk_analyzed", "learning_recorded"]),
	metadata: z.object({
		fileCount: z.number().int().nonnegative().optional(),
		totalBytes: z.number().int().nonnegative().optional(),
		riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
	}),
});

const RecordLearningSchema = z.object({
	workspaceId: z.string().min(1),
	patternKey: z.string().min(1),
	patternType: z.enum(["stack", "practice", "preference"]),
	confidence: z.number().min(0).max(1),
});

/**
 * POST /v1/mcp/session/start
 *
 * Start a new MCP session and get personalized recommendations.
 */
app.post("/session/start", zValidator("json", StartSessionSchema), async (c) => {
	try {
		const userId = await getAuthenticatedUserId(c.req.raw.headers);
		if (!userId) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
		}

		const body = c.req.valid("json");
		const result = await startMcpSession(userId, body.workspaceId, body.taskDescription, body.detectedStack);

		return c.json(result, 201);
	} catch (error) {
		if (error instanceof McpServiceError) {
			return c.json({ error: error.message, code: error.code }, 400);
		}
		console.error("[MCP] startSession error:", error);
		return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
	}
});

/**
 * POST /v1/mcp/recommendations
 *
 * Get personalized recommendations for the current context.
 */
app.post("/recommendations", zValidator("json", GetRecommendationsSchema), async (c) => {
	try {
		const userId = await getAuthenticatedUserId(c.req.raw.headers);
		if (!userId) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
		}

		const body = c.req.valid("json");
		const recommendations = await queryUserRecommendations(userId, body.workspaceId);

		return c.json({ recommendations });
	} catch (error) {
		if (error instanceof McpServiceError) {
			return c.json({ error: error.message, code: error.code }, 400);
		}
		console.error("[MCP] getRecommendations error:", error);
		return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
	}
});

/**
 * POST /v1/mcp/activity
 *
 * Record an activity event (metadata only, no code content).
 */
app.post("/activity", zValidator("json", RecordActivitySchema), async (c) => {
	try {
		const userId = await getAuthenticatedUserId(c.req.raw.headers);
		if (!userId) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
		}

		const body = c.req.valid("json");
		const result = await recordActivityEvent(body.sessionId, userId, body.eventType, body.metadata);

		return c.json(result, 201);
	} catch (error) {
		if (error instanceof McpServiceError) {
			if (error.code === "PRIVACY_VIOLATION") {
				return c.json({ error: error.message, code: error.code }, 403);
			}
			return c.json({ error: error.message, code: error.code }, 400);
		}
		console.error("[MCP] recordActivity error:", error);
		return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
	}
});

/**
 * POST /v1/mcp/learning
 *
 * Record a learning signal for cross-workspace aggregation.
 */
app.post("/learning", zValidator("json", RecordLearningSchema), async (c) => {
	try {
		const userId = await getAuthenticatedUserId(c.req.raw.headers);
		if (!userId) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
		}

		const body = c.req.valid("json");
		const result = await recordLearningSignal(
			userId,
			body.workspaceId,
			body.patternKey,
			body.patternType,
			body.confidence,
		);

		return c.json(result, 201);
	} catch (error) {
		if (error instanceof McpServiceError) {
			return c.json({ error: error.message, code: error.code }, 400);
		}
		console.error("[MCP] recordLearning error:", error);
		return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
	}
});

/**
 * GET /v1/mcp/session/:sessionId/stats
 *
 * Get statistics for a session.
 */
app.get("/session/:sessionId/stats", async (c) => {
	try {
		const userId = await getAuthenticatedUserId(c.req.raw.headers);
		if (!userId) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
		}

		const sessionId = c.req.param("sessionId");
		const stats = await getSessionStats(sessionId, userId);

		return c.json(stats);
	} catch (error) {
		if (error instanceof McpServiceError) {
			if (error.code === "SESSION_NOT_FOUND") {
				return c.json({ error: error.message, code: error.code }, 404);
			}
			return c.json({ error: error.message, code: error.code }, 400);
		}
		console.error("[MCP] getSessionStats error:", error);
		return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
	}
});

/**
 * POST /v1/mcp/session/:sessionId/end
 *
 * End an MCP session.
 */
app.post("/session/:sessionId/end", async (c) => {
	try {
		const userId = await getAuthenticatedUserId(c.req.raw.headers);
		if (!userId) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
		}

		const sessionId = c.req.param("sessionId");
		const result = await endMcpSession(sessionId, userId);

		return c.json(result);
	} catch (error) {
		if (error instanceof McpServiceError) {
			if (error.code === "SESSION_NOT_FOUND") {
				return c.json({ error: error.message, code: error.code }, 404);
			}
			return c.json({ error: error.message, code: error.code }, 400);
		}
		console.error("[MCP] endSession error:", error);
		return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
	}
});

/**
 * POST /v1/mcp/execute
 *
 * Single endpoint for all MCP tool calls (thin proxy pattern).
 * This matches the architecture in implementation_plan.md.
 */
app.post(
	"/execute",
	zValidator(
		"json",
		z.object({
			tool: z.string().min(1),
			args: z.record(z.unknown()),
			workspaceId: z.string().optional(),
		}),
	),
	async (c) => {
		try {
			const userId = await getAuthenticatedUserId(c.req.raw.headers);
			if (!userId) {
				return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
			}

			const { tool, args, workspaceId } = c.req.valid("json");

			// Route to appropriate handler based on tool name
			switch (tool) {
				case "snapback.start_session": {
					const result = await startMcpSession(
						userId,
						(args.workspaceId as string) || workspaceId || "",
						args.taskDescription as string | undefined,
						args.detectedStack as Record<string, unknown> | undefined,
					);
					return c.json(result, 201);
				}

				case "snapback.get_recommendations": {
					const recommendations = await queryUserRecommendations(
						userId,
						(args.workspaceId as string) || workspaceId || "",
					);
					return c.json({ recommendations });
				}

				case "snapback.record_activity": {
					const result = await recordActivityEvent(
						args.sessionId as string,
						userId,
						args.eventType as string,
						args.metadata as { fileCount?: number; totalBytes?: number; riskLevel?: string },
					);
					return c.json(result, 201);
				}

				case "snapback.record_learning": {
					const result = await recordLearningSignal(
						userId,
						(args.workspaceId as string) || workspaceId || "",
						args.patternKey as string,
						args.patternType as string,
						args.confidence as number,
					);
					return c.json(result, 201);
				}

				case "snapback.session_stats": {
					const stats = await getSessionStats(args.sessionId as string, userId);
					return c.json(stats);
				}

				case "snapback.end_session": {
					const result = await endMcpSession(args.sessionId as string, userId);
					return c.json(result);
				}

				default:
					return c.json(
						{
							error: `Unknown tool: ${tool}`,
							code: "UNKNOWN_TOOL",
							availableTools: [
								"snapback.start_session",
								"snapback.get_recommendations",
								"snapback.record_activity",
								"snapback.record_learning",
								"snapback.session_stats",
								"snapback.end_session",
							],
						},
						400,
					);
			}
		} catch (error) {
			if (error instanceof McpServiceError) {
				return c.json({ error: error.message, code: error.code, isError: true }, 400);
			}
			console.error("[MCP] execute error:", error);
			return c.json({ error: "Internal server error", code: "INTERNAL_ERROR", isError: true }, 500);
		}
	},
);

export default app;
