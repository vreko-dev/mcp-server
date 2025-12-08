/**
 * Account Lockout Policy Implementation
 *
 * Prevents brute force attacks by locking accounts after N failed attempts
 *
 * OWASP: A07:2021 - Identification and Authentication Failures
 * PCI DSS: Requirement 8.1.6
 * NIST: SP 800-63B Section 5.2.2
 *
 * Architecture:
 * - Primary storage: Redis (distributed, fast)
 * - Fallback storage: PostgreSQL (when Redis unavailable)
 * - Lockout duration: 15 minutes
 * - Max attempts: 5
 * - Email normalization: lowercase + trim
 */

import { logger } from "@snapback/infrastructure";
import { trackEvent } from "./audit";

/**
 * Lockout policy configuration
 */
export const LOCKOUT_POLICY = {
	MAX_ATTEMPTS: 5,
	LOCKOUT_DURATION_SECONDS: 15 * 60, // 15 minutes
	REDIS_KEY_PREFIX: "auth:lockout:",
} as const;

/**
 * Lockout check result
 */
export interface LockoutStatus {
	locked: boolean;
	remainingTime?: number; // seconds until unlock
	attemptCount?: number;
}

/**
 * Normalize email for lockout tracking
 * - Convert to lowercase
 * - Trim whitespace
 *
 * Note: We do NOT normalize dots/plus-tags to prevent bypass attacks
 * where attacker uses variations to avoid lockout
 */
function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * Get Redis client from auth module
 * Returns null if Redis is not available
 */
async function getRedisClient(): Promise<any | null> {
	try {
		// Import Redis client from auth module
		const { redisClient, redisAvailable } = await import("../auth.js");

		if (redisAvailable && redisClient) {
			return redisClient;
		}

		return null;
	} catch (error) {
		logger.warn("Could not access Redis client for lockout", { error });
		return null;
	}
}

/**
 * Check if account is currently locked
 *
 * @param email User email address
 * @returns Lockout status with remaining time if locked
 */
export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
	const normalizedEmail = normalizeEmail(email);
	const redis = await getRedisClient();

	try {
		if (redis) {
			// Try Redis first (primary storage)
			const key = `${LOCKOUT_POLICY.REDIS_KEY_PREFIX}${normalizedEmail}`;
			const attempts = await redis.get(key);

			if (!attempts) {
				return { locked: false };
			}

			const attemptCount = Number.parseInt(attempts, 10);

			if (attemptCount >= LOCKOUT_POLICY.MAX_ATTEMPTS) {
				// Account is locked - get remaining TTL
				const ttl = await redis.ttl(key);

				return {
					locked: true,
					remainingTime: Math.max(0, ttl),
					attemptCount,
				};
			}

			return {
				locked: false,
				attemptCount,
			};
		}
		// Fallback to database (less common, but required for resilience)
		return await checkLockoutDatabase(normalizedEmail);
	} catch (error) {
		logger.error("Failed to check account lockout", {
			email: normalizedEmail,
			error: error instanceof Error ? error.message : String(error),
		});

		// Fail open - don't block legitimate users due to infrastructure issues
		return { locked: false };
	}
}

/**
 * Increment failed login attempts
 * Locks account if threshold is exceeded
 *
 * @param email User email address
 */
export async function incrementFailedAttempts(email: string): Promise<void> {
	const normalizedEmail = normalizeEmail(email);
	const redis = await getRedisClient();

	try {
		if (redis) {
			const key = `${LOCKOUT_POLICY.REDIS_KEY_PREFIX}${normalizedEmail}`;

			// Increment counter
			const attempts = await redis.incr(key);

			// Set expiration if this is the first attempt
			if (attempts === 1) {
				await redis.expire(key, LOCKOUT_POLICY.LOCKOUT_DURATION_SECONDS);
			}

			// Log lockout event when threshold is reached
			if (attempts === LOCKOUT_POLICY.MAX_ATTEMPTS) {
				logger.warn("Account locked due to failed login attempts", {
					email: normalizedEmail,
					attempts,
				});

				// Track event (use generic type if account.locked is not defined)
				await trackEvent("auth.lockout" as any, {
					email: normalizedEmail,
					reason: "brute_force_prevention",
					attempts,
					lockoutDuration: LOCKOUT_POLICY.LOCKOUT_DURATION_SECONDS,
				});
			}
		} else {
			// Fallback to database
			await incrementAttemptsDatabase(normalizedEmail);
		}
	} catch (error) {
		logger.error("Failed to increment lockout counter", {
			email: normalizedEmail,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Reset failed login attempts counter
 * Called on successful login
 *
 * @param email User email address
 */
export async function resetFailedAttempts(email: string): Promise<void> {
	const normalizedEmail = normalizeEmail(email);
	const redis = await getRedisClient();

	try {
		if (redis) {
			const key = `${LOCKOUT_POLICY.REDIS_KEY_PREFIX}${normalizedEmail}`;
			await redis.del(key);

			logger.debug("Reset lockout counter on successful login", {
				email: normalizedEmail,
			});
		} else {
			// Fallback to database
			await resetAttemptsDatabase(normalizedEmail);
		}
	} catch (error) {
		logger.error("Failed to reset lockout counter", {
			email: normalizedEmail,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Clear lockout state for an email (testing utility)
 *
 * @param email User email address
 */
export async function clearLockoutState(email: string): Promise<void> {
	await resetFailedAttempts(email);
}

// =============================================================================
// Database Fallback Functions (when Redis unavailable)
// =============================================================================

/**
 * Check lockout status using database
 * Less performant but provides resilience
 */
async function checkLockoutDatabase(email: string): Promise<LockoutStatus> {
	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			logger.warn("Database not available for lockout check");
			return { locked: false };
		}

		// Query lockout attempts from a dedicated table
		// Schema: CREATE TABLE auth_lockout (email TEXT PRIMARY KEY, attempts INT, locked_until TIMESTAMP)
		const result = await db.execute(sql`
			SELECT attempts, locked_until
			FROM auth_lockout
			WHERE email = ${email}
			AND locked_until > NOW()
		`);

		if (result.rows.length === 0) {
			return { locked: false };
		}

		const row = result.rows[0] as { attempts: number; locked_until: Date };
		const remainingTime = Math.max(0, Math.floor((new Date(row.locked_until).getTime() - Date.now()) / 1000));

		return {
			locked: row.attempts >= LOCKOUT_POLICY.MAX_ATTEMPTS,
			remainingTime,
			attemptCount: row.attempts,
		};
	} catch (error) {
		logger.error("Database lockout check failed", { email, error });
		return { locked: false }; // Fail open
	}
}

/**
 * Increment attempts using database
 */
async function incrementAttemptsDatabase(email: string): Promise<void> {
	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			logger.warn("Database not available for lockout increment");
			return;
		}

		const lockedUntil = new Date(Date.now() + LOCKOUT_POLICY.LOCKOUT_DURATION_SECONDS * 1000);

		await db.execute(sql`
			INSERT INTO auth_lockout (email, attempts, locked_until)
			VALUES (${email}, 1, ${lockedUntil})
			ON CONFLICT (email) DO UPDATE SET
				attempts = auth_lockout.attempts + 1,
				locked_until = ${lockedUntil}
		`);
	} catch (error) {
		logger.error("Database lockout increment failed", { email, error });
	}
}

/**
 * Reset attempts using database
 */
async function resetAttemptsDatabase(email: string): Promise<void> {
	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			logger.warn("Database not available for lockout reset");
			return;
		}

		await db.execute(sql`
			DELETE FROM auth_lockout WHERE email = ${email}
		`);
	} catch (error) {
		logger.error("Database lockout reset failed", { email, error });
	}
}
