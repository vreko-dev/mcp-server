"use server";

import { getSession } from "@saas/auth/lib/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@snapback/auth";
import { revalidatePath } from "next/cache";

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

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	return await listApiKeys(session.user.id);
}

/**
 * Create a new API key
 */
export async function createApiKeyAction(
	name: string,
	rateLimit = 100,
): Promise<ApiKey & { fullKey: string }> {
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	const result = await createApiKey({
		userId: session.user.id,
		name,
		rateLimit,
	});

	// Revalidate the page to show the new key
	revalidatePath("/app/api-keys");

	return result;
}

/**
 * Revoke an API key
 */
export async function revokeApiKeyAction(keyId: string): Promise<void> {
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	await revokeApiKey(keyId, session.user.id);

	// Revalidate the page to update the list
	revalidatePath("/app/api-keys");
}
