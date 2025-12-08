import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";

/**
 * Authorization Middleware
 *
 * Handles:
 * - User authentication verification
 * - Role-based access control (RBAC)
 * - Organization membership verification
 * - Plan-based feature access
 * - Context enrichment with user data
 */

export interface AuthUser {
	id: string;
	email: string;
	role: "admin" | "user" | "viewer";
	orgId: string;
	plan: "free" | "pro" | "enterprise";
}

export interface AuthContext {
	user: AuthUser;
	permissions: string[];
	tokenClaims: Record<string, unknown>;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader?: string): string | null {
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.slice(7);
}

/**
 * Verify and decode JWT token
 * In production, use a proper JWT library like jsonwebtoken
 */
async function verifyToken(token: string): Promise<AuthUser | null> {
	try {
		// STUB: Mock token verification
		// In production, this would:
		// 1. Verify JWT signature with secret key
		// 2. Check expiration timestamp
		// 3. Return decoded claims

		// For now, accept any token and extract user info from context
		// This is a placeholder for actual JWT verification
		if (token.startsWith("admin_")) {
			return {
				id: "admin-1",
				email: "admin@example.com",
				role: "admin",
				orgId: "org-master",
				plan: "enterprise",
			};
		}

		if (token.startsWith("pro_")) {
			return {
				id: "user-pro",
				email: "pro@example.com",
				role: "user",
				orgId: "org-456",
				plan: "pro",
			};
		}

		if (token.startsWith("free_")) {
			return {
				id: "user-free",
				email: "free@example.com",
				role: "user",
				orgId: "org-789",
				plan: "free",
			};
		}

		if (token.startsWith("user_")) {
			return {
				id: "user-123",
				email: "user@example.com",
				role: "user",
				orgId: "org-456",
				plan: "pro",
			};
		}

		// Invalid token
		return null;
	} catch (err) {
		logger.warn("Token verification failed", {
			error: err instanceof Error ? err.message : String(err),
		});
		return null;
	}
}

/**
 * Generate permissions based on user role and plan
 */
function generatePermissions(user: AuthUser): string[] {
	const permissions: string[] = [];

	// Role-based permissions
	if (user.role === "admin") {
		permissions.push("admin:read", "admin:write", "admin:delete", "org:manage", "user:manage");
	}

	if (user.role === "user" || user.role === "admin") {
		permissions.push("snapshot:create", "snapshot:read", "snapshot:update", "snapshot:delete");
	}

	if (user.role === "viewer" || user.role === "user" || user.role === "admin") {
		permissions.push("snapshot:view", "report:view");
	}

	// Plan-based permissions
	if (user.plan === "pro" || user.plan === "enterprise") {
		permissions.push("api:webhook", "api:advanced-analytics", "team:collaboration");
	}

	if (user.plan === "enterprise") {
		permissions.push("sso:enabled", "audit:enabled", "compliance:enabled", "support:priority");
	}

	return permissions;
}

/**
 * Require authentication middleware
 * Returns 401 if no valid Bearer token provided
 */
export async function requireAuth(c: Context, next: Next): Promise<void> {
	const authHeader = c.req.header("Authorization");
	const token = extractBearerToken(authHeader);

	if (!token) {
		logger.warn("Authentication required", {
			path: c.req.path,
			method: c.req.method,
		});

		c.status(401);
		c.env.rawResponse = c.json({
			code: "unauthorized",
			message: "Authentication required",
			statusCode: 401,
		});
		return;
	}

	const user = await verifyToken(token);
	if (!user) {
		logger.warn("Invalid authentication token", {
			path: c.req.path,
		});

		c.status(401);
		c.env.rawResponse = c.json({
			code: "unauthorized",
			message: "Invalid or expired authentication token",
			statusCode: 401,
		});
		return;
	}

	// Attach user to context
	const context: AuthContext = {
		user,
		permissions: generatePermissions(user),
		tokenClaims: { sub: user.id, email: user.email },
	};
	(c.env as any).auth = context;

	await next();
}

/**
 * Require specific role
 */
export function requireRole(...roles: AuthUser["role"][]) {
	return async (c: Context, next: Next): Promise<void> => {
		const authHeader = c.req.header("Authorization");
		const token = extractBearerToken(authHeader);

		if (!token) {
			c.status(401);
			c.env.rawResponse = c.json(
				{
					code: "unauthorized",
					message: "Authentication required",
					statusCode: 401,
				},
				401,
			);
			return;
		}

		const user = await verifyToken(token);
		if (!user) {
			c.status(401);
			c.env.rawResponse = c.json(
				{
					code: "unauthorized",
					message: "Invalid or expired authentication token",
					statusCode: 401,
				},
				401,
			);
			return;
		}

		if (!roles.includes(user.role)) {
			logger.warn("Insufficient role", {
				path: c.req.path,
				requiredRoles: roles,
				userRole: user.role,
			});

			c.status(403);
			c.env.rawResponse = c.json(
				{
					code: "forbidden",
					message: `Required role: ${roles.join(" or ")}`,
					statusCode: 403,
				},
				403,
			);
			return;
		}

		// Attach user to context
		const context: AuthContext = {
			user,
			permissions: generatePermissions(user),
			tokenClaims: { sub: user.id, email: user.email },
		};
		(c.env as any).auth = context;

		await next();
	};
}

/**
 * Require membership in specific organization
 */
export function requireOrgMembership(paramName = "orgId") {
	return async (c: Context, next: Next): Promise<void> => {
		const authHeader = c.req.header("Authorization");
		const token = extractBearerToken(authHeader);

		if (!token) {
			c.status(401);
			c.env.rawResponse = c.json(
				{
					code: "unauthorized",
					message: "Authentication required",
					statusCode: 401,
				},
				401,
			);
			return;
		}

		const user = await verifyToken(token);
		if (!user) {
			c.status(401);
			c.env.rawResponse = c.json(
				{
					code: "unauthorized",
					message: "Invalid or expired authentication token",
					statusCode: 401,
				},
				401,
			);
			return;
		}

		// Admins can access any org
		if (user.role === "admin") {
			const context: AuthContext = {
				user,
				permissions: generatePermissions(user),
				tokenClaims: { sub: user.id, email: user.email },
			};
			(c.env as any).auth = context;
			await next();
			return;
		}

		// Check org membership
		const requestedOrgId = c.req.param(paramName);
		if (user.orgId !== requestedOrgId) {
			logger.warn("Organization access denied", {
				path: c.req.path,
				userOrgId: user.orgId,
				requestedOrgId,
			});

			c.status(403);
			c.env.rawResponse = c.json(
				{
					code: "forbidden",
					message: "Access to this organization denied",
					statusCode: 403,
				},
				403,
			);
			return;
		}

		// Attach user to context
		const context: AuthContext = {
			user,
			permissions: generatePermissions(user),
			tokenClaims: { sub: user.id, email: user.email },
		};
		(c.env as any).auth = context;

		await next();
	};
}

/**
 * Require minimum plan level
 */
export function requirePlan(...plans: AuthUser["plan"][]) {
	return async (c: Context, next: Next): Promise<void> => {
		const authHeader = c.req.header("Authorization");
		const token = extractBearerToken(authHeader);

		if (!token) {
			c.status(401);
			c.env.rawResponse = c.json(
				{
					code: "unauthorized",
					message: "Authentication required",
					statusCode: 401,
				},
				401,
			);
			return;
		}

		const user = await verifyToken(token);
		if (!user) {
			c.status(401);
			c.env.rawResponse = c.json(
				{
					code: "unauthorized",
					message: "Invalid or expired authentication token",
					statusCode: 401,
				},
				401,
			);
			return;
		}

		if (!plans.includes(user.plan)) {
			logger.warn("Insufficient plan", {
				path: c.req.path,
				requiredPlans: plans,
				userPlan: user.plan,
			});

			c.status(403);
			c.env.rawResponse = c.json(
				{
					code: "forbidden",
					message: `Required plan: ${plans.join(" or ")}`,
					statusCode: 403,
				},
				403,
			);
			return;
		}

		// Attach user to context
		const context: AuthContext = {
			user,
			permissions: generatePermissions(user),
			tokenClaims: { sub: user.id, email: user.email },
		};
		(c.env as any).auth = context;

		await next();
	};
}

/**
 * Get auth context from request
 */
export function getAuthContext(c: Context): AuthContext | undefined {
	return (c.env as any).auth as AuthContext | undefined;
}

/**
 * Check if user has permission
 */
export function hasPermission(c: Context, permission: string): boolean {
	const auth = getAuthContext(c);
	return auth?.permissions.includes(permission) ?? false;
}
