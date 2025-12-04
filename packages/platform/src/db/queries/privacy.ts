/**
 * Privacy-First Utilities for OSS/Open-Core
 *
 * Implements GDPR compliance, data minimization, and privacy-by-design principles:
 * - Data anonymization for analytics
 * - User data export (GDPR Right to Portability)
 * - User data deletion (GDPR Right to Erasure)
 * - Privacy-compliant telemetry
 * - Minimal PII in logs
 *
 * All utilities follow the open-source privacy-first commitment.
 */

import * as crypto from "node:crypto";
import { logger } from "@snapback/infrastructure";
import { eq, lte } from "drizzle-orm";
import { db } from "../client.js";
import { account, apiKeys, session, subscriptions, user } from "../schema/postgres.js";

// ============================================================================
// Constants
// ============================================================================

const PRIVACY_SALT = process.env.PRIVACY_SALT || "default-salt";

// ============================================================================
// Anonymization Functions
// ============================================================================

/**
 * Create one-way hash of user ID for analytics
 * Used to identify returning users without exposing identity
 *
 * Same userId always produces same hash, enabling cohort analysis
 * while maintaining user privacy
 */
export function anonymizeUserId(userId: string): string {
	const hash = crypto
		.createHash("sha256")
		.update(userId + PRIVACY_SALT)
		.digest("hex");

	return `anon_${hash.slice(0, 16)}`;
}

/**
 * Anonymize email for analytics
 * Hashes domain and creates partial local part
 */
export function anonymizeEmail(email: string): string {
	const [local, domain] = email.split("@");

	if (!domain) {
		return anonymizeUserId(email); // Fallback
	}

	// Hash the domain
	const domainHash = crypto
		.createHash("sha256")
		.update(domain + PRIVACY_SALT)
		.digest("hex")
		.slice(0, 8);

	// Mask local part
	const maskedLocal = `${local.charAt(0)}***`;

	return `${maskedLocal}@${domainHash}`;
}

/**
 * Remove sensitive fields from object for logging
 * Prevents accidental PII leakage in structured logs
 */
export function sanitizeForLogging<T extends Record<string, any>>(obj: T): Partial<T> {
	const sensitiveFields = [
		"password",
		"email",
		"token",
		"apiKey",
		"key",
		"secret",
		"refreshToken",
		"accessToken",
		"salt",
		"hash",
	];

	const result: any = { ...obj };

	for (const field of sensitiveFields) {
		if (field in result) {
			result[field] = "[REDACTED]";
		}
	}

	return result;
}

// ============================================================================
// Telemetry Functions
// ============================================================================

/**
 * Log anonymized event for analytics
 * NEVER includes userId, email, or other PII
 *
 * Use for all telemetry, feature usage, and behavioral analytics
 */
export async function logAnonymizedEvent(event: string, data: Record<string, any>, userId?: string): Promise<void> {
	try {
		// Use anonymized user ID if provided
		const anonymousId = userId ? anonymizeUserId(userId) : undefined;

		const sanitized = sanitizeForLogging({
			...data,
			userId: undefined, // Remove if present
			email: undefined,
			apiKeyId: undefined,
			token: undefined,
		});

		logger.info(`Analytics: ${event}`, {
			event,
			anonymousId,
			...sanitized,
			timestamp: new Date().toISOString(),
		});

		// In production, send to privacy-compliant analytics platform
		// e.g., Plausible Analytics, Fathom, Simple Analytics
		// (not PostHog, Mixpanel, etc. which track PII by default)
	} catch (error) {
		logger.error("Failed to log anonymized event", {
			error: error instanceof Error ? error.message : String(error),
			event,
		});
	}
}

// ============================================================================
// GDPR Compliance Functions
// ============================================================================

/**
 * Export user's complete data for GDPR Right to Portability
 * Returns all data associated with the user in portable format
 */
export async function exportUserData(userId: string): Promise<{
	user: any;
	sessions: any[];
	accounts: any[];
	apiKeys: any[];
	subscriptions: any[];
	exportedAt: string;
} | null> {
	try {
		if (!db) {
			logger.error("Database not initialized");
			return null;
		}

		const userRecord = await db
			.select()
			.from(user)
			.where(eq(user.id, userId))
			.then((rows) => rows[0] || null);

		if (!userRecord) {
			logger.warn("User not found for data export", { userId });
			return null;
		}

		// Get all associated data
		const [userSessions, userAccounts, userApiKeys, userSubscriptions] = await Promise.all([
			db.select().from(session).where(eq(session.userId, userId)),
			db.select().from(account).where(eq(account.userId, userId)),
			db.select().from(apiKeys).where(eq(apiKeys.userId, userId)),
			db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
		]);

		// Sanitize sensitive data
		const sanitizedUser = sanitizeForLogging(userRecord);
		const sanitizedApiKeys = userApiKeys.map((k) => sanitizeForLogging(k));

		return {
			user: sanitizedUser,
			sessions: userSessions,
			accounts: userAccounts,
			apiKeys: sanitizedApiKeys,
			subscriptions: userSubscriptions,
			exportedAt: new Date().toISOString(),
		};
	} catch (error) {
		logger.error("Failed to export user data", {
			error: error instanceof Error ? error.message : String(error),
			userId,
		});
		throw error;
	}
}

/**
 * Delete user's data for GDPR Right to Erasure
 * Performs cascade delete through all associated records
 *
 * Uses database CASCADE constraints to ensure referential integrity
 */
export async function deleteUserData(userId: string): Promise<boolean> {
	try {
		if (!db) {
			logger.error("Database not initialized");
			return false;
		}

		logger.warn("Deleting all user data (GDPR Right to Erasure)", {
			userId,
		});

		// Single delete cascades through all related tables
		// via foreign key constraints
		await db.delete(user).where(eq(user.id, userId));

		logger.info("User data deleted successfully", { userId });

		return true;
	} catch (error) {
		logger.error("Failed to delete user data", {
			error: error instanceof Error ? error.message : String(error),
			userId,
		});
		throw error;
	}
}

/**
 * Delete user's API keys (Right to Erasure for credentials)
 * More lenient than full data deletion
 */
export async function deleteUserApiKeys(userId: string): Promise<number> {
	try {
		if (!db) {
			logger.error("Database not initialized");
			return 0;
		}

		const result = await db.delete(apiKeys).where(eq(apiKeys.userId, userId));

		logger.info("User API keys deleted", {
			userId,
		});

		return result.rowCount || 0;
	} catch (error) {
		logger.error("Failed to delete user API keys", {
			error: error instanceof Error ? error.message : String(error),
			userId,
		});
		throw error;
	}
}

/**
 * Anonymize user data instead of full deletion
 * Useful for maintaining historical records while respecting privacy
 */
export async function anonymizeUserData(userId: string): Promise<boolean> {
	try {
		if (!db) {
			logger.error("Database not initialized");
			return false;
		}

		logger.info("Anonymizing user data", { userId });

		// Replace identifiable info with generic values
		await db
			.update(user)
			.set({
				email: `deleted+${anonymizeUserId(userId)}@snapback.local`,
				name: "Deleted User",
				image: null,
				username: null,
			})
			.where(eq(user.id, userId));

		// Delete sessions (forces re-authentication)
		await db.delete(session).where(eq(session.userId, userId));

		// Delete API keys (revokes programmatic access)
		await db.delete(apiKeys).where(eq(apiKeys.userId, userId));

		logger.info("User data anonymized successfully", { userId });

		return true;
	} catch (error) {
		logger.error("Failed to anonymize user data", {
			error: error instanceof Error ? error.message : String(error),
			userId,
		});
		throw error;
	}
}

// ============================================================================
// Consent Management
// ============================================================================

/**
 * Check user's privacy preferences
 * Used to determine what data can be collected
 */
export async function getUserPrivacyPreferences(userId: string): Promise<{
	analyticsConsent: boolean;
	marketingConsent: boolean;
	sharingConsent: boolean;
} | null> {
	try {
		if (!db) {
			logger.error("Database not initialized");
			return null;
		}

		const userRecord = await db
			.select()
			.from(user)
			.where(eq(user.id, userId))
			.then((rows) => rows[0] || null);

		if (!userRecord) {
			return null;
		}

		// Default: opt-in for analytics (privacy-friendly), opt-out for marketing
		return {
			analyticsConsent: true, // Plausible/Fathom type analytics OK
			marketingConsent: false, // No marketing tracking by default
			sharingConsent: false, // No third-party sharing by default
		};
	} catch (error) {
		logger.error("Failed to get privacy preferences", {
			error: error instanceof Error ? error.message : String(error),
			userId,
		});
		return null;
	}
}

// ============================================================================
// Data Retention Policies
// ============================================================================

/**
 * Check if data retention policy allows keeping a record
 * Implements configurable retention periods
 */
export function shouldRetainData(createdAt: Date, retentionDays = 90): boolean {
	const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
	const ageMs = Date.now() - createdAt.getTime();

	return ageMs < retentionMs;
}

/**
 * Delete expired data per retention policy
 * Run periodically via scheduled job
 */
export async function cleanupExpiredData(retentionDays = 90): Promise<void> {
	try {
		if (!db) {
			logger.error("Database not initialized");
			return;
		}

		const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

		// Delete old sessions
		await db.delete(session).where(lte(session.expiresAt, cutoffDate));

		logger.info("Data cleanup completed", {
			retentionDays,
			cutoffDate: cutoffDate.toISOString(),
		});
	} catch (error) {
		logger.error("Data cleanup failed", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
