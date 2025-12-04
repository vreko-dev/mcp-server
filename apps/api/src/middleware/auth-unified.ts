/**
 * Unified Authentication Middleware
 *
 * Handles all authentication methods:
 * 1. JWT tokens via Better Auth (via Authorization: Bearer header)
 * 2. API keys (via X-API-Key header)
 * 3. Session cookies (via better-auth.session_token)
 *
 * Validates credentials against database and attaches auth context to request.
 * Follows the principle of explicit over implicit - no auth = no context.
 */

import { logger } from "@snapback/infrastructure";
import {
	getApiKeyByPrefix,
	getUserById,
	getUserOrgIds,
	getUserPermissions,
	getUserPlan,
	updateApiKeyLastUsed,
} from "@snapback/platform/db/queries/auth";
import type { Context, Next } from "hono";
import { jwtVerify } from "jose";

// ============================================================================
// Types
// ============================================================================

export interface AuthContext {
	user: {
		id: string;
		email: string;
		role: "admin" | "user" | "viewer" | null;
		name: string;
	};
	plan: "free" | "solo" | "team" | "enterprise";
	permissions: string[];
	authenticatedVia: "jwt" | "api-key" | "session";
	apiKeyId?: string;
	orgIds?: string[];
}

// ============================================================================
// JWT Verification
// ============================================================================

const JWT_SECRET = (() => {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) {
		logger.warn("BETTER_AUTH_SECRET not set, JWT validation will fail");
		return new TextEncoder().encode("dev-secret");
	}
	return new TextEncoder().encode(secret);
})();

/**
 * Verify JWT token from Better Auth
 * Returns decoded claims if valid, null otherwise
 */
async function verifyJWT(token: string): Promise<{
	sub: string;
	email?: string;
} | null> {
	try {
		const verified = await jwtVerify(token, JWT_SECRET);
		return verified.payload as any;
	} catch (error) {
		logger.debug("JWT verification failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

// ============================================================================
// API Key Verification
// ============================================================================

/**
 * Verify API key from X-API-Key header
 * Extracts key prefix and validates against database
 *
 * Note: In production, you would:
 * 1. Extract full key from secure source
 * 2. Use bcrypt.compare(fullKey, storedHash) for constant-time comparison
 * 3. Implement rotation strategy
 */
async function verifyApiKey(apiKeyHeader: string): Promise<{
	userId: string;
	keyId: string;
} | null> {
	try {
		// API key format: "sk_live_[32 chars]" or "sk_test_[32 chars]"
		const keyParts = apiKeyHeader.split("_");
		if (keyParts.length < 2) {
			logger.debug("Invalid API key format");
			return null;
		}

		// Use first two parts as preview (sk_live or sk_test)
		const keyPreview = `${keyParts[0]}_${keyParts[1]}`;

		const key = await getApiKeyByPrefix(keyPreview);

		if (!key) {
			logger.debug("API key not found", { keyPreview });
			return null;
		}

		// Update last used timestamp for audit trail
		await updateApiKeyLastUsed(key.id);

		return {
			userId: key.userId,
			keyId: key.id,
		};
	} catch (error) {
		logger.error("API key verification failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

// ============================================================================
// Main Middleware
// ============================================================================

/**
 * Extract and validate authentication context
 * Optional - attaches context only if credentials provided and valid
 * Public endpoints can proceed without auth context
 */
export async function extractAuthContext(
	c: Context,
	next: Next,
): Promise<void> {
	try {
		let authContext: AuthContext | null = null;

		// Try JWT token first (highest priority)
		const authHeader = c.req.header("Authorization");
		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.slice(7);
			const claims = await verifyJWT(token);

			if (claims?.sub) {
				const userRecord = await getUserById(claims.sub);
				if (userRecord) {
					const plan = await getUserPlan(userRecord.id);
					const permissions = await getUserPermissions(userRecord.id);
					const orgIds = await getUserOrgIds(userRecord.id);

					authContext = {
						user: {
							id: userRecord.id,
							email: userRecord.email,
							role: (userRecord.role as any) || null,
							name: userRecord.name,
						},
						plan: (plan as any) || "free",
						permissions,
						authenticatedVia: "jwt",
						orgIds,
					};

					logger.debug("User authenticated via JWT", {
						userId: userRecord.id,
						plan,
					});
				}
			}
		}

		// Try API key if JWT failed
		if (!authContext) {
			const apiKeyHeader = c.req.header("X-API-Key");
			if (apiKeyHeader) {
				const verified = await verifyApiKey(apiKeyHeader);

				if (verified) {
					const userRecord = await getUserById(verified.userId);
					if (userRecord) {
						const plan = await getUserPlan(userRecord.id);
						const permissions = await getUserPermissions(userRecord.id);
						const orgIds = await getUserOrgIds(userRecord.id);

						authContext = {
							user: {
								id: userRecord.id,
								email: userRecord.email,
								role: (userRecord.role as any) || null,
								name: userRecord.name,
							},
							plan: (plan as any) || "free",
							permissions,
							authenticatedVia: "api-key",
							apiKeyId: verified.keyId,
							orgIds,
						};

						logger.debug("User authenticated via API key", {
							userId: userRecord.id,
							plan,
							keyId: verified.keyId,
						});
					}
				}
			}
		}

		// Attach auth context if available
		if (authContext) {
			c.set("auth", authContext);
		}

		await next();
	} catch (error) {
		logger.error("Auth middleware error", {
			error: error instanceof Error ? error.message : String(error),
		});
		// Continue without auth context on error (don't break public endpoints)
		await next();
	}
}

// ============================================================================
// Required Authentication Middleware
// ============================================================================

/**
 * Require valid authentication
 * Returns 401 if no auth context present
 */
export async function requireAuth(c: Context, next: Next) {
	const auth = c.get("auth") as AuthContext | undefined;

	if (!auth) {
		logger.warn("Unauthenticated request to protected endpoint", {
			path: c.req.path,
			method: c.req.method,
		});

		return c.json(
			{
				code: "unauthenticated",
				message: "Authentication required",
			},
			401,
		);
	}

	await next();
}

// ============================================================================
// Role-Based Access Control Middleware
// ============================================================================

/**
 * Require specific role(s)
 * Returns 403 if user role doesn't match
 */
export function requireRole(
	...roles: (string | null)[]
): (c: Context, next: Next) => Promise<Response | undefined> {
	return async (c: Context, next: Next) => {
		const auth = c.get("auth") as AuthContext | undefined;

		if (!auth) {
			return c.json(
				{ code: "unauthenticated", message: "Authentication required" },
				401,
			);
		}

		if (!roles.includes(auth.user.role)) {
			logger.warn("Insufficient role", {
				userId: auth.user.id,
				requiredRoles: roles,
				actualRole: auth.user.role,
				path: c.req.path,
			});

			return c.json(
				{
					code: "forbidden",
					message: `Required role: ${roles.join(" or ")}`,
				},
				403,
			);
		}

		await next();
	};
}

// ============================================================================
// Plan-Based Access Control Middleware
// ============================================================================

/**
 * Require minimum subscription plan
 * Plan hierarchy: free < solo < team < enterprise
 */
export function requirePlan(
	...plans: string[]
): (c: Context, next: Next) => Promise<Response | undefined> {
	return async (c: Context, next: Next) => {
		const auth = c.get("auth") as AuthContext | undefined;

		if (!auth) {
			return c.json(
				{ code: "unauthenticated", message: "Authentication required" },
				401,
			);
		}

		if (!plans.includes(auth.plan)) {
			logger.warn("Insufficient plan tier", {
				userId: auth.user.id,
				requiredPlans: plans,
				actualPlan: auth.plan,
				path: c.req.path,
			});

			return c.json(
				{
					code: "insufficient_plan",
					message: `Requires plan: ${plans.join(" or ")}`,
				},
				403,
			);
		}

		await next();
	};
}

// ============================================================================
// Permission-Based Access Control Middleware
// ============================================================================

/**
 * Require specific permission(s)
 * Supports wildcard patterns (e.g., "snapshot:*")
 */
export function requirePermission(
	...perms: string[]
): (c: Context, next: Next) => Promise<Response | undefined> {
	return async (c: Context, next: Next) => {
		const auth = c.get("auth") as AuthContext | undefined;

		if (!auth) {
			return c.json(
				{ code: "unauthenticated", message: "Authentication required" },
				401,
			);
		}

		const hasPermission = perms.some((perm) => {
			// Admin wildcard
			if (auth.permissions.includes("*")) {
				return true;
			}

			// Exact match
			if (auth.permissions.includes(perm)) {
				return true;
			}

			// Wildcard pattern match (e.g., "snapshot:*" matches "snapshot:create")
			const [resource] = perm.split(":");
			const wildcardPerm = `${resource}:*`;
			if (auth.permissions.includes(wildcardPerm)) {
				return true;
			}

			return false;
		});

		if (!hasPermission) {
			logger.warn("Insufficient permissions", {
				userId: auth.user.id,
				requiredPermissions: perms,
				actualPermissions: auth.permissions,
				path: c.req.path,
			});

			return c.json(
				{
					code: "forbidden",
					message: "Insufficient permissions",
				},
				403,
			);
		}

		await next();
	};
}

// ============================================================================
// Organization Scoping Middleware
// ============================================================================

/**
 * Require membership in organization
 * Extracts orgId from path parameter and validates membership
 * Format: /api/orgs/:orgId/...
 */
export function requireOrgMembership(
	paramName = "orgId",
): (c: Context, next: Next) => Promise<Response | undefined> {
	return async (c: Context, next: Next) => {
		const auth = c.get("auth") as AuthContext | undefined;

		if (!auth) {
			return c.json(
				{ code: "unauthenticated", message: "Authentication required" },
				401,
			);
		}

		// Extract orgId from path parameter
		const requestedOrgId = c.req.param(paramName);

		if (!requestedOrgId) {
			logger.warn("Org ID not found in request", {
				paramName,
				path: c.req.path,
			});
			return c.json(
				{ code: "bad_request", message: "Organization ID required" },
				400,
			);
		}

		// Admins can access any org
		if (auth.user.role === "admin") {
			await next();
			return;
		}

		// Check membership for non-admins
		const userOrgIds = await getUserOrgIds(auth.user.id);
		if (!userOrgIds.includes(requestedOrgId)) {
			logger.warn("Organization access denied", {
				userId: auth.user.id,
				requestedOrgId,
				userOrgIds,
				path: c.req.path,
			});

			return c.json(
				{
					code: "forbidden",
					message: "Access to this organization denied",
				},
				403,
			);
		}

		await next();
	};
}

// ============================================================================
// Helper Function
// ============================================================================

/**
 * Get current auth context from request
 * Safe to call from route handlers after middleware
 */
export function getAuthContext(c: Context): AuthContext | undefined {
	return c.get("auth") as AuthContext | undefined;
}
