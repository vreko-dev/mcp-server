/**
 * API Key Scope Validation Middleware
 *
 * Validates API key permissions for protected endpoints.
 * Integrates with @snapback/auth/security/api-key-security module.
 *
 * OWASP Standard: A01:2021 – Broken Access Control
 */

import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono";
import { validateAPIKeyScope } from "@snapback/auth/security/api-key-security";
import { logger } from "@snapback/infrastructure";

/**
 * API Key context stored in Hono context
 */
export interface APIKeyContext {
	/** API key identifier */
	keyId: string;
	/** Granted scopes for this key */
	scopes: string[];
	/** Key expiration timestamp (if applicable) */
	expiresAt?: number;
}

/**
 * API Key Scope Validation Middleware
 *
 * Extracts API key from Authorization header and validates requested scopes.
 * Returns 403 (Forbidden) if insufficient permissions.
 *
 * @param requiredScopes Array of required scopes for this endpoint
 * @returns Hono middleware handler
 */
export function apiKeyScopeMiddleware(
	requiredScopes: string[] = [],
): MiddlewareHandler<{
	Variables: {
		apiKeyContext?: APIKeyContext;
	};
}> {
	return async (c, next) => {
		try {
			// Skip API key validation if no scopes required
			if (requiredScopes.length === 0) {
				return next();
			}

			// Extract API key from Authorization header
			const authHeader = c.req.header("Authorization");

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				throw new HTTPException(401, {
					message: "Missing or invalid API key",
					cause: {
						code: "MISSING_API_KEY",
					},
				});
			}

			const keyId = authHeader.replace("Bearer ", "");

			// Validate key format (basic check)
			if (!keyId || keyId.length < 10) {
				throw new HTTPException(401, {
					message: "Invalid API key format",
					cause: {
						code: "INVALID_KEY_FORMAT",
					},
				});
			}

			// TODO: Lookup API key from database to get actual scopes
			// For now, use example scopes (replace with database lookup)
			const keyScopes = ["snapshots:read", "snapshots:write"];

			// Validate each required scope
			for (const requiredScope of requiredScopes) {
				if (!validateAPIKeyScope(keyScopes, requiredScope)) {
					logger.warn("Insufficient API key scope", {
						keyId: `${keyId.substring(0, 10)}...`,
						requiredScope,
						grantedScopes: keyScopes,
					});

					throw new HTTPException(403, {
						message: "Insufficient permissions for this operation",
						cause: {
							code: "INSUFFICIENT_SCOPE",
							required: requiredScope,
							granted: keyScopes,
						},
					});
				}
			}

			// Set API key context for use in route handlers
			c.set("apiKeyContext", {
				keyId,
				scopes: keyScopes,
			});

			// Continue to next middleware
			return next();
		} catch (error) {
			// Re-throw HTTPException as-is
			if (error instanceof HTTPException) {
				throw error;
			}

			// Log unexpected errors
			logger.error("API key scope middleware error", {
				error: error instanceof Error ? error.message : String(error),
				path: c.req.path,
			});

			throw new HTTPException(500, {
				message: "API key validation error",
				cause: error instanceof Error ? error : new Error(String(error)),
			});
		}
	};
}
