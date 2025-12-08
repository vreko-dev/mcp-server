/**
 * API Key Rotation Reminder Job
 *
 * Automated job that detects stale API keys and sends rotation reminders
 * Promotes credential hygiene and reduces attack surface
 *
 * NIST: SP 800-53 IA-5(1)(d) - Credential Rotation
 * CIS: Critical Security Control 16.10
 *
 * Schedule: Daily at 9 AM UTC
 * Cooldown: 30 days between reminders per key
 */

import { logger } from "@snapback/infrastructure";
import { trackEvent } from "../lib/audit";

/**
 * Configuration
 */
export const ROTATION_POLICY = {
	// Keys older than this trigger reminders
	STALE_THRESHOLD_DAYS: 90,

	// Minimum time between reminders for same key
	REMINDER_COOLDOWN_DAYS: 30,

	// Cron schedule (daily at 9 AM UTC)
	CRON_SCHEDULE: "0 9 * * *",
} as const;

/**
 * Stale API key interface
 */
export interface StaleApiKey {
	id: string;
	keyPrefix: string;
	userId: string;
	userEmail: string;
	createdAt: Date;
	name: string | null;
	expiresAt?: Date | null;
	revokedAt?: Date | null;
	status?: string;
}

/**
 * Find all API keys that meet stale criteria
 * - Created > X days ago
 * - No expiration date (auto-expiring keys excluded)
 * - Not revoked
 *
 * @param options.olderThanDays Age threshold in days (default: 90)
 */
export async function findStaleApiKeys(options: { olderThanDays?: number } = {}): Promise<StaleApiKey[]> {
	const thresholdDays = options.olderThanDays || ROTATION_POLICY.STALE_THRESHOLD_DAYS;
	const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			logger.warn("Database not available for stale key detection");
			return [];
		}

		// Query: Find active keys older than threshold with no expiration
		const result = await db.execute(sql`
			SELECT
				k.id,
				k.key_prefix,
				k.user_id,
				u.email as user_email,
				k.created_at,
				k.name,
				k.expires_at,
				k.revoked_at
			FROM api_key k
			JOIN user u ON k.user_id = u.id
			WHERE k.created_at < ${cutoffDate.toISOString()}
			AND k.expires_at IS NULL
			AND k.revoked_at IS NULL
			ORDER BY k.created_at ASC
		`);

		const staleKeys = (result.rows || []).map((row: any) => ({
			id: row.id,
			keyPrefix: row.key_prefix,
			userId: row.user_id,
			userEmail: row.user_email,
			createdAt: new Date(row.created_at),
			name: row.name,
			expiresAt: row.expires_at ? new Date(row.expires_at) : null,
			revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
			status: "active",
		}));

		logger.info("Found stale API keys", {
			count: staleKeys.length,
			thresholdDays,
		});

		return staleKeys;
	} catch (error) {
		logger.error("Failed to find stale API keys", {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Check if reminder should be sent (respects cooldown period)
 *
 * @param keyId API key ID
 * @returns true if reminder should be sent
 */
export async function shouldSendReminder(keyId: string): Promise<boolean> {
	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			logger.warn("Database not available for reminder check");
			return true; // Fail open
		}

		// Check last reminder timestamp
		const result = await db.execute(sql`
			SELECT last_reminder_sent_at
			FROM api_key_rotation_reminders
			WHERE key_id = ${keyId}
		`);

		if (!result.rows || result.rows.length === 0) {
			// No previous reminder
			return true;
		}

		const lastSent = new Date((result.rows[0] as { last_reminder_sent_at: string }).last_reminder_sent_at);
		const cooldownMs = ROTATION_POLICY.REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
		const timeSinceLastReminder = Date.now() - lastSent.getTime();

		// Allow reminder if cooldown period has passed
		return timeSinceLastReminder > cooldownMs;
	} catch (error) {
		logger.warn("Failed to check reminder cooldown", {
			keyId,
			error: error instanceof Error ? error.message : String(error),
		});
		return true; // Fail open
	}
}

/**
 * Record that a reminder was sent for tracking cooldown
 *
 * @param keyId API key ID
 * @param timestamp When reminder was sent (default: now)
 */
async function recordReminderSent(keyId: string, timestamp: number = Date.now()): Promise<void> {
	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			return;
		}

		// Upsert reminder timestamp
		await db.execute(sql`
			INSERT INTO api_key_rotation_reminders (key_id, last_reminder_sent_at)
			VALUES (${keyId}, ${new Date(timestamp).toISOString()})
			ON CONFLICT (key_id)
			DO UPDATE SET last_reminder_sent_at = ${new Date(timestamp).toISOString()}
		`);
	} catch (error) {
		logger.warn("Failed to record reminder timestamp", {
			keyId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Send rotation reminder email to key owner
 *
 * @param key Stale API key details
 */
export async function sendRotationReminder(key: StaleApiKey): Promise<void> {
	try {
		const { sendEmail } = await import("@snapback/integrations/email");

		const ageInDays = Math.floor((Date.now() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24));

		const subject = "🔑 API Key Rotation Reminder - SnapBack";
		const html = `
			<h1>Time to Rotate Your API Key</h1>
			<p>Hi there,</p>
			<p>
				Your API key <strong>${key.keyPrefix}...</strong>
				${key.name ? `(${key.name})` : ""} was created <strong>${ageInDays} days ago</strong>.
			</p>
			<p>
				For security best practices, we recommend rotating API keys every
				${ROTATION_POLICY.STALE_THRESHOLD_DAYS} days.
			</p>
			<h3>How to rotate your key:</h3>
			<ol>
				<li>Generate a new API key in your dashboard</li>
				<li>Update your applications to use the new key</li>
				<li>Revoke the old key once confirmed working</li>
			</ol>
			<p>
				<strong>Key created:</strong> ${key.createdAt.toLocaleDateString()}<br/>
				<strong>Age:</strong> ${ageInDays} days
			</p>
			<p>
				Questions? Reply to this email or contact support.
			</p>
			<p>Best,<br/>The SnapBack Team</p>
		`;

		const text = `
Time to Rotate Your API Key

Hi there,

Your API key ${key.keyPrefix}... ${key.name ? `(${key.name})` : ""} was created ${ageInDays} days ago.

For security best practices, we recommend rotating API keys every ${ROTATION_POLICY.STALE_THRESHOLD_DAYS} days.

How to rotate your key:
1. Generate a new API key in your dashboard
2. Update your applications to use the new key
3. Revoke the old key once confirmed working

Key created: ${key.createdAt.toLocaleDateString()}
Age: ${ageInDays} days

Questions? Reply to this email or contact support.

Best,
The SnapBack Team
		`;

		await sendEmail({
			to: key.userEmail,
			subject,
			text,
			html,
		});

		// Record reminder sent
		await recordReminderSent(key.id);

		// Audit log
		await trackEvent("api.key.rotation.reminder" as any, {
			keyId: key.id,
			userId: key.userId,
			keyPrefix: key.keyPrefix,
			ageInDays,
		});

		logger.info("Sent API key rotation reminder", {
			keyId: key.id,
			userId: key.userId,
			ageInDays,
		});
	} catch (error) {
		logger.error("Failed to send rotation reminder", {
			keyId: key.id,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Process batch of stale keys
 *
 * @param staleKeys Array of stale API keys
 * @returns Processing statistics
 */
export async function processStaleKeys(
	staleKeys: StaleApiKey[],
): Promise<{ processed: number; sent: number; skipped: number }> {
	let processed = 0;
	let sent = 0;
	let skipped = 0;

	for (const key of staleKeys) {
		processed++;

		// Check cooldown
		const shouldSend = await shouldSendReminder(key.id);

		if (shouldSend) {
			await sendRotationReminder(key);
			sent++;
		} else {
			logger.debug("Skipped reminder due to cooldown", {
				keyId: key.id,
			});
			skipped++;
		}
	}

	logger.info("Completed stale key processing", {
		processed,
		sent,
		skipped,
	});

	return { processed, sent, skipped };
}

/**
 * Main job execution function
 * Called by cron scheduler
 */
export async function runRotationReminderJob(): Promise<void> {
	logger.info("Starting API key rotation reminder job");

	try {
		// Find stale keys
		const staleKeys = await findStaleApiKeys();

		if (staleKeys.length === 0) {
			logger.info("No stale API keys found");
			return;
		}

		// Process reminders
		const stats = await processStaleKeys(staleKeys);

		logger.info("API key rotation job completed", stats);
	} catch (error) {
		logger.error("API key rotation job failed", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Schedule the rotation reminder job
 * Returns schedule configuration for cron system
 */
export function scheduleRotationReminders(): {
	cron: string;
	handler: () => Promise<void>;
} {
	return {
		cron: ROTATION_POLICY.CRON_SCHEDULE,
		handler: runRotationReminderJob,
	};
}
