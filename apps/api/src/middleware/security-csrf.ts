/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens from @snapback/auth/security/csrf-protection module.
 * Integrates cryptographically secure token validation with Hono request flow.
 *
 * OWASP Standard: A01:2021 – Broken Access Control
 */

import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono";
import {
	validateCSRFToken,
	type CSRFConfig,
} from "@snapback/auth/security/csrf-protection";
import { logger } from "@snapback/infrastructure";

/**
 * CSRF Protection Middleware Factory
 *
 * Creates middleware that validates CSRF tokens for state-changing requests.
 * Skips validation for safe methods (GET, HEAD, OPTIONS).
 *
 * @param config Optional CSRF configuration overrides
 * @returns Hono middleware handler
 */
export function csrfProtectionMiddleware(
	config?: Partial<CSRFConfig>,
): MiddlewareHandler {
	return async (c, next) => {
		const method = c.req.method;

		// Skip CSRF validation for safe methods
		if (["GET", "HEAD", "OPTIONS"].includes(method)) {
			return next();
		}

		try {
			// Get CSRF token from request
			// Priority: 1) X-CSRF-Token header, 2) Form data
			let providedToken: string | undefined;

			// Check header first (most secure)
			providedToken = c.req.header("X-CSRF-Token");

			// If not in header, check request body for form-encoded data
			if (!providedToken && method === "POST") {
				try {
					const contentType = c.req.header("Content-Type") || "";
					if (contentType.includes("application/x-www-form-urlencoded")) {
						const body = await c.req.text();
						const match = body.match(/csrf_token=([^&]+)/);
						providedToken = match?.[1];
					}
				} catch (error) {
					logger.warn("Failed to parse CSRF token from body", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// Get stored token from context (set by session middleware)
			const storedToken = c.get("csrfToken") as string | undefined;

			// Get origin for validation
			const origin = c.req.header("Origin");
			const referer = c.req.header("Referer");

			// Validate CSRF token
			const validation = validateCSRFToken(
				providedToken,
				storedToken,
				origin || referer,
				config,
			);

			if (!validation.valid) {
				logger.warn("CSRF token validation failed", {
					reason: validation.reason,
					method,
					path: c.req.path,
					origin,
				});

				throw new HTTPException(403, {
					message: validation.reason || "CSRF token validation failed",
					cause: {
						code: "CSRF_TOKEN_INVALID",
						reason: validation.reason,
					},
				});
			}

			// CSRF validation passed, continue to next middleware
			return next();
		} catch (error) {
			// Re-throw HTTPException as-is
			if (error instanceof HTTPException) {
				throw error;
			}

			// Log unexpected errors
			logger.error("CSRF middleware error", {
				error: error instanceof Error ? error.message : String(error),
				method,
				path: c.req.path,
			});

			throw new HTTPException(500, {
				message: "CSRF validation error",
				cause: error instanceof Error ? error : new Error(String(error)),
			});
		}
	};
}
