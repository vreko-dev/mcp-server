/**
 * Session Middleware - Canonical snapbackAuth Integration
 * ✅ Uses snapbackAuth.getContextFromRequest() for unified context extraction
 * Supports all 4 auth methods: session, Bearer, API key, x-api-key header
 *
 * Usage in routes:
 * - Auth context is available via: const auth = c.get("auth")
 * - Returns SnapbackAuthContext with: userId, email, role, plan, orgId, orgRole, authenticatedVia
 * - Optional auth: Check if auth exists before using
 * - Required auth: Use authMiddleware before route handler
 */

import { snapbackAuth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";

/**
 * Extract authenticated context from request
 * ✅ Canonical pattern: uses snapbackAuth.getContextFromRequest()
 * Returns null for unauthenticated requests (public endpoints)
 */
export async function extractAuthContext(c: Context, next: Next) {
	try {
		// ✅ Use canonical snapbackAuth interface
		// Automatically handles all 4 auth methods:
		// 1. x-auth-context header (pre-injected from middleware)
		// 2. Session via cookies (better-auth.session_token)
		// 3. Authorization: Bearer <token> (API key or JWT)
		// 4. x-api-key header
		const auth = await snapbackAuth.getContextFromRequest(c.req.raw);

		// ✅ Attach unified context (may be null for public endpoints)
		if (auth) {
			c.set("auth", auth);
			c.set("userId", auth.userId);
			// Set custom user context (not using better-auth user type)
			c.set("user", {
				id: auth.userId,
				email: auth.email,
				role: auth.role,
				plan: auth.plan,
			} as any);

			// ✅ Attach org context if available
			if (auth.orgId) {
				c.set("orgId", auth.orgId);
				c.set("orgRole", auth.orgRole);
			}

			logger.debug("Auth context extracted", {
				userId: auth.userId,
				authenticatedVia: auth.authenticatedVia,
				plan: auth.plan,
				path: c.req.path,
			});
		}

		await next();
	} catch (error) {
		logger.error("Error extracting auth context", {
			error: error instanceof Error ? error.message : String(error),
			path: c.req.path,
		});

		// Continue without auth on extraction error
		// This allows public endpoints to work
		await next();
	}
}

/**
 * Require authenticated context
 * ✅ Uses canonical snapbackAuth interface
 * Returns 401 if not authenticated
 */
export async function requireAuth(c: Context, next: Next) {
	const auth = c.get("auth");

	if (!auth?.userId) {
		logger.warn("Unauthorized access attempt", {
			path: c.req.path,
			method: c.req.method,
		});

		return c.json(
			{
				error: "Unauthorized",
				code: "AUTH_REQUIRED",
				message: "Authentication required to access this resource",
			},
			401,
		);
	}

	// Auth is valid and attached - proceed
	await next();
}

/**
 * Get current auth context from Hono context
 * Returns SnapbackAuthContext or null if not authenticated
 */
export function getAuthFromContext(c: Context) {
	return c.get("auth") || null;
}

/**
 * Get current user from Hono context
 * Returns user object or null if not authenticated
 */
export function getUserFromContext(c: Context) {
	const auth = c.get("auth");
	return auth
		? {
				id: auth.userId,
				email: auth.email,
				role: auth.role,
				plan: auth.plan,
			}
		: null;
}

/**
 * Get current organization context from Hono context
 * Returns orgId or null if no active organization
 */
export function getOrgIdFromContext(c: Context): string | null {
	const auth = c.get("auth");
	return auth?.orgId || null;
}
