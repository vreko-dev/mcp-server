/**
 * Step-up re-authentication route
 * POST /security/reauth
 * Verifies passkey, TOTP, or password and marks session as step-up valid
 */

import crypto from "node:crypto";
import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import { Hono } from "hono";
import { setStepUpValid } from "../../middleware/stepup";
import type { BetterAuthSession, BetterAuthUser } from "../../types/context";

const app = new Hono();

// In-memory challenge store (in production, use Redis or database)
const challengeStore = new Map<
	string,
	{ challenge: string; createdAt: number }
>();

// Clean up old challenges every 5 minutes
setInterval(
	() => {
		const now = Date.now();
		for (const [userId, data] of challengeStore.entries()) {
			if (now - data.createdAt > 5 * 60 * 1000) {
				// 5 minutes
				challengeStore.delete(userId);
			}
		}
	},
	5 * 60 * 1000,
);

/**
 * POST /security/passkey/challenge
 * Generate WebAuthn challenge for step-up authentication
 */
app.post("/passkey/challenge", async (c) => {
	try {
		const user = c.get("user") as BetterAuthUser;

		if (!user) {
			return c.json(
				{
					error: "Authentication required",
					code: "AUTH_REQUIRED",
				},
				401,
			);
		}

		// Generate cryptographically secure random challenge
		const challenge = crypto.randomBytes(32).toString("base64url");

		// Store challenge for verification
		challengeStore.set(user.id, {
			challenge,
			createdAt: Date.now(),
		});

		logger.debug("WebAuthn challenge generated", { userId: user.id });

		return c.json({
			challenge,
			rpId: process.env.BETTER_AUTH_RP_ID || "snapback.dev",
			timeout: 60000, // 60 seconds
		});
	} catch (error) {
		logger.error("Error generating passkey challenge", { error });
		return c.json(
			{
				error: "Internal server error",
				code: "INTERNAL_ERROR",
			},
			500,
		);
	}
});

/**
 * POST /security/reauth
 * Body: { method: "passkey" | "totp" | "password", credential: string, challenge?: string }
 */
app.post("/reauth", async (c) => {
	try {
		// Get user from session
		const session = c.get("session") as BetterAuthSession;
		const user = c.get("user") as BetterAuthUser;

		if (!user || !session) {
			return c.json(
				{
					error: "Authentication required",
					code: "AUTH_REQUIRED",
				},
				401,
			);
		}

		const userId = user.id;
		const body = await c.req.json();
		const {
			method,
			credential,
			passkeyResponse,
			challenge: providedChallenge,
		} = body;

		let verified = false;
		let totpFallbackUsed = false;

		switch (method) {
			case "passkey": {
				// Verify passkey challenge response using Better Auth
				try {
					// Retrieve stored challenge
					const storedChallenge = challengeStore.get(userId);

					if (!storedChallenge) {
						logger.error("No challenge found for user", { userId });
						return c.json(
							{
								error: "Challenge not found or expired",
								code: "CHALLENGE_EXPIRED",
							},
							400,
						);
					}

					// Verify challenge matches
					if (storedChallenge.challenge !== providedChallenge) {
						logger.error("Challenge mismatch", { userId });
						return c.json(
							{
								error: "Invalid challenge",
								code: "INVALID_CHALLENGE",
							},
							400,
						);
					}

					// Check challenge age (max 5 minutes)
					if (Date.now() - storedChallenge.createdAt > 5 * 60 * 1000) {
						challengeStore.delete(userId);
						return c.json(
							{
								error: "Challenge expired",
								code: "CHALLENGE_EXPIRED",
							},
							400,
						);
					}

					// Use Better Auth's passkey verification
					// Note: Better Auth passkey plugin uses the standard WebAuthn verification
					const verifyResult = await auth.api.verifyPasskeyAuthentication({
						body: {
							...passkeyResponse,
							challenge: storedChallenge.challenge,
						},
					});

					// Fix: Check the correct property for success
					// The verifyPasskeyAuthentication returns a session object when successful
					verified = verifyResult.session !== undefined;

					// Clear challenge after use (prevent replay)
					challengeStore.delete(userId);
				} catch (error) {
					logger.error("Passkey verification failed", { error, userId });
					verified = false;
				}
				break;
			}

			case "totp": {
				// Verify TOTP code using Better Auth
				try {
					// Fix: Use the correct method name verifyTwoFactorOTP instead of verifyTwoFactor
					// Fix: Use the correct parameters for verifyTwoFactorOTP
					const verifyResult = await auth.api.verifyTwoFactorOTP({
						body: {
							code: credential,
							// Remove userId as it's not a valid parameter
						},
					});

					// Fix: Check the correct property for success
					// The verifyTwoFactorOTP returns a token and user object when successful
					verified =
						verifyResult.token !== undefined && verifyResult.user !== undefined;

					// Check if user has passkey - if not, allow TOTP once
					const userPasskeys = await auth.api.listPasskeys({
						query: { userId },
					});

					if (!userPasskeys || userPasskeys.length === 0) {
						totpFallbackUsed = true;
						logger.info("TOTP fallback used - user has no passkeys", {
							userId,
						});
					}
				} catch (error) {
					logger.error("TOTP verification failed", { error, userId });
					verified = false;
				}
				break;
			}

			case "password": {
				// Verify password using Better Auth
				// This should only be used as last resort
				try {
					// Fix: Use the correct method for password verification
					const verifyResult = await auth.api.signInEmail({
						body: {
							email: (c.get("user") as BetterAuthUser).email,
							password: credential,
						},
					});

					// Fix: Check the correct property for success
					verified = verifyResult.user !== undefined;
				} catch (error) {
					logger.error("Password verification failed", { error, userId });
					verified = false;
				}
				break;
			}

			default:
				return c.json(
					{
						error: "Invalid authentication method",
						code: "INVALID_METHOD",
					},
					400,
				);
		}

		if (!verified) {
			return c.json(
				{
					error: "Authentication failed",
					code: "AUTH_FAILED",
				},
				401,
			);
		}

		// Mark step-up as valid
		setStepUpValid(userId, method, totpFallbackUsed);

		logger.info("Step-up authentication successful", {
			userId,
			method,
			totpFallbackUsed,
		});

		return c.json({
			success: true,
			message: "Authentication successful",
			validFor: Number(process.env.AUTH_STEPUP_WINDOW_SEC) || 300,
			passkeyEnrollmentRequired: totpFallbackUsed,
		});
	} catch (error) {
		logger.error("Error in reauth endpoint", { error });
		return c.json(
			{
				error: "Internal server error",
				code: "INTERNAL_ERROR",
			},
			500,
		);
	}
});

/**
 * GET /security/stepup/status
 * Check current step-up status
 */
app.get("/stepup/status", async (c) => {
	const user = c.get("user") as BetterAuthUser;

	if (!user) {
		return c.json(
			{
				error: "Authentication required",
				code: "AUTH_REQUIRED",
			},
			401,
		);
	}

	const { hasValidStepUp, getStepUpRemainingTime } = await import(
		"../../middleware/stepup.js"
	);

	const stepUp = hasValidStepUp(user.id);
	const remaining = getStepUpRemainingTime(user.id);

	return c.json({
		valid: !!stepUp,
		remaining,
		method: stepUp?.method,
		expiresAt: stepUp ? new Date(stepUp.validUntil).toISOString() : null,
	});
});

export default app;
