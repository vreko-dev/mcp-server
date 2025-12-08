"use server";

import { getSession } from "@saas/auth/lib/server";
import { orpcClient } from "@shared/lib/orpc-client";

// STUB: API Key operations require backend API
// In frontend-only mode, these return empty/stub responses

// ApiKey type matching the auth package's interface
interface ApiKey {
	id: string;
	userId: string;
	key?: string;
	keyHash: string;
	keyPreview: string;
	name: string;
	lastUsedAt?: Date | null;
	createdAt: Date;
	expiresAt?: Date | null;
	revokedAt?: Date | null;
	scopes: string[];
	rateLimit: number;
}

/**
 * List all API keys for the current user
 */
export async function listApiKeysAction(): Promise<Omit<ApiKey, "keyHash">[]> {
	const session = await getSession();

	if (!(session as any)?.user) {
		throw new Error("Unauthorized");
	}

	// STUB: Requires backend API
	console.warn("[ApiKeys] listApiKeysAction() is stubbed - requires backend API");
	return [];
}

/**
 * Create a new API key
 */
export async function createApiKeyAction(name: string): Promise<ApiKey & { fullKey: string; message?: string }> {
	const session = await getSession();
	const user = (session as any)?.user;

	if (!user) {
		throw new Error("Unauthorized");
	}

	// 1. Validation
	const cleanName = name.trim();
	if (!cleanName || cleanName.length === 0) {
		throw new Error("Name is required");
	}
	if (cleanName.length > 50) {
		throw new Error("Name is too long (max 50 chars)");
	}

	try {
		// 2. Call ORPC
		const result = await orpcClient.apiKeys.create({
			name: cleanName,
		});

		// 3. Return formatted result
		// Result matches existing backend return shape: { apiKey: {...}, message: string }
		// The return type of this action expects the ApiKey object + fullKey at top level mainly?
		// Actually, the interface defined above `ApiKey` doesn't strictly match the backend one maybe.
		// Let's align structure.

		return {
			...result.apiKey,
			fullKey: result.apiKey.key, // Backend returns raw key in `key` field for initial creation
			message: result.message,
		};
	} catch (error: any) {
		// Handle unexpected errors (network, rate limit etc)
		console.error("[ApiKeys] Create Error:", error);

		// Expose user-friendly message if safe
		if (error.message && !error.message.includes("internal")) {
			throw new Error(error.message);
		}

		throw new Error("Failed to create API key");
	}
}

/**
 * Revoke an API key
 */
export async function revokeApiKeyAction(_keyId: string): Promise<void> {
	const session = await getSession();

	if (!(session as any)?.user) {
		throw new Error("Unauthorized");
	}

	// STUB: Requires backend API
	console.warn("[ApiKeys] revokeApiKeyAction() is stubbed - requires backend API");
	throw new Error("API key revocation requires backend API connection");
}
