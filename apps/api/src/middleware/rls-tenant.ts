/**
 * RLS (Row Level Security) tenant isolation middleware
 * Sets `app.current_org` for Postgres RLS policies
 * Ensures all org-scoped queries are automatically isolated
 */

import { logger } from "@snapback/infrastructure";
import { sql } from "drizzle-orm";
import type { Context, Next } from "hono";
import { getDb } from "../services/database";

/**
 * Set current organization and user for RLS policies
 */
async function setCurrentOrg(orgId: string, userId: string): Promise<void> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not initialized");
	}

	try {
		// Set local variables for current transaction
		// RLS policies will reference these:
		// - current_setting('app.current_org', true)::uuid
		// - current_setting('app.current_user', true)
		await getDb().execute(sql`SET LOCAL app.current_org = ${orgId}`);
		await getDb().execute(sql`SET LOCAL app.current_user = ${userId}`);

		logger.debug("RLS context set", { orgId, userId });
	} catch (error) {
		logger.error("Failed to set RLS context", { error, orgId, userId });
		throw error;
	}
}

/**
 * Clear current organization and user (for cleanup)
 */
async function clearCurrentOrg(): Promise<void> {
	const db = getDb();
	if (!db) {
		return;
	}

	try {
		await getDb().execute(sql`RESET app.current_org`);
		await getDb().execute(sql`RESET app.current_user`);
		logger.debug("RLS context cleared");
	} catch (error) {
		logger.error("Failed to clear RLS context", { error });
	}
}

/**
 * Get organization ID from context
 * Priority:
 * 1. User's active organization (from session)
 * 2. Organization from JWT (for tools)
 * 3. Query parameter (for org-specific endpoints)
 * 4. Path parameter (for /org/:orgId/... routes)
 */
function getOrgIdFromContext(c: Context): string | null {
	// 1. Check active organization from Better Auth session
	const session = c.get("session");
	if (session?.activeOrganizationId) {
		return session.activeOrganizationId;
	}

	// 2. Check JWT for tools
	const orgIdFromJWT = c.get("orgId");
	if (orgIdFromJWT) {
		return orgIdFromJWT;
	}

	// 3. Check query parameter
	const queryOrgId = c.req.query("orgId");
	if (queryOrgId) {
		return queryOrgId;
	}

	// 4. Check path parameter
	const pathOrgId = c.req.param("orgId");
	if (pathOrgId) {
		return pathOrgId;
	}

	return null;
}

/**
 * Verify user has access to organization
 */
async function verifyOrgAccess(
	userId: string,
	orgId: string,
): Promise<boolean> {
	const db = getDb();
	if (!db) {
		return false;
	}

	try {
		// Query organization_members to verify user is a member
		// This should be available from Better Auth's organization plugin
		const result = await getDb().execute(
			sql`
				SELECT 1 FROM organization_member
				WHERE user_id = ${userId} AND organization_id = ${orgId}
				LIMIT 1
			`,
		);

		return result.rows.length > 0;
	} catch (error) {
		logger.error("Error verifying org access", { error, userId, orgId });
		return false;
	}
}

/**
 * Middleware to enforce RLS tenant isolation
 * Sets app.current_org for all database queries in this request
 */
export async function enforceRLS(c: Context, next: Next) {
	const user = c.get("user");
	const userId = c.get("userId"); // From JWT

	if (!user && !userId) {
		// No authenticated user - skip RLS (public endpoints)
		await next();
		return;
	}

	const actualUserId = user?.id || userId;
	const orgId = getOrgIdFromContext(c);

	if (!orgId) {
		// No organization context - skip RLS (personal endpoints)
		await next();
		return;
	}

	// Verify user has access to this organization
	const hasAccess = await verifyOrgAccess(actualUserId, orgId);

	if (!hasAccess) {
		logger.warn("RLS: User attempted to access unauthorized organization", {
			userId: actualUserId,
			orgId,
			path: c.req.path,
		});

		return c.json(
			{
				error: "Access denied",
				code: "ORG_ACCESS_DENIED",
				message: "You do not have access to this organization",
			},
			403,
		);
	}

	// Set current org and user for RLS
	try {
		await setCurrentOrg(orgId, actualUserId);

		// Store in context for reference
		c.set("currentOrgId", orgId);

		logger.debug("RLS enforced", {
			userId: actualUserId,
			orgId,
			path: c.req.path,
		});

		await next();

		// Clear after request (though transaction should handle this)
		await clearCurrentOrg();
	} catch (error) {
		logger.error("Error enforcing RLS", {
			error,
			userId: actualUserId,
			orgId,
		});

		return c.json(
			{
				error: "Internal server error",
				code: "RLS_ERROR",
			},
			500,
		);
	}
}

/**
 * Middleware to require organization context
 * Use on endpoints that MUST have an organization
 */
export async function requireOrg(c: Context, next: Next) {
	const orgId = getOrgIdFromContext(c);

	if (!orgId) {
		return c.json(
			{
				error: "Organization required",
				code: "ORG_REQUIRED",
				message: "This endpoint requires an organization context",
			},
			400,
		);
	}

	await next();
}

/**
 * Get current organization ID from context
 */
export function getCurrentOrgId(c: Context): string | null {
	return c.get("currentOrgId") || getOrgIdFromContext(c);
}

/**
 * Example RLS policies (SQL to be run in migrations):
 *
 * -- Enable RLS on org-scoped tables
 * ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
 *
 * -- Policy: Users can only access snapshots from their organization
 * CREATE POLICY snapshots_org_isolation ON snapshots
 *   FOR ALL
 *   USING (organization_id = current_setting('app.current_org', true)::uuid);
 *
 * -- Policy: Users can only access sessions from their organization
 * CREATE POLICY sessions_org_isolation ON sessions
 *   FOR ALL
 *   USING (organization_id = current_setting('app.current_org', true)::uuid);
 *
 * -- Policy: Users can only access policies from their organization
 * CREATE POLICY policies_org_isolation ON policies
 *   FOR ALL
 *   USING (organization_id = current_setting('app.current_org', true)::uuid);
 *
 * -- Negative test: Verify isolation
 * -- SET LOCAL app.current_org = '00000000-0000-0000-0000-000000000001';
 * -- SELECT * FROM snapshots; -- Should only see org 1's snapshots
 * -- SET LOCAL app.current_org = '00000000-0000-0000-0000-000000000002';
 * -- SELECT * FROM snapshots; -- Should only see org 2's snapshots
 */

/**
 * Helper to create RLS-enabled database client
 * Call this at the start of any org-scoped operation
 */
export async function withOrgContext<T>(
	orgId: string,
	userId: string,
	operation: () => Promise<T>,
): Promise<T> {
	await setCurrentOrg(orgId, userId);
	try {
		return await operation();
	} finally {
		await clearCurrentOrg();
	}
}
