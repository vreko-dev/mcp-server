import { auth } from "@snapback/auth";
import { getTierFromMetadata, hasPermissionForTier } from "@snapback/auth/lib/tier-utils";
import { logger } from "@snapback/infrastructure";
import { LRUCache } from "lru-cache";

// Use lru-cache for API key verification results
const authCache = new LRUCache<string, { timestamp: number; result: AuthResult }>({
	max: 1000,
	ttl: 60 * 1000, // 1 minute TTL
});

export interface AuthResult {
	valid: boolean;
	tier: "free" | "pro" | "admin";
	scopes?: string[];
	userId?: string;
	organizationId?: string;
	error?: string;
}

/**
 * ✅ LEVEL 3: Authenticate API key using better-auth's built-in verification
 * Replaces 265 lines of custom RBAC logic
 *
 * @param apiKey - The API key to authenticate
 * @returns Authentication result with validity, tier, and scopes
 */
export async function authenticate(apiKey: string): Promise<AuthResult> {
	const now = Date.now();

	// Check cache first
	const cached = authCache.get(apiKey);
	if (cached && now - cached.timestamp < 60 * 1000) {
		logger.debug("Using cached auth result", {
			apiKey: `${apiKey.substring(0, 8)}...`,
		});
		return cached.result;
	}

	// Use better-auth's built-in API key verification
	try {
		const verified = await auth.api.verifyApiKey({ key: apiKey });

		if (!verified?.isValid) {
			const result: AuthResult = {
				valid: false,
				tier: "free",
				error: "Invalid API key",
			};
			authCache.set(apiKey, { timestamp: now, result });
			return result;
		}

		// Determine tier from metadata using shared utility
		const tier = getTierFromMetadata(verified.metadata);

		const result: AuthResult = {
			valid: true,
			tier,
			scopes: Object.keys(verified.permissions || {}),
			userId: verified.userId,
			organizationId: verified.metadata?.organizationId as string,
		};

		authCache.set(apiKey, { timestamp: now, result });
		return result;
	} catch (error) {
		logger.error("Authentication error", {
			error,
			apiKey: `${apiKey.substring(0, 8)}...`,
		});

		return {
			valid: false,
			tier: "free",
			error: "Authentication service unavailable",
		};
	}
}

/**
 * Determine user tier from API key metadata
 * Uses shared utility from @snapback/auth/lib/tier-utils
 */
// ✅ CONSOLIDATED: Logic moved to getTierFromMetadata in tier-utils.ts
// function getTierFromMetadata(metadata: Record<string, unknown> | undefined): "free" | "pro" | "admin" { ... }

/**
 * Check if a user has a specific permission using shared tier-based logic
 * Uses hasPermissionForTier utility for consistency
 */
export function hasPermission(authResult: AuthResult, resourceAction: string): boolean {
	if (!authResult.valid) {
		return false;
	}

	return hasPermissionForTier(authResult.tier, resourceAction);
}

/**
 * Check if a user has access to a specific tool
 * Maps tool names to required permissions
 *
 * @param authResult - The authentication result
 * @param toolName - The name of the tool
 * @returns True if the user has access to the tool
 */
export function hasToolAccess(authResult: AuthResult, toolName: string): boolean {
	if (!authResult.valid) {
		return false;
	}

	// Map tool names to required permissions
	const toolPermissions: Record<string, string> = {
		"snapback.analyze_risk": "snapback:analyze",
		"snapback.create_snapshot": "snapback:snapshot",
		"snapback.list_snapshots": "snapback:snapshot",
		"snapback.restore_snapshot": "snapback:snapshot",
		"ctx7.resolve-library-id": "snapback:context",
		"ctx7.get-library-docs": "snapback:context",
	};

	const requiredPermission = toolPermissions[toolName];
	if (!requiredPermission) {
		// If no specific permission required, allow access
		return true;
	}

	return hasPermission(authResult, requiredPermission);
}

/**
 * Clear the authentication cache (useful for testing)
 */
export function clearAuthCache(): void {
	authCache.clear();
}
