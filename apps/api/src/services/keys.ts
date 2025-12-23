import { verify } from "@node-rs/argon2";
import { generateApiKey, hashApiKey } from "@snapback/auth";

// In-memory store for API keys
interface ApiKey {
	id: string;
	keyHash: string; // Store hash instead of plaintext key
	userId: string;
	createdAt: Date;
	lastUsedAt?: Date;
	expiresAt?: Date;
	revokedAt?: Date;
	permissions: Record<string, unknown>;
}

// In-memory store for usage audit logs
interface UsageLog {
	id: string;
	apiKeyId: string;
	endpoint: string;
	timestamp: Date;
	userAgent?: string;
	ipAddress?: string;
}

const apiKeysStore = new Map<string, ApiKey>();
const usageLogsBuffer: UsageLog[] = [];

/**
 * Create a new API key
 * @param userId The user ID to associate with the key
 * @param permissions The permissions for the key
 * @param expiresAt Optional expiration date
 * @returns The created API key object
 */
export async function createApiKey(
	userId: string,
	permissions: Record<string, unknown>,
	expiresAt?: Date,
): Promise<{ id: string; key: string }> {
	const key = generateApiKey();
	const keyHash = await hashApiKey(key); // Hash the key for storage
	const id = createId();

	const apiKey: ApiKey = {
		id,
		keyHash,
		userId,
		createdAt: new Date(),
		expiresAt,
		permissions,
	};

	apiKeysStore.set(id, apiKey);

	// Return the ID and the plaintext key (only shown once)
	return { id, key };
}

/**
 * Get an API key by ID (without the actual key value)
 * @param id The API key ID
 * @returns The API key object without the actual key value
 */
export async function getApiKey(id: string): Promise<Omit<ApiKey, "keyHash"> | null> {
	const apiKey = apiKeysStore.get(id);
	if (!apiKey) {
		return null;
	}

	// Return the key object without the actual key hash
	const { keyHash: _keyHash, ...keyWithoutValue } = apiKey;
	return keyWithoutValue;
}

/**
 * Get an API key by the key value (using constant-time comparison)
 * @param keyValue The API key value
 * @returns The API key object
 */
export async function getApiKeyByKey(keyValue: string): Promise<Omit<ApiKey, "keyHash"> | null> {
	// Validate key format first
	if (!keyValue.startsWith("sk_live_")) {
		return null;
	}

	// Find the key using constant-time comparison
	for (const [_id, apiKey] of apiKeysStore.entries()) {
		if (await verify(apiKey.keyHash, keyValue)) {
			// Return the key object without the hash
			const { keyHash: _keyHash, ...keyWithoutValue } = apiKey;
			return keyWithoutValue;
		}
	}
	return null;
}

/**
 * Revoke an API key
 * @param id The API key ID
 * @returns Boolean indicating success
 */
export async function revokeApiKey(id: string): Promise<boolean> {
	const apiKey = apiKeysStore.get(id);
	if (!apiKey) {
		return false;
	}

	// Update the revokedAt timestamp
	apiKey.revokedAt = new Date();
	apiKeysStore.set(id, apiKey);
	return true;
}

/**
 * Log API usage for auditing
 * @param apiKeyId The API key ID
 * @param endpoint The endpoint that was accessed
 * @param userAgent Optional user agent
 * @param ipAddress Optional IP address
 */
export async function logApiUsage(
	apiKeyId: string,
	endpoint: string,
	userAgent?: string,
	ipAddress?: string,
): Promise<void> {
	const log: UsageLog = {
		id: createId(),
		apiKeyId,
		endpoint,
		timestamp: new Date(),
		userAgent,
		ipAddress,
	};

	// Buffer the log entry for batch processing
	usageLogsBuffer.push(log);

	// In a real implementation, we would periodically flush the buffer to a database
	// For now, we'll just keep it in memory
}

/**
 * Flush usage logs buffer
 * This would typically be called periodically to persist logs
 */
export async function flushUsageLogs(): Promise<void> {
	// In a real implementation, this would persist the buffered logs to a database
	// For now, we'll just clear the buffer
	usageLogsBuffer.length = 0;
}

/**
 * Get usage logs for an API key
 * @param apiKeyId The API key ID
 * @returns Array of usage logs
 */
export async function getUsageLogs(apiKeyId: string): Promise<UsageLog[]> {
	return usageLogsBuffer.filter((log) => log.apiKeyId === apiKeyId);
}

/**
 * Validate an API key
 * @param keyValue The API key value to validate
 * @returns Boolean indicating if the key is valid
 */
export async function validateApiKey(keyValue: string): Promise<boolean> {
	// Validate key format first
	if (!keyValue.startsWith("sk_live_")) {
		return false;
	}

	const apiKeyData = await getApiKeyByKey(keyValue);

	if (!apiKeyData) {
		return false;
	}

	// Check if the key has been revoked
	if (apiKeyData.revokedAt) {
		return false;
	}

	// Check if the key has expired
	if (apiKeyData.expiresAt && apiKeyData.expiresAt < new Date()) {
		return false;
	}

	// Update last used timestamp
	const apiKey = apiKeysStore.get(apiKeyData.id);
	if (apiKey) {
		apiKey.lastUsedAt = new Date();
		apiKeysStore.set(apiKeyData.id, apiKey);
	}

	return true;
}
