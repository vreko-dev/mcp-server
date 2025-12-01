/**
 * Centralized Audit Logging Module
 * Single implementation used by all services (API, MCP, CLI, etc.)
 * Replaces 371 lines of custom audit logic spread across apps
 *
 * Handles:
 * - PostHog event emission (non-blocking)
 * - Database audit log persistence (non-blocking)
 * - Structured logging (always succeeds)
 */

import { logger } from "@snapback/infrastructure";

// PostHog configuration
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || "";
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.posthog.com";
const POSTHOG_ENABLED = !!POSTHOG_API_KEY;

/**
 * Comprehensive audit event types supported across the system
 */
export type AuditEventType =
	// Auth events
	| "auth.signup"
	| "auth.signin"
	| "auth.signout"
	| "auth.signin_failed"
	| "auth.password_reset"
	| "auth.email_verified"
	// MFA events
	| "mfa.totp_enabled"
	| "mfa.totp_disabled"
	| "mfa.totp_verified"
	| "mfa.totp_failed"
	| "mfa.backup_code_used"
	// Passkey events
	| "passkey.enrolled"
	| "passkey.removed"
	| "passkey.verified"
	| "passkey.failed"
	// Session events
	| "session.created"
	| "session.refreshed"
	| "session.expired"
	| "session.revoked"
	// Organization events
	| "org.member_added"
	| "org.member_removed"
	| "org.role_changed"
	// API key events
	| "apikey.created"
	| "apikey.revoked"
	| "apikey.used"
	// Step-up events
	| "stepup.required"
	| "stepup.success"
	| "stepup.failed";

/**
 * Audit event metadata
 */
export interface AuditEventMetadata {
	userId?: string;
	orgId?: string;
	ip?: string;
	userAgent?: string;
	method?: string;
	path?: string;
	statusCode?: number;
	errorMessage?: string;
	// Custom fields
	[key: string]: unknown;
}

/**
 * Emit event to PostHog (non-blocking)
 */
async function emitPostHogEvent(
	eventType: AuditEventType,
	metadata: AuditEventMetadata,
): Promise<void> {
	if (!POSTHOG_ENABLED) {
		return;
	}

	try {
		const event = {
			api_key: POSTHOG_API_KEY,
			event: eventType,
			distinct_id: metadata.userId || metadata.ip || "anonymous",
			properties: {
				...metadata,
				$ip: metadata.ip,
				$set: {
					email: metadata.userId ? `user_${metadata.userId}` : undefined,
				},
			},
			timestamp: new Date().toISOString(),
		};

		const response = await fetch(`${POSTHOG_HOST}/capture/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(event),
		});

		if (!response.ok) {
			logger.error("Failed to emit PostHog event", {
				eventType,
				status: response.status,
				statusText: response.statusText,
			});
		}
	} catch (error) {
		logger.error("Error emitting PostHog event", {
			error,
			eventType,
		});
	}
}

/**
 * Write audit log to database (non-blocking)
 * Stores audit events in telemetry_events table with event_category='audit'
 * Uses @snapback/platform DB connection via lazy import to avoid circular deps
 */
async function writeAuditLog(
	eventType: AuditEventType,
	metadata: AuditEventMetadata,
): Promise<void> {
	try {
		// Lazy import to avoid circular dependencies
		const { db, snapbackSchema } = await import("@snapback/platform");

		if (!db) {
			logger.warn("Database not available for audit logging", { eventType });
			return;
		}

		const { telemetryEvents } = snapbackSchema;

		// Write to telemetry_events table with event_category='audit'
		await db.insert(telemetryEvents).values({
			eventType,
			eventCategory: "audit",
			userId: metadata.userId,
			properties: {
				ip: metadata.ip,
				userAgent: metadata.userAgent,
				method: metadata.method,
				path: metadata.path,
				statusCode: metadata.statusCode,
				errorMessage: metadata.errorMessage,
				...metadata, // Include any custom fields
			},
		});

		logger.debug("Audit log written", {
			eventType,
			userId: metadata.userId,
			orgId: metadata.orgId,
		});
	} catch (error) {
		logger.error("Failed to write audit log", {
			error,
			eventType,
			metadata,
		});
		// Don't throw - audit logging should not break main flow
	}
}

/**
 * Track authentication event
 * Emits to PostHog and writes to audit log (both non-blocking)
 */
export async function trackEvent(
	eventType: AuditEventType,
	metadata: AuditEventMetadata,
): Promise<void> {
	// Log locally (always succeeds)
	logger.info("Audit event", {
		eventType,
		userId: metadata.userId,
		orgId: metadata.orgId,
		path: metadata.path,
	});

	// Emit to PostHog (non-blocking)
	emitPostHogEvent(eventType, metadata).catch((error) => {
		logger.error("PostHog emit failed", { error, eventType });
	});

	// Write to audit log (non-blocking)
	writeAuditLog(eventType, metadata).catch((error) => {
		logger.error("Audit log write failed", { error, eventType });
	});
}

/**
 * Track failed authentication attempt
 */
export async function trackFailedAuth(
	type: "signin" | "totp" | "passkey",
	metadata: AuditEventMetadata,
): Promise<void> {
	const eventMap = {
		signin: "auth.signin_failed" as AuditEventType,
		totp: "mfa.totp_failed" as AuditEventType,
		passkey: "passkey.failed" as AuditEventType,
	};

	await trackEvent(eventMap[type], metadata);

	// Could trigger additional actions:
	// - Check for abuse patterns
	// - Rate limit if needed
	// - Alert security team if excessive
}

/**
 * Helper type for better-auth database hooks
 */
export interface DatabaseHookContext {
	eventType: AuditEventType;
	metadata: AuditEventMetadata;
}

/**
 * Adapter for better-auth database hooks
 * Provides helper function for use in databaseHooks configuration
 */
export function createDatabaseHookHandler(eventType: AuditEventType) {
	return async (data: any) => {
		await trackEvent(eventType, {
			userId: data.userId || data.user?.id,
			orgId: data.organizationId || data.organization?.id,
			timestamp: new Date().toISOString(),
			...data,
		});
	};
}
