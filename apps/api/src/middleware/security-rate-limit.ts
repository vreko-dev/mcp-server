/**
 * Rate Limiting Middleware
 *
 * Implements sliding window rate limiting for authentication and API endpoints.
 * Integrates with @snapback/auth/security/rate-limiting module.
 *
 * OWASP Standard: A40:2021 – Denial of Service
 */

import {
	authEndpointLimits,
	globalRateLimitConfig,
	isRateLimited,
	type RateLimitConfig,
} from "@snapback/auth/security/rate-limiting";
import { logger } from "@snapback/infrastructure";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Rate Limiting Middleware Factory
 *
 * Creates middleware that enforces rate limits per IP address.
 * Returns 429 (Too Many Requests) if limit exceeded.
 *
 * @param configOverride Optional rate limit config overrides
 * @returns Hono middleware handler
 */
export function rateLimitingMiddleware(configOverride?: Partial<RateLimitConfig>): MiddlewareHandler {
	return async (c, next) => {
		try {
			// Get client IP address
			// Priority: 1) CF-Connecting-IP (Cloudflare), 2) X-Forwarded-For (proxy), 3) socket
			const ip =
				c.req.header("CF-Connecting-IP") ||
				c.req.header("X-Forwarded-For")?.split(",")[0] ||
				c.env?.incoming?.socket?.remoteAddress ||
				"unknown";

			const endpoint = c.req.path;

			// Determine rate limit config for this endpoint
			let config: RateLimitConfig = authEndpointLimits[endpoint] || globalRateLimitConfig;

			// Apply overrides if provided
			if (configOverride) {
				config = { ...config, ...configOverride };
			}

			// Check rate limit
			const result = isRateLimited(ip, config);

			// Set rate limit headers on response
			c.res.headers.set("X-RateLimit-Limit", String(config.maxRequests));
			c.res.headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));

			if (result.resetAt) {
				c.res.headers.set("X-RateLimit-Reset", String(result.resetAt));
			}

			// If rate limited, return 429 with retry-after
			if (result.limited) {
				logger.warn("Rate limit exceeded", {
					ip: `${ip.substring(0, 20)}...`, // Truncate for privacy
					endpoint,
					retryAfter: result.retryAfterSeconds,
					window: config.windowSeconds,
					limit: config.maxRequests,
				});

				const retryAfter = result.retryAfterSeconds || 60;
				c.res.headers.set("Retry-After", String(retryAfter));

				throw new HTTPException(429, {
					message: "Too many requests. Please try again later.",
					cause: {
						code: "RATE_LIMIT_EXCEEDED",
						retryAfter,
						resetAt: result.resetAt,
					},
				});
			}

			// Continue to next middleware
			return next();
		} catch (error) {
			// Re-throw HTTPException as-is
			if (error instanceof HTTPException) {
				throw error;
			}

			// Log unexpected errors
			logger.error("Rate limiting middleware error", {
				error: error instanceof Error ? error.message : String(error),
				path: c.req.path,
			});

			// On error, allow request to proceed (fail open for availability)
			// But log the issue for monitoring
			return next();
		}
	};
}
