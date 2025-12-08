/**
 * JWT verification middleware for tools (VSCode/CLI/MCP)
 * ✅ LEVEL 3: Uses better-auth's JWT plugin for verification
 * Simplified from 261 → 50 lines by using library endpoints
 */

import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";

/**
 * Extract JWT from Authorization header
 * Supports both "Bearer <token>" and just "<token>"
 */
function extractToken(c: Context): string | null {
	const authHeader = c.req.header("authorization");
	if (!authHeader) {
		return null;
	}
	return authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
}

/**
 * Middleware to require valid JWT for tools (VSCode/CLI/MCP)
 * Uses better-auth's JWT plugin for verification via getSession
 */
export async function requireToolJWT(c: Context, next: Next) {
	try {
		const token = extractToken(c);
		if (!token) {
			return c.json(
				{
					error: "JWT token required",
					code: "JWT_REQUIRED",
				},
				401,
			);
		}

		// Verify JWT using better-auth's getSession
		const session = await auth.api.getSession({
			headers: new Headers({ authorization: `Bearer ${token}` }),
		});

		if (!session?.user) {
			return c.json({ error: "Invalid token", code: "JWT_INVALID" }, 401);
		}

		// Attach user info to context
		c.set("userId", session.user.id);
		c.set("orgId", session.user.activeOrganization?.id);
		c.set("authType", "jwt");
		c.set("user", session.user);

		await next();
	} catch (error) {
		logger.error("JWT verification error", {
			error: error instanceof Error ? error.message : String(error),
		});
		return c.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
	}
}
