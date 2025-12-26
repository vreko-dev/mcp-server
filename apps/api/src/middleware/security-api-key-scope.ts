/**
 * API Key Scope Validation Middleware
 *
 * Validates API key permissions for protected endpoints.
 * Integrates with @snapback/auth/security/api-key-security module.
 *
 * OWASP Standard: A01:2021 – Broken Access Control
 */

import { validateAPIKeyScope } from "@snapback/auth/security/api-key-security";
import { logger } from "@snapback/infrastructure";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../services/database";

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
export function apiKeyScopeMiddleware(requiredScopes: string[] = []): MiddlewareHandler<{
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

			// Lookup API key from database to get actual permissions
			const db = getDb();
			const keyRecord = await db.query.apiKeys.findFirst({
				where: (apiKeys, { eq }) => eq(apiKeys.id, keyId),
				columns: {
					id: true,
					permissions: true,
					revoked: true,
					expiresAt: true,
				},
			});

			if (!keyRecord) {
				throw new HTTPException(401, {
					message: "API key not found",
					cause: {
						code: "INVALID_API_KEY",
					},
				});
			}

			// Check if key is revoked
			if (keyRecord.revoked) {
				logger.warn("Revoked API key attempted", {
					keyId: `${keyId.substring(0, 10)}...`,
				});

				throw new HTTPException(401, {
					message: "API key has been revoked",
					cause: {
						code: "REVOKED_API_KEY",
					},
				});
			}

			// Check if key is expired
			if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
				logger.warn("Expired API key attempted", {
					keyId: `${keyId.substring(0, 10)}...`,
					expiresAt: keyRecord.expiresAt,
				});

				throw new HTTPException(401, {
					message: "API key has expired",
					cause: {
						code: "EXPIRED_API_KEY",
					},
				});
			}

			// Get permissions from database (already stored as scope strings)
			// Schema: text[] array with values like ["snapshots:read", "snapshots:write", "snapshots:cloud"]
			const dbPermissions = (keyRecord.permissions as string[]) || [];

			// Map legacy feature names to scope strings for backward compatibility
			// This handles any mixed-format data during migration period
			const keyScopes: string[] = [];

			// Add all string-based permissions directly
			for (const perm of dbPermissions) {
				if (typeof perm === "string") {
					// Map legacy names to current scope format
					if (perm === "cloudBackup" || perm === "snapshots:cloud") {
						keyScopes.push("snapshots:backup", "snapshots:cloud");
					} else if (perm === "advancedDetection" || perm === "detection:advanced") {
						keyScopes.push("detection:advanced");
					} else if (perm === "customRules" || perm === "custom:rules") {
						keyScopes.push("rules:custom", "custom:rules");
					} else if (perm === "teamSharing" || perm === "team:share") {
						keyScopes.push("team:share");
					} else {
						// Pass through standard scope strings as-is
						keyScopes.push(perm);
					}
				}
			}

			// All keys have basic snapshot operations
			if (!keyScopes.includes("snapshots:read")) keyScopes.push("snapshots:read");
			if (!keyScopes.includes("snapshots:write")) keyScopes.push("snapshots:write");

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
