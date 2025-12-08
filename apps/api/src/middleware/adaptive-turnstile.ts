/**
 * Adaptive Turnstile challenge system
 * Progressively challenges users only after suspicious behavior
 * Default: ≥5 failures / 10s per ip+identifier+path
 */

import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";

// Feature flag
const TURNSTILE_ADAPTIVE_ENABLED = process.env.FEATURE_TURNSTILE_ADAPTIVE === "true" || true;

// Turnstile configuration
const TURNSTILE_SECRET_KEY = process.env.CAPTCHA_SECRET_KEY || "";
const TURNSTILE_SITE_KEY = process.env.CAPTCHA_SITE_KEY || "";

// Failure threshold configuration
const FAILURE_THRESHOLD = Number(process.env.TURNSTILE_FAILURE_THRESHOLD) || 5;
const FAILURE_WINDOW_MS = Number(process.env.TURNSTILE_WINDOW_MS) || 10000; // 10 seconds
const BYPASS_COOKIE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory store for failure tracking (in production, use Redis)
interface FailureRecord {
	count: number;
	firstFailure: number;
	challenged: boolean;
}

const failureStore = new Map<string, FailureRecord>();

// Rate limiting for verification attempts (prevent DoS on Cloudflare API)
interface VerificationAttempt {
	count: number;
	resetTime: number;
}
const verificationAttempts = new Map<string, VerificationAttempt>();
const VERIFICATION_RATE_LIMIT = 10; // 10 attempts per minute per IP
const VERIFICATION_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Get challenge key for a request
 * Format: ip:identifier:path
 */
function getChallengeKey(ip: string, identifier: string, path: string): string {
	return `${ip}:${identifier}:${path}`;
}

/**
 * Record a failure
 */
export function recordFailure(ip: string, identifier: string, path: string): boolean {
	if (!TURNSTILE_ADAPTIVE_ENABLED) {
		return false;
	}

	const key = getChallengeKey(ip, identifier, path);
	const now = Date.now();
	const record = failureStore.get(key);

	if (!record || now - record.firstFailure > FAILURE_WINDOW_MS) {
		// New window
		failureStore.set(key, {
			count: 1,
			firstFailure: now,
			challenged: false,
		});
		return false;
	}

	// Increment count
	record.count++;

	// Check if threshold exceeded
	if (record.count >= FAILURE_THRESHOLD && !record.challenged) {
		record.challenged = true;
		logger.info("Turnstile challenge triggered", {
			ip,
			identifier,
			path,
			failureCount: record.count,
		});
		return true; // Challenge required
	}

	return record.challenged;
}

/**
 * Clear failures for a key
 */
export function clearFailures(ip: string, identifier: string, path: string): void {
	const key = getChallengeKey(ip, identifier, path);
	failureStore.delete(key);
}

/**
 * Check if challenge is required
 */
export function isChallengeRequired(ip: string, identifier: string, path: string): boolean {
	if (!TURNSTILE_ADAPTIVE_ENABLED) {
		return false;
	}

	const key = getChallengeKey(ip, identifier, path);
	const record = failureStore.get(key);

	if (!record) {
		return false;
	}

	const now = Date.now();

	// Check if window expired
	if (now - record.firstFailure > FAILURE_WINDOW_MS) {
		failureStore.delete(key);
		return false;
	}

	return record.challenged;
}

/**
 * Verify Turnstile token server-side
 */
async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
	if (!TURNSTILE_SECRET_KEY) {
		logger.error("Turnstile secret key not configured");
		return false;
	}

	// Rate limit verification attempts (10 per minute per IP)
	const now = Date.now();
	const key = `verify:${remoteIp}`;
	const attempt = verificationAttempts.get(key);

	if (attempt && attempt.resetTime > now) {
		if (attempt.count >= VERIFICATION_RATE_LIMIT) {
			logger.warn("Turnstile verification rate limit exceeded", { remoteIp });
			return false;
		}
		attempt.count++;
	} else {
		verificationAttempts.set(key, {
			count: 1,
			resetTime: now + VERIFICATION_WINDOW_MS,
		});
	}

	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				secret: TURNSTILE_SECRET_KEY,
				response: token,
				remoteip: remoteIp,
			}),
		});

		const data = (await response.json()) as {
			success: boolean;
			"error-codes"?: string[];
		};

		if (!data.success) {
			logger.warn("Turnstile verification failed", {
				errorCodes: data["error-codes"],
			});
			return false;
		}

		return true;
	} catch (error) {
		logger.error("Error verifying Turnstile token", { error });
		return false;
	}
}

/**
 * Set bypass cookie after successful challenge
 */
function setBypassCookie(c: Context): void {
	const expiresAt = new Date(Date.now() + BYPASS_COOKIE_TTL_MS);
	c.header(
		"Set-Cookie",
		`sb_challenge=1; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`,
	);
}

/**
 * Check if request has valid bypass cookie
 */
function hasValidBypass(c: Context): boolean {
	const cookies = c.req.header("cookie");
	if (!cookies) {
		return false;
	}

	return cookies.includes("sb_challenge=1");
}

/**
 * Middleware to enforce adaptive Turnstile challenge
 * Use on auth endpoints: /api/auth/sign-in, /api/auth/sign-up, etc.
 */
export async function adaptiveTurnstile(c: Context, next: Next) {
	if (!TURNSTILE_ADAPTIVE_ENABLED || !TURNSTILE_SITE_KEY) {
		await next();
		return;
	}

	// Check for bypass cookie
	if (hasValidBypass(c)) {
		await next();
		return;
	}

	// Get request info
	const ip =
		c.req.header("cf-connecting-ip") ||
		c.req.header("x-forwarded-for")?.split(",")[0] ||
		c.req.header("x-real-ip") ||
		"unknown";

	const body = await c.req.json().catch(() => ({}));
	const identifier = body.email || body.username || "anonymous";
	const path = c.req.path;

	// Check if challenge is required
	const challengeRequired = isChallengeRequired(ip, identifier, path);

	if (challengeRequired) {
		// Check for Turnstile token (prefer header over body for security)
		const turnstileToken = c.req.header("x-turnstile-token") || body.turnstileToken;

		if (!turnstileToken) {
			return c.json(
				{
					error: "Challenge required",
					code: "CHALLENGE_REQUIRED",
					message: "Quick check to keep your account safe",
					siteKey: TURNSTILE_SITE_KEY,
				},
				403,
			);
		}

		// Verify token
		const verified = await verifyTurnstileToken(turnstileToken, ip);

		if (!verified) {
			return c.json(
				{
					error: "Challenge verification failed",
					code: "CHALLENGE_FAILED",
					message: "Please complete the security check",
				},
				403,
			);
		}

		// Challenge passed - set bypass cookie and clear failures
		setBypassCookie(c);
		clearFailures(ip, identifier, path);

		logger.info("Turnstile challenge passed", {
			ip,
			identifier,
			path,
		});
	}

	await next();
}

/**
 * POST /challenge/verify
 * Standalone endpoint to verify Turnstile token and set bypass cookie
 */
export async function verifyChallenge(c: Context) {
	const body = await c.req.json().catch(() => ({}));
	const { token } = body;

	if (!token) {
		return c.json(
			{
				error: "Token required",
				code: "TOKEN_REQUIRED",
			},
			400,
		);
	}

	const ip =
		c.req.header("cf-connecting-ip") ||
		c.req.header("x-forwarded-for")?.split(",")[0] ||
		c.req.header("x-real-ip") ||
		"unknown";

	const verified = await verifyTurnstileToken(token, ip);

	if (!verified) {
		return c.json(
			{
				error: "Verification failed",
				code: "VERIFICATION_FAILED",
			},
			403,
		);
	}

	// Set bypass cookie
	setBypassCookie(c);

	return c.json({
		success: true,
		message: "Challenge verified",
		bypassDuration: BYPASS_COOKIE_TTL_MS / 1000 / 60, // in minutes
	});
}

/**
 * Cleanup expired failure records (run periodically)
 */
export function cleanupExpiredFailures(): void {
	const now = Date.now();
	let cleaned = 0;

	for (const [key, record] of failureStore.entries()) {
		if (now - record.firstFailure > FAILURE_WINDOW_MS) {
			failureStore.delete(key);
			cleaned++;
		}
	}

	if (cleaned > 0) {
		logger.debug("Cleaned up expired failure records", { count: cleaned });
	}
}

// Run cleanup every minute
setInterval(cleanupExpiredFailures, 60 * 1000);
