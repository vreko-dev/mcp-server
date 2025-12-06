import { and, eq, gte } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { apiKeys, apiKeyUsage } from "../schema/snapback/index";

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
	async createKey(userId: string, name?: string, permissions: string[] = [], expiresAt?: Date): Promise<string> {
		const id = this.generateApiKey();

		await this.db.insert(apiKeys).values({
			id,
			userId,
			name: name || "",
			permissions: permissions,
			createdAt: new Date(),
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
			permissions: oldKey.permissions,
			createdAt: new Date(),
			expiresAt: oldKey.expiresAt,
		});

		// Revoke the old key
		await this.db.update(apiKeys).set({ revoked: true }).where(eq(apiKeys.id, oldKeyId));

		return newKeyId;
	}

	/**
	 * Revoke an API key
	 */
	async revokeKey(keyId: string): Promise<void> {
		await this.db.update(apiKeys).set({ revoked: true }).where(eq(apiKeys.id, keyId));
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
			permissions: row.permissions || [],
			revoked: row.revoked,
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
