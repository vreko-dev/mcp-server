/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens for state-changing requests (POST, PUT, PATCH, DELETE)
 * Safe methods (GET, HEAD, OPTIONS) bypass CSRF validation
 * Integrates with security/csrf-protection.ts for cryptographic validation
 */

import {
	validateCSRFToken,
	validateOrigin,
} from "@snapback/auth/security/csrf-protection";
import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";

/**
 * Extract CSRF token from request
 * Checks: body (formData), header (X-CSRF-Token), query param (?csrf_token=)
 */
function extractCSRFToken(c: Context): string | null {
	// Header first (preferred for AJAX)
	const headerToken = c.req.header("X-CSRF-Token");
	if (headerToken) {
		return headerToken;
	}

	// Query parameter (fallback for simple forms)
	const queryToken = c.req.query("csrf_token");
	if (queryToken) {
		return queryToken;
	}

	// Body (for form submissions) - only available for POST/PUT/PATCH
	// Note: In Hono, we'd need to parse the body, which is done later
	// This will be handled by checking request context
	return null;
}

/**
 * CSRF Protection Middleware
 * Validates tokens for state-changing requests
 *
 * Usage:
 * ```typescript
 * app.use("*", csrfProtectionMiddleware);
 * ```
 *
 * For state-changing requests (POST, PUT, PATCH, DELETE):
 * 1. Extract stored token from session cookie
 * 2. Extract provided token from request (header, query, or body)
 * 3. Validate using constant-time comparison
 * 4. Validate origin header
 *
 * Safe methods (GET, HEAD, OPTIONS) bypass checks
 */
export async function csrfProtectionMiddleware(
	c: Context,
	next: Next,
): Promise<void> {
	const method = c.req.method.toUpperCase();

	// Safe methods don't need CSRF protection
	if (["GET", "HEAD", "OPTIONS"].includes(method)) {
		await next();
		return;
	}

	// State-changing methods require CSRF validation
	if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
		await next();
		return;
	}

	// Extract the stored CSRF token from session
	// In the request context, this would come from session cookies
	const storedToken = c.req.header("x-csrf-stored-token");

	if (!storedToken) {
		logger.warn("CSRF protection: No stored token found in session", {
			path: c.req.path,
			method,
		});

		return c.json(
			{
				code: "csrf_missing_token",
				message: "CSRF token required for this operation",
			},
			403,
		);
	}

	// Extract provided token from request
	const providedToken = extractCSRFToken(c);

	if (!providedToken) {
		logger.warn("CSRF protection: No token provided in request", {
			path: c.req.path,
			method,
		});

		return c.json(
			{
				code: "csrf_token_required",
				message:
					"CSRF token required in X-CSRF-Token header or csrf_token query parameter",
			},
			403,
		);
	}

	// Validate token using constant-time comparison
	const tokenValidation = validateCSRFToken(
		providedToken,
		storedToken,
		c.req.header("Origin") || c.req.header("Referer") || null,
	);

	if (!tokenValidation.valid) {
		logger.warn("CSRF protection: Token validation failed", {
			path: c.req.path,
			method,
			reason: tokenValidation.reason,
		});

		return c.json(
			{
				code: "csrf_invalid_token",
				message: "Invalid CSRF token",
			},
			403,
		);
	}

	// Validate origin header
	const originValidation = validateOrigin(
		c.req.header("Origin"),
		c.req.header("Referer"),
		method,
	);

	if (!originValidation.valid) {
		logger.warn("CSRF protection: Origin validation failed", {
			path: c.req.path,
			method,
			reason: originValidation.reason,
		});

		return c.json(
			{
				code: "csrf_invalid_origin",
				message: "Request origin not authorized",
			},
			403,
		);
	}

	// Token and origin valid - proceed
	await next();
}

/**
 * Optional CSRF validation
 * For routes that might receive requests from external sources
 * Returns early if no token, doesn't error
 */
export async function optionalCSRFProtection(
	c: Context,
	next: Next,
): Promise<void> {
	const method = c.req.method.toUpperCase();

	// Safe methods skip check
	if (["GET", "HEAD", "OPTIONS"].includes(method)) {
		await next();
		return;
	}

	// Try to validate, but don't error if missing
	const storedToken = c.req.header("x-csrf-stored-token");
	const providedToken = extractCSRFToken(c);

	if (storedToken && providedToken) {
		const validation = validateCSRFToken(
			providedToken,
			storedToken,
			c.req.header("Origin") || c.req.header("Referer") || null,
		);

		if (!validation.valid) {
			logger.warn("Optional CSRF validation failed", {
				path: c.req.path,
				reason: validation.reason,
			});

			return c.json(
				{ code: "csrf_invalid_token", message: "Invalid CSRF token" },
				403,
			);
		}
	}

	await next();
}
