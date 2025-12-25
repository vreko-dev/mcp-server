import { and, eq, gte } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { apiKeys, apiKeyUsage } from "../schema/snapback/index";

// Simple hash function for internal keys (not user-facing)
async function hashKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ApiKey {
	id: string;
	userId: string;
	name?: string;
	keyPreview: string; // First 12 chars for display
	permissions: string[];
	revoked: boolean;
	revokedAt?: Date;
	lastUsedAt?: Date;
	createdAt: Date;
	expiresAt?: Date;
}

export interface ApiKeyUsageRecord {
	id: string;
	apiKeyId: string;
	endpoint: string;
	requestCount: number;
	timestamp: Date;
	createdAt: Date;
}

export class KeysDb {
	constructor(private db: PgDatabase<any>) {}

	/**
	 * Create a new API key
	 * Returns the raw key (only time it's visible to user)
	 */
	async createKey(
		userId: string,
		name?: string,
		permissions: string[] = [],
		expiresAt?: Date,
	): Promise<{ id: string; rawKey: string; keyPreview: string }> {
		const rawKey = this.generateApiKey();
		const hashedKey = await hashKey(rawKey);
		const keyPreview = `${rawKey.slice(0, 12)}...`; // Standardized 12 chars
		const id = crypto.randomUUID();

		await this.db.insert(apiKeys).values({
			id,
			userId,
			name: name || "",
			key: hashedKey,
			keyPreview,
			permissions: permissions,
			createdAt: new Date(),
			expiresAt,
		});

		return { id, rawKey, keyPreview };
	}

	/**
	 * Rotate an API key (create new, revoke old)
	 * Returns the new raw key (only time it's visible to user)
	 */
	async rotateKey(oldKeyId: string): Promise<{ id: string; rawKey: string; keyPreview: string }> {
		// Get the old key details
		const oldKeys = await this.db.select().from(apiKeys).where(eq(apiKeys.id, oldKeyId)).limit(1);

		if (oldKeys.length === 0) {
			throw new Error("API key not found");
		}

		const oldKey = oldKeys[0];
		if (!oldKey) {
			throw new Error("API key not found");
		}

		// Create new key with same properties
		const rawKey = this.generateApiKey();
		const hashedKey = await hashKey(rawKey);
		const keyPreview = `${rawKey.slice(0, 12)}...`; // Standardized 12 chars
		const newKeyId = crypto.randomUUID();

		await this.db.insert(apiKeys).values({
			id: newKeyId,
			userId: oldKey.userId,
			name: oldKey.name,
			key: hashedKey,
			keyPreview,
			permissions: oldKey.permissions,
			createdAt: new Date(),
			expiresAt: oldKey.expiresAt,
		});

		// Revoke the old key
		await this.db.update(apiKeys).set({ revoked: true, revokedAt: new Date() }).where(eq(apiKeys.id, oldKeyId));

		return { id: newKeyId, rawKey, keyPreview };
	}

	/**
	 * Revoke an API key
	 */
	async revokeKey(keyId: string): Promise<void> {
		await this.db.update(apiKeys).set({ revoked: true, revokedAt: new Date() }).where(eq(apiKeys.id, keyId));
	}

	/**
	 * Check if a key is valid (exists and not revoked)
	 */
	async isKeyValid(keyId: string): Promise<boolean> {
		const result = await this.db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

		if (result.length === 0) {
			return false;
		}

		const key = result[0];
		if (!key) {
			return false;
		}
		return !key.revoked && (!key.expiresAt || key.expiresAt > new Date());
	}

	/**
	 * Record API key usage
	 */
	async recordUsage(keyId: string, endpoint: string): Promise<void> {
		// Check if there's already a usage record for this key/endpoint/timestamp
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const existing = await this.db
			.select()
			.from(apiKeyUsage)
			.where(
				and(
					eq(apiKeyUsage.apiKeyId, keyId),
					eq(apiKeyUsage.endpoint, endpoint),
					gte(apiKeyUsage.timestamp, today),
				),
			)
			.limit(1);

		if (existing.length > 0 && existing[0]) {
			// Update existing record
			await this.db
				.update(apiKeyUsage)
				.set({
					requestCount: (existing[0].requestCount || 1) + 1,
				})
				.where(eq(apiKeyUsage.id, existing[0].id));
		} else {
			// Create new record
			await this.db.insert(apiKeyUsage).values({
				id: crypto.randomUUID(),
				apiKeyId: keyId,
				endpoint,
				requestCount: 1,
				timestamp: new Date(),
			});
		}

		// Update last used timestamp on the key
		await this.db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyId));
	}

	/**
	 * Get key details
	 */
	async getKey(keyId: string): Promise<ApiKey | null> {
		const result = await this.db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

		if (result.length === 0) {
			return null;
		}

		const row = result[0];
		if (!row) {
			return null;
		}
		return {
			id: row.id,
			userId: row.userId,
			name: row.name || undefined,
			keyPreview: row.keyPreview,
			permissions: row.permissions || [],
			revoked: row.revoked,
			revokedAt: row.revokedAt || undefined,
			lastUsedAt: row.lastUsedAt || undefined,
			createdAt: row.createdAt,
			expiresAt: row.expiresAt || undefined,
		};
	}

	/**
	 * Generate a new API key string
	 */
	private generateApiKey(): string {
		// Generate a secure random API key
		const prefix = "sk_snapback_";
		const randomBytes = new Uint8Array(24);
		crypto.getRandomValues(randomBytes);
		const randomString = Array.from(randomBytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return prefix + randomString;
	}
}
