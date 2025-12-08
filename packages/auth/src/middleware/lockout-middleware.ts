/**
 * Account Lockout Middleware
 *
 * Integrates account lockout checking with Better Auth authentication flow
 *
 * Usage in API routes:
 * ```typescript
 * import { withLockoutProtection } from "@snapback/auth/middleware";
 *
 * export async function POST(request: Request) {
 *   return withLockoutProtection(request, async () => {
 *     return auth.handler(request);
 *   });
 * }
 * ```
 */

import { logger } from "@snapback/infrastructure";
import { checkAccountLockout, incrementFailedAttempts, resetFailedAttempts } from "../lib/account-lockout";

/**
 * Extract email from request body
 * Handles both JSON and FormData
 */
async function extractEmail(request: Request): Promise<string | null> {
	try {
		const contentType = request.headers.get("content-type") || "";

		if (contentType.includes("application/json")) {
			const clone = request.clone();
			const body = await clone.json();
			return body.email || null;
		}

		if (contentType.includes("application/x-www-form-urlencoded")) {
			const clone = request.clone();
			const formData = await clone.formData();
			return formData.get("email")?.toString() || null;
		}

		return null;
	} catch (error) {
		logger.warn("Failed to extract email from request", { error });
		return null;
	}
}

/**
 * Check if request is a login attempt
 */
function isLoginRequest(request: Request): boolean {
	const url = new URL(request.url);
	return (
		request.method === "POST" &&
		(url.pathname.includes("/sign-in") || url.pathname.includes("/signin") || url.pathname.includes("/login"))
	);
}

/**
 * Middleware wrapper for account lockout protection
 *
 * Flow:
 * 1. Check if account is locked before authentication
 * 2. If locked, return 429 (Too Many Requests)
 * 3. Otherwise, proceed with authentication
 * 4. On success: reset failed attempts counter
 * 5. On failure: increment failed attempts counter
 *
 * @param request Incoming HTTP request
 * @param handler Authentication handler function
 * @returns HTTP Response
 */
export async function withLockoutProtection(
	request: Request,
	handler: (req: Request) => Promise<Response>,
): Promise<Response> {
	// Only apply to login requests
	if (!isLoginRequest(request)) {
		return handler(request);
	}

	const email = await extractEmail(request);

	if (!email) {
		// No email in request - let Better Auth handle validation
		return handler(request);
	}

	// Check if account is locked
	const lockout = await checkAccountLockout(email);

	if (lockout.locked) {
		logger.warn("Login attempt blocked - account locked", {
			email,
			remainingTime: lockout.remainingTime,
		});

		return new Response(
			JSON.stringify({
				error: "Account temporarily locked due to too many failed login attempts",
				retryAfter: lockout.remainingTime,
				lockedUntil: new Date(Date.now() + (lockout.remainingTime || 0) * 1000).toISOString(),
			}),
			{
				status: 429, // Too Many Requests
				headers: {
					"Content-Type": "application/json",
					"Retry-After": String(lockout.remainingTime || 900), // 15 minutes default
					"X-RateLimit-Limit": "5",
					"X-RateLimit-Remaining": "0",
				},
			},
		);
	}

	// Proceed with authentication
	const response = await handler(request);

	// Handle response based on success/failure
	if (response.status === 200) {
		// Successful login - reset counter
		await resetFailedAttempts(email);
		logger.debug("Login successful - reset lockout counter", { email });
	} else if (response.status === 401 || response.status === 403) {
		// Failed login - increment counter
		await incrementFailedAttempts(email);
		logger.debug("Login failed - incremented lockout counter", { email });
	}

	return response;
}

/**
 * Export individual lockout functions for direct use
 */
export { checkAccountLockout, incrementFailedAttempts, resetFailedAttempts };
