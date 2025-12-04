/**
 * Step-up authentication middleware for sensitive operations
 * Requires passkey or TOTP verification within the last 300 seconds (5 minutes)
 */

import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";
import type { BetterAuthSession, BetterAuthUser } from "../types/context";

// Step-up window: 300 seconds (5 minutes)
const STEPUP_WINDOW_SEC = Number(process.env.AUTH_STEPUP_WINDOW_SEC) || 300;

interface StepUpSession {
	userId: string;
	validUntil: number;
	method: "passkey" | "totp" | "password";
	totpFallbackUsed?: boolean;
}

// In-memory store for step-up sessions (in production, use Redis)
const stepUpSessions = new Map<string, StepUpSession>();

/**
 * Check if user has valid step-up authentication
 */
export function hasValidStepUp(userId: string): StepUpSession | null {
	const session = stepUpSessions.get(userId);
	if (!session) {
		return null;
	}

	const now = Date.now();
	if (session.validUntil < now) {
		// Expired - clean up
		stepUpSessions.delete(userId);
		return null;
	}

	return session;
}

/**
 * Mark user as having completed step-up authentication
 */
export function setStepUpValid(
	userId: string,
	method: "passkey" | "totp" | "password",
	totpFallbackUsed = false,
): void {
	const validUntil = Date.now() + STEPUP_WINDOW_SEC * 1000;
	stepUpSessions.set(userId, {
		userId,
		validUntil,
		method,
		totpFallbackUsed,
	});

	logger.info("Step-up authentication marked valid", {
		userId,
		method,
		validUntil: new Date(validUntil).toISOString(),
		totpFallbackUsed,
	});
}

/**
 * Clear step-up session
 */
export function clearStepUp(userId: string): void {
	stepUpSessions.delete(userId);
}

/**
 * Middleware to require step-up authentication
 * Use this on sensitive routes like:
 * - /billing/*
 * - /settings/api-keys/*
 * - /org/*/ ("danger"); /*
 * - /settings/security/*
 */
export async function requireStepUp(c: Context, next: Next) {
	// Get user from session (Better Auth populates c.get('user'))
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

	// Check if step-up is valid
	const stepUp = hasValidStepUp(userId);

	if (!stepUp) {
		logger.info("Step-up authentication required", {
			userId,
			path: c.req.path,
			method: c.req.method,
		});

		return c.json(
			{
				error: "Step-up authentication required",
				code: "STEPUP_REQUIRED",
				message: "Confirm with your passkey to continue",
				reauthUrl: "/security/reauth",
			},
			401,
		);
	}

	// Check if TOTP fallback was used - if so, user must enroll passkey next time
	if (stepUp.totpFallbackUsed && stepUp.method === "totp") {
		// Flag that passkey enrollment is required
		c.set("passkeyEnrollmentRequired", true);
		logger.info("TOTP fallback used - passkey enrollment required next time", {
			userId,
		});
	}

	// Step-up is valid, continue
	await next();
}

/**
 * Get remaining step-up time in seconds
 */
export function getStepUpRemainingTime(userId: string): number {
	const stepUp = hasValidStepUp(userId);
	if (!stepUp) {
		return 0;
	}

	const remaining = Math.max(
		0,
		Math.floor((stepUp.validUntil - Date.now()) / 1000),
	);
	return remaining;
}

/**
 * Cleanup expired step-up sessions (run periodically)
 */
export function cleanupExpiredStepUps(): void {
	const now = Date.now();
	let cleaned = 0;

	for (const [userId, session] of stepUpSessions.entries()) {
		if (session.validUntil < now) {
			stepUpSessions.delete(userId);
			cleaned++;
		}
	}

	if (cleaned > 0) {
		logger.debug("Cleaned up expired step-up sessions", { count: cleaned });
	}
}

// Run cleanup every minute
setInterval(cleanupExpiredStepUps, 60 * 1000);
