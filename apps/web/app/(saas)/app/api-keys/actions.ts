"use server";

import { getSession } from "@saas/auth/lib/server";

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
	console.warn(
		"[ApiKeys] listApiKeysAction() is stubbed - requires backend API",
	);
	return [];
}

/**
 * Create a new API key
 */
export async function createApiKeyAction(
	_name: string,
	_rateLimit = 100,
): Promise<ApiKey & { fullKey: string }> {
	const session = await getSession();

	if (!(session as any)?.user) {
		throw new Error("Unauthorized");
	}

	// STUB: Requires backend API
	console.warn(
		"[ApiKeys] createApiKeyAction() is stubbed - requires backend API",
	);
	throw new Error("API key creation requires backend API connection");
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
	console.warn(
		"[ApiKeys] revokeApiKeyAction() is stubbed - requires backend API",
	);
	throw new Error("API key revocation requires backend API connection");
}
