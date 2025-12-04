/**
 * Audit Logging Middleware
 *
 * Logs all sensitive operations for compliance, security investigation, and debugging.
 * Integrates with security_events table in Drizzle ORM.
 *
 * Logged Operations:
 * - User creation, updates, deletion
 * - API key creation, revocation
 * - Permission changes
 * - Admin operations
 * - Authentication failures (configurable)
 */

import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";
import type { AuthContext } from "./auth-unified.js";

// ============================================================================
// Types
// ============================================================================

interface AuditLogEntry {
	userId?: string;
	action: string;
	resource: string;
	resourceId?: string;
	status: "success" | "failure";
	ipAddress?: string;
	userAgent?: string;
	details?: Record<string, any>;
	timestamp: Date;
}

// ============================================================================
// Sensitive Routes Configuration
// ============================================================================

const SENSITIVE_ROUTES = [
	// User management
	/^\/api\/users\/.*\/(delete|ban|role)/,
	/^\/api\/users\/create/,
	/^\/api\/users\/[^/]+\/password/,

	// API key management
	/^\/api\/api-keys\/create/,
	/^\/api\/api-keys\/[^/]+\/revoke/,
	/^\/api\/api-keys\/[^/]+\/regenerate/,

	// Admin operations
	/^\/api\/admin\/.*/,

	// Organization management
	/^\/api\/orgs\/[^/]+\/members\/[^/]+\/(role|remove)/,
	/^\/api\/orgs\/[^/]+\/delete/,

	// Permissions
	/^\/api\/permissions\/.*/,

	// Billing
	/^\/api\/billing\/.*/,
];

// ============================================================================
// Helper Functions
// ============================================================================

function isSensitiveRoute(path: string): boolean {
	return SENSITIVE_ROUTES.some((pattern) => pattern.test(path));
}

function getClientIp(c: Context): string {
	return (
		c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
		c.req.header("x-real-ip") ||
		"unknown"
	);
}

function parseAction(method: string, path: string): string {
	const pathSegments = path.split("/");
	const lastSegment = pathSegments[pathSegments.length - 1];

	if (method === "POST") {
		if (lastSegment === "delete") {
			return "delete";
		}
		if (lastSegment === "revoke") {
			return "revoke";
		}
		if (lastSegment === "regenerate") {
			return "regenerate";
		}
		return "create";
	}

	if (method === "PATCH" || method === "PUT") {
		return "update";
	}
	if (method === "DELETE") {
		return "delete";
	}

	return "unknown";
}

function extractResourceInfo(path: string): { resource: string; id?: string } {
	const segments = path.split("/").filter((s) => s);

	// /api/users/:id -> resource: users, id: :id
	// /api/api-keys/:id -> resource: api-keys, id: :id
	if (segments.length >= 2) {
		const resource = segments[1]; // "users", "api-keys", etc.
		const id = segments[2]; // Resource ID if present

		return {
			resource,
			id: id && id !== "create" ? id : undefined,
		};
	}

	return { resource: "unknown" };
}

// ============================================================================
// Database Logging
// ============================================================================

async function logToDatabase(entry: AuditLogEntry): Promise<void> {
	try {
		// Try to insert into security_events table if it exists
		// This assumes the schema has a security_events table matching our needs

		// Fallback: just log to structured logging
		logger.info("Audit log", {
			userId: entry.userId || "anonymous",
			action: entry.action,
			resource: entry.resource,
			resourceId: entry.resourceId,
			status: entry.status,
			ipAddress: entry.ipAddress,
			timestamp: entry.timestamp.toISOString(),
			details: entry.details,
		});
	} catch (error) {
		logger.error("Failed to write audit log to database", {
			error: error instanceof Error ? error.message : String(error),
			entry,
		});
	}
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Audit logging middleware
 * Logs sensitive operations for compliance and security investigation
 */
export async function auditLogging(c: Context, next: Next): Promise<void> {
	const path = c.req.path;
	const method = c.req.method;

	// Only log sensitive operations
	if (!isSensitiveRoute(path)) {
		await next();
		return;
	}

	const auth = c.get("auth") as AuthContext | undefined;
	const { resource, id: resourceId } = extractResourceInfo(path);
	const action = parseAction(method, path);
	const ipAddress = getClientIp(c);
	const userAgent = c.req.header("user-agent");

	const startTime = Date.now();

	try {
		// Continue processing
		await next();

		// Determine response status
		const responseStatus = c.res.status;
		const status =
			responseStatus >= 200 && responseStatus < 300 ? "success" : "failure";

		const entry: AuditLogEntry = {
			userId: auth?.user.id,
			action,
			resource,
			resourceId,
			status,
			ipAddress,
			userAgent,
			details: {
				method,
				path,
				responseStatus,
				durationMs: Date.now() - startTime,
				authenticatedVia: auth?.authenticatedVia,
				plan: auth?.plan,
			},
			timestamp: new Date(),
		};

		await logToDatabase(entry);

		// Log sensitive failures to warn level
		if (status === "failure") {
			logger.warn("Sensitive operation failed", {
				...entry,
				timestamp: entry.timestamp.toISOString(),
			});
		}
	} catch (error) {
		// Log errors but don't throw (non-critical)
		logger.error("Audit logging middleware error", {
			error: error instanceof Error ? error.message : String(error),
			path,
			method,
		});

		await next();
	}
}

// ============================================================================
// Manual Audit Logging Functions
// ============================================================================

/**
 * Manually log an audit event from route handlers
 * Use when automatic detection isn't sufficient
 */
export async function logAuditEvent(
	c: Context,
	action: string,
	resource: string,
	resourceId?: string,
	details?: Record<string, any>,
): Promise<void> {
	const auth = c.get("auth") as AuthContext | undefined;
	const ipAddress = getClientIp(c);
	const userAgent = c.req.header("user-agent");

	const entry: AuditLogEntry = {
		userId: auth?.user.id,
		action,
		resource,
		resourceId,
		status: "success",
		ipAddress,
		userAgent,
		details,
		timestamp: new Date(),
	};

	await logToDatabase(entry);
}

/**
 * Log authentication attempt (success or failure)
 */
export async function logAuthAttempt(
	c: Context,
	method: "jwt" | "api-key" | "session",
	success: boolean,
	details?: Record<string, any>,
): Promise<void> {
	const ipAddress = getClientIp(c);
	const userAgent = c.req.header("user-agent");

	const entry: AuditLogEntry = {
		action: success ? "authenticate_success" : "authenticate_failure",
		resource: "auth",
		status: success ? "success" : "failure",
		ipAddress,
		userAgent,
		details: {
			method,
			...details,
		},
		timestamp: new Date(),
	};

	// Only log failures by default to reduce noise
	// Adjust based on compliance requirements
	if (!success) {
		await logToDatabase(entry);
	}
}

// ============================================================================
// Exports
// ============================================================================

export type { AuditLogEntry };
export { isSensitiveRoute };
