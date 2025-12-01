import { and, eq, gte } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { apiKeys, apiKeyUsage } from "../schema/snapback/index.js";

export interface ApiKey {
	id: string;
	userId: string;
	name?: string;
	permissions: string[];
	revoked: boolean;
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
	 */
	async createKey(userId: string, name?: string, _permissions: string[] = [], expiresAt?: Date): Promise<string> {
		const id = this.generateApiKey();

		await this.db.insert(apiKeys).values({
			id,
			userId,
			name: name || "",
			keyPrefix: id.substring(0, 16),
			keyHash: id, // In a real implementation, this would be a hash
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt,
		});

		return id;
	}

	/**
	 * Rotate an API key (create new, revoke old)
	 */
	async rotateKey(oldKeyId: string): Promise<string> {
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
		const newKeyId = this.generateApiKey();

		await this.db.insert(apiKeys).values({
			id: newKeyId,
			userId: oldKey.userId,
			name: oldKey.name,
			keyPrefix: newKeyId.substring(0, 16),
			keyHash: newKeyId, // In a real implementation, this would be a hash
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt: oldKey.expiresAt,
		});

		// Revoke the old key
		await this.db
			.update(apiKeys)
			.set({ revokedAt: new Date(), updatedAt: new Date() })
			.where(eq(apiKeys.id, oldKeyId));

		return newKeyId;
	}

	/**
	 * Revoke an API key
	 */
	async revokeKey(keyId: string): Promise<void> {
		await this.db
			.update(apiKeys)
			.set({ revokedAt: new Date(), updatedAt: new Date() })
			.where(eq(apiKeys.id, keyId));
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
		return !key.revokedAt && (!key.expiresAt || key.expiresAt > new Date());
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
					tokensUsed: (existing[0].tokensUsed || 0) + 1,
					requestTimeMs: (existing[0].requestTimeMs || 0) + 1,
				})
				.where(eq(apiKeyUsage.id, existing[0].id));
		} else {
			// Create new record
			await this.db.insert(apiKeyUsage).values({
				id: crypto.randomUUID(),
				apiKeyId: keyId,
				requestId: crypto.randomUUID(), // This should be the actual request ID
				endpoint,
				tokensUsed: 1,
				requestTimeMs: 1,
				timestamp: new Date(),
			});
		}

		// Update last used timestamp on the key
		await this.db.update(apiKeys).set({ updatedAt: new Date() }).where(eq(apiKeys.id, keyId));
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
			permissions: [], // This would need to be stored separately in a real implementation
			revoked: !!row.revokedAt,
			lastUsedAt: row.updatedAt,
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
