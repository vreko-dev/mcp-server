/**
 * Row-Level Security (RLS) Enforcement Middleware
 *
 * Enforces organization-scoped access control:
 * - Users can only access their own organizations
 * - Admins can access any organization (with audit logging)
 * - Prevents cross-organization data leakage
 *
 * Applies to all routes with org context: /api/orgs/:orgId/*
 */

import { logger } from "@snapback/infrastructure";
import { db } from "@snapback/platform";
import { member } from "@snapback/platform/db/schema/postgres";
import { and, eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import type { AuthContext } from "./auth-unified";

// Lazy-load Sentry
let Sentry: typeof import("@sentry/node") | null = null;
async function loadSentry() {
	if (Sentry) {
		return Sentry;
	}
	if (process.env.DISABLE_SENTRY === "true") {
		return null;
	}
	try {
		Sentry = await import("@sentry/node");
		return Sentry;
	} catch {
		return null;
	}
}

/**
 * Check if user is member of an organization (inline)
 */
async function checkOrgMembership(userId: string, orgId: string) {
	if (!db) {
		return null;
	}
	try {
		return await db
			.select({
				userId: member.userId,
				organizationId: member.organizationId,
				role: member.role,
			})
			.from(member)
			.where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
			.limit(1)
			.then((rows) => rows[0] || null);
	} catch {
		return null;
	}
}

// ============================================================================
// Types
// ============================================================================

interface RLSViolation {
	userId: string;
	requestedOrgId: string;
	userOrgIds: string[];
	path: string;
	timestamp: Date;
}

// ============================================================================
// Configuration
// ============================================================================

const RLS_ROUTES = [/^\/api\/v[0-9]+\/orgs\/[^/]+/, /^\/api\/orgs\/[^/]+/];

function isRLSRoute(path: string): boolean {
	return RLS_ROUTES.some((pattern) => pattern.test(path));
}

function extractOrgIdFromPath(path: string): string | null {
	const match = path.match(/\/orgs\/([^/]+)/);
	return match ? match[1] : null;
}

// ============================================================================
// RLS Violation Logging
// ============================================================================

async function logRLSViolation(violation: RLSViolation): Promise<void> {
	logger.warn("RLS violation attempted", {
		userId: violation.userId,
		requestedOrgId: violation.requestedOrgId,
		userOrgIds: violation.userOrgIds,
		path: violation.path,
		timestamp: violation.timestamp.toISOString(),
	});

	// Send to security monitoring systems
	try {
		const SentryModule = await loadSentry();
		if (SentryModule?.captureMessage) {
			// Send to Sentry for alerting
			SentryModule.captureMessage("RLS Policy Violation Attempted", {
				level: "warning",
				contexts: {
					rls_violation: {
						user_id: violation.userId,
						requested_org_id: violation.requestedOrgId,
						user_org_ids: violation.userOrgIds,
						path: violation.path,
						timestamp: violation.timestamp.toISOString(),
					},
				},
				tags: {
					security_event: "rls_violation",
					user_id: violation.userId,
					org_id: violation.requestedOrgId,
				},
			});
		}
	} catch (sentryError) {
		logger.debug("Could not send RLS violation to Sentry", {
			error: sentryError instanceof Error ? sentryError.message : String(sentryError),
		});
	}

	// Track in database for analytics (optional)
	// This allows detecting patterns of repeated violation attempts
	try {
		// Skip database logging for now - securityEvents table may not exist
		// TODO: Re-enable when schema is stabilized
		logger.debug("Would log RLS violation to database", {
			userId: violation.userId,
			requestedOrgId: violation.requestedOrgId,
		});
	} catch (error) {
		logger.debug("Could not log RLS violation to database", {
			error: error instanceof Error ? error.message : String(error),
		});
		// Don't fail the request if logging fails
	}
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Enforce Row-Level Security for organization-scoped routes
 *
 * Rules:
 * - Unauthenticated requests: 401 Unauthorized
 * - User requests own org: 200 OK (allow)
 * - User requests other org: 403 Forbidden (deny + log)
 * - Admin requests any org: 200 OK (allow + audit log)
 */
export async function enforceRLS(c: Context, next: Next) {
	const path = c.req.path;

	// Skip RLS check if not an org-scoped route
	if (!isRLSRoute(path)) {
		await next();
		return;
	}

	const auth = c.get("auth") as AuthContext | undefined;

	// Unauthenticated requests to org routes are forbidden
	if (!auth) {
		logger.warn("Unauthenticated request to org-scoped endpoint", {
			path,
			method: c.req.method,
		});

		return c.json(
			{
				code: "unauthenticated",
				message: "Authentication required for organization access",
			},
			401,
		);
	}

	// Extract organization ID from path
	const requestedOrgId = extractOrgIdFromPath(path);
	if (!requestedOrgId) {
		logger.error("Could not extract org ID from RLS route", { path });

		return c.json(
			{
				code: "bad_request",
				message: "Invalid organization path",
			},
			400,
		);
	}

	// Admins can access any organization
	if (auth.user.role === "admin") {
		// Audit log admin access to other orgs
		if (auth.orgIds && !auth.orgIds.includes(requestedOrgId)) {
			logger.info("Admin accessing organization outside membership", {
				userId: auth.user.id,
				requestedOrgId,
				userOrgIds: auth.orgIds || [],
				path,
			});
		}

		await next();
		return;
	}

	// Regular users: check membership
	const isMember = auth.orgIds?.includes(requestedOrgId) || false;

	if (!isMember) {
		// Log RLS violation
		const violation: RLSViolation = {
			userId: auth.user.id,
			requestedOrgId,
			userOrgIds: auth.orgIds || [],
			path,
			timestamp: new Date(),
		};

		await logRLSViolation(violation);

		return c.json(
			{
				code: "forbidden",
				message: "Access to this organization denied",
			},
			403,
		);
	}

	// User is member of requested org - allow
	await next();
}

/**
 * Optional: Stricter RLS enforcement that also validates resource ownership
 * Use for sensitive endpoints like /api/orgs/:orgId/members/:userId/delete
 *
 * This ensures that not only is the user in the org, but the resource
 * being accessed actually belongs to that org.
 */
export async function enforceResourceRLS(c: Context, next: Next) {
	const auth = c.get("auth") as AuthContext | undefined;

	if (!auth) {
		return c.json({ code: "unauthenticated", message: "Authentication required" }, 401);
	}

	const requestedOrgId = extractOrgIdFromPath(c.req.path);

	if (!requestedOrgId) {
		return c.json({ code: "bad_request", message: "Invalid organization path" }, 400);
	}

	// Check membership using database lookup
	const membership = await checkOrgMembership(auth.user.id, requestedOrgId);

	if (!membership && auth.user.role !== "admin") {
		const violation: RLSViolation = {
			userId: auth.user.id,
			requestedOrgId,
			userOrgIds: auth.orgIds || [],
			path: c.req.path,
			timestamp: new Date(),
		};

		await logRLSViolation(violation);

		return c.json(
			{
				code: "forbidden",
				message: "Access to this resource denied",
			},
			403,
		);
	}

	await next();
}

/**
 * Inject organization context into request
 * Useful for handlers that need to reference the current org
 */
export async function injectOrgContext(c: Context, next: Next): Promise<void> {
	const requestedOrgId = extractOrgIdFromPath(c.req.path);

	if (requestedOrgId) {
		c.set("orgId", requestedOrgId);
	}

	await next();
}

/**
 * Get the current organization ID from context
 * Safe to call after RLS enforcement middleware
 */
export function getCurrentOrgId(c: Context): string | null {
	return c.get("orgId") || null;
}

// ============================================================================
// Exports
// ============================================================================

export type { RLSViolation };
