/**
 * Passkey enforcement policy middleware
 * Ensures users have passkeys enrolled before sensitive actions
 * Uses better-auth's passkey plugin for verification
 * Replaces 17 lines of custom userHasPasskey() function
 */

import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";

// Feature flag to enable/disable passkey enforcement
const PASSKEY_ENFORCE_ALL =
	process.env.FEATURE_PASSKEY_ENFORCE_ALL === "true" || true;

/**
 * Middleware to enforce passkey enrollment for sensitive operations
 * Use this on ultra-sensitive routes:
 * - Billing portal access
 * - API key reveal/creation
 * - Organization role changes
 * - Organization deletion
 * - User deletion
 */
export async function requirePasskey(c: Context, next: Next) {
	if (!PASSKEY_ENFORCE_ALL) {
		// Feature flag disabled - skip enforcement
		await next();
		return;
	}

	// Get user from context (set by auth middleware)
	const userId = c.get("userId");

	if (!userId) {
		return c.json(
			{
				error: "Authentication required",
				code: "AUTH_REQUIRED",
			},
			401,
		);
	}

	// Use better-auth's listPasskeys to check enrollment
	// Replaces 17-line custom userHasPasskey() function
	try {
		const passkeys = await auth.api.listPasskeys({
			query: { userId },
		});

		if (!passkeys || passkeys.length === 0) {
			// No passkeys enrolled
			const passkeyEnrollmentRequired = c.get("passkeyEnrollmentRequired");

			if (passkeyEnrollmentRequired) {
				// TOTP fallback was used once - now require passkey enrollment
				logger.info("Passkey enrollment required after TOTP fallback", {
					userId,
					path: c.req.path,
				});

				return c.json(
					{
						error: "Passkey enrollment required",
						code: "PASSKEY_ENROLLMENT_REQUIRED",
						message:
							"You've used TOTP once. Please enroll a passkey for enhanced security.",
						enrollPasskey: true,
						enrollmentUrl: "/settings/security/passkey/enroll",
					},
					409, // Conflict - action blocked pending enrollment
				);
			}

			// First time - allow with warning, but they'll need step-up
			logger.info("User has no passkey - will require step-up with TOTP", {
				userId,
				path: c.req.path,
			});
		}

		// User has passkeys or is in grace period - allow request
		await next();
	} catch (error) {
		logger.error("Error checking user passkeys", { error, userId });
		return c.json(
			{
				error: "Internal server error",
				code: "INTERNAL_ERROR",
			},
			500,
		);
	}
}

/**
 * Get user's passkey enrollment status
 * Uses better-auth's listPasskeys API
 */
export async function getPasskeyStatus(userId: string) {
	try {
		const passkeys = await auth.api.listPasskeys({
			query: { userId },
		});

		if (passkeys && passkeys.length > 0) {
			return {
				enrolled: true,
				count: passkeys.length,
				passkeys: passkeys.map((pk: any) => ({
					id: pk.id,
					name: pk.name,
					createdAt: pk.createdAt,
					lastUsed: pk.lastUsed,
				})),
			};
		}

		return {
			enrolled: false,
			count: 0,
			passkeys: [],
		};
	} catch (error) {
		logger.error("Error fetching passkey status", { error, userId });
		return {
			enrolled: false,
			count: 0,
			passkeys: [],
		};
	}
}

/**
 * Middleware for routes that benefit from passkeys but don't require them
 * Adds suggestion headers when passkey enrollment is recommended
 */
export async function suggestPasskey(c: Context, next: Next) {
	const userId = c.get("userId");

	if (userId) {
		try {
			const passkeys = await auth.api.listPasskeys({
				query: { userId },
			});

			if (!passkeys || passkeys.length === 0) {
				// Add suggestion headers
				c.header("X-Passkey-Suggestion", "enroll");
				c.header(
					"X-Passkey-Enrollment-Url",
					"/settings/security/passkey/enroll",
				);
			}
		} catch (error) {
			logger.debug("Error checking passkey suggestion", { error, userId });
		}
	}

	await next();
}
