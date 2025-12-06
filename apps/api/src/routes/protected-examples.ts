import { logger } from "@snapback/infrastructure";
import { Hono } from "hono";
import { z } from "zod";
import {
	getAuthContext,
	requireAuth,
	requireOrgMembership,
	requirePlan,
	requireRole,
} from "../middleware/auth";
import { validateBody } from "../middleware/validation";

/**
 * Protected Route Examples
 *
 * Demonstrates middleware integration for:
 * 1. Public endpoints (no protection)
 * 2. Auth-required endpoints
 * 3. Role-based endpoints (admin)
 * 4. Organization-scoped endpoints
 * 5. Plan-based feature endpoints
 */

const router = new Hono();

// ============================================================================
// 1. PUBLIC ROUTE - No protection required
// ============================================================================

/**
 * GET /api/public/health
 * Public endpoint - no authentication needed
 * Demonstrates: Open access pattern
 */
router.get("/public/health", async (c) => {
	return c.json({
		success: true,
		message: "Public endpoint accessible without authentication",
		timestamp: new Date().toISOString(),
	});
});

// ============================================================================
// 2. AUTH-REQUIRED ROUTES - User must be authenticated
// ============================================================================

/**
 * GET /api/users/profile
 * Protected: Authentication required
 * Demonstrates: Basic auth middleware + context enrichment
 */
router.get("/users/profile", requireAuth, async (c) => {
	const auth = getAuthContext(c);

	if (!auth) {
		return c.json(
			{
				success: false,
				error: "Authentication context missing",
			},
			401,
		);
	}

	logger.info("Profile accessed", {
		userId: auth.user.id,
		email: auth.user.email,
	});

	return c.json({
		success: true,
		user: {
			id: auth.user.id,
			email: auth.user.email,
			role: auth.user.role,
			plan: auth.user.plan,
		},
		permissions: auth.permissions,
	});
});

/**
 * POST /api/users/settings
 * Protected: Authentication required + request body validation
 * Demonstrates: Chaining auth middleware with validation
 */
const settingsSchema = z.object({
	theme: z.enum(["light", "dark"]).optional(),
	notifications: z.boolean().optional(),
	language: z.string().min(2).max(5).optional(),
});

router.post("/users/settings", requireAuth, async (c) => {
	const validationResult = await validateBody(c, settingsSchema);

	if (!validationResult.success) {
		return c.json(validationResult.error, 400);
	}

	const auth = getAuthContext(c);
	const settings = validationResult.value;

	logger.info("Settings updated", {
		userId: auth?.user.id,
		settings,
	});

	return c.json({
		success: true,
		message: "Settings updated",
		settings,
	});
});

// ============================================================================
// 3. ADMIN-ONLY ROUTES - Requires admin role
// ============================================================================

/**
 * GET /api/admin/users
 * Protected: Admin role required
 * Demonstrates: Role-based access control (RBAC)
 */
router.get("/admin/users", requireRole("admin"), async (c) => {
	const auth = getAuthContext(c);

	logger.info("Admin users list accessed", {
		adminId: auth?.user.id,
		role: auth?.user.role,
	});

	// Simulated user list
	const users = [
		{ id: "user-1", email: "user1@example.com", role: "user" },
		{ id: "user-2", email: "user2@example.com", role: "user" },
		{ id: "admin-1", email: "admin@example.com", role: "admin" },
	];

	return c.json({
		success: true,
		data: users,
		count: users.length,
	});
});

/**
 * DELETE /api/admin/users/:id
 * Protected: Admin role required
 * Demonstrates: Admin operations with audit logging
 */
router.delete("/admin/users/:id", requireRole("admin"), async (c) => {
	const userId = c.req.param("id");
	const auth = getAuthContext(c);

	logger.warn("User deleted by admin", {
		deletedUserId: userId,
		adminId: auth?.user.id,
		action: "user_deletion",
	});

	return c.json({
		success: true,
		message: `User ${userId} deleted`,
		deletedBy: auth?.user.id,
	});
});

// ============================================================================
// 4. ORGANIZATION-SCOPED ROUTES - Requires org membership
// ============================================================================

/**
 * GET /api/org/:orgId/members
 * Protected: Org membership required (or admin)
 * Demonstrates: Organization-based access control
 */
router.get("/org/:orgId/members", requireOrgMembership("orgId"), async (c) => {
	const orgId = c.req.param("orgId");
	const auth = getAuthContext(c);

	logger.info("Org members accessed", {
		orgId,
		userId: auth?.user.id,
		userOrg: auth?.user.orgId,
	});

	const members = [
		{ id: "user-1", email: "user1@org.com", role: "admin" },
		{ id: "user-2", email: "user2@org.com", role: "user" },
		{ id: "user-3", email: "user3@org.com", role: "viewer" },
	];

	return c.json({
		success: true,
		organization: orgId,
		members,
		memberCount: members.length,
	});
});

/**
 * POST /api/org/:orgId/settings
 * Protected: Org membership + validation
 * Demonstrates: Org-scoped updates with audit trail
 */
const orgSettingsSchema = z.object({
	name: z.string().min(3),
	description: z.string().optional(),
	publicProfile: z.boolean().optional(),
});

router.post(
	"/org/:orgId/settings",
	requireOrgMembership("orgId"),
	async (c) => {
		const validationResult = await validateBody(c, orgSettingsSchema);

		if (!validationResult.success) {
			return c.json(validationResult.error, 400);
		}

		const orgId = c.req.param("orgId");
		const auth = getAuthContext(c);
		const settings = validationResult.value;

		logger.info("Organization settings updated", {
			orgId,
			updatedBy: auth?.user.id,
			changes: settings,
		});

		return c.json({
			success: true,
			organization: orgId,
			settings,
		});
	},
);

// ============================================================================
// 5. PLAN-BASED FEATURE ROUTES - Requires subscription plan
// ============================================================================

/**
 * POST /api/advanced-analytics
 * Protected: Pro or enterprise plan required
 * Demonstrates: Feature gating based on subscription plan
 */
const analyticsQuerySchema = z.object({
	metricType: z.enum(["engagement", "retention", "conversion"]),
	timeRange: z.enum(["7d", "30d", "90d"]),
	breakdown: z.enum(["hourly", "daily", "weekly"]).optional(),
});

router.post(
	"/advanced-analytics",
	requirePlan("pro", "enterprise"),
	async (c) => {
		const validationResult = await validateBody(c, analyticsQuerySchema);

		if (!validationResult.success) {
			return c.json(validationResult.error, 400);
		}

		const auth = getAuthContext(c);
		const query = validationResult.value;

		logger.info("Advanced analytics accessed", {
			userId: auth?.user.id,
			plan: auth?.user.plan,
			query,
		});

		// Simulated analytics response
		const analytics = {
			metric: query.metricType,
			timeRange: query.timeRange,
			data: [
				{ period: "2025-11-30", value: 450 },
				{ period: "2025-11-29", value: 520 },
				{ period: "2025-11-28", value: 380 },
			],
			summary: {
				average: 450,
				peak: 520,
				trend: "up",
			},
		};

		return c.json({
			success: true,
			data: analytics,
		});
	},
);

/**
 * POST /api/export-data
 * Protected: Pro or enterprise plan required
 * Demonstrates: Premium feature with format options
 */
const exportSchema = z.object({
	format: z.enum(["csv", "json", "parquet"]),
	dateRange: z.object({
		start: z.string().datetime(),
		end: z.string().datetime(),
	}),
});

router.post("/export-data", requirePlan("pro", "enterprise"), async (c) => {
	const validationResult = await validateBody(c, exportSchema);

	if (!validationResult.success) {
		return c.json(validationResult.error, 400);
	}

	const auth = getAuthContext(c);
	const options = validationResult.value;

	logger.info("Data export requested", {
		userId: auth?.user.id,
		format: options.format,
		plan: auth?.user.plan,
	});

	return c.json({
		success: true,
		message: "Export job queued",
		exportId: `export-${Date.now()}`,
		format: options.format,
		estimatedSize: "250MB",
		estimatedTime: "2-5 minutes",
	});
});

/**
 * GET /api/sso-config
 * Protected: Enterprise plan only
 * Demonstrates: Enterprise-only features
 */
router.get("/sso-config", requirePlan("enterprise"), async (c) => {
	const auth = getAuthContext(c);

	logger.info("SSO config accessed", {
		userId: auth?.user.id,
		plan: auth?.user.plan,
	});

	return c.json({
		success: true,
		ssoEnabled: true,
		providers: ["okta", "azure-ad", "google-workspace"],
		configuration: {
			samlMetadataUrl: "https://api.example.com/saml/metadata",
			acsUrl: "https://api.example.com/saml/acs",
			entityId: "snapback-app",
		},
	});
});

// ============================================================================
// MIDDLEWARE CHAINING EXAMPLE - Auth + Validation + Role Check
// ============================================================================

/**
 * POST /api/admin/bulk-invite
 * Protected: Admin role + request validation
 * Demonstrates: Chaining multiple middleware checks
 */
const bulkInviteSchema = z.object({
	emails: z.array(z.string().email()).min(1).max(100),
	role: z.enum(["user", "moderator"]),
	message: z.string().optional(),
});

router.post("/admin/bulk-invite", requireRole("admin"), async (c) => {
	// First validate request
	const validationResult = await validateBody(c, bulkInviteSchema);

	if (!validationResult.success) {
		return c.json(validationResult.error, 400);
	}

	const auth = getAuthContext(c);
	const { emails, role, message } = validationResult.value;

	logger.info("Bulk invite initiated", {
		adminId: auth?.user.id,
		emailCount: emails.length,
		role,
	});

	return c.json({
		success: true,
		message: `Invites sent to ${emails.length} users`,
		emailsSent: emails,
		role,
	});
});

export default router;
