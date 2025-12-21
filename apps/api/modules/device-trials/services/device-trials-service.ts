/**
 * Device Trials Service - Handles device trial database operations
 *
 * Per C-002: All database queries go through service layer
 * Manages device fingerprint trials, abuse detection, and API key provisioning
 */

import { apiKeys, deviceTrials, user } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export interface DeviceTrial {
	id: string;
	deviceFingerprint: string;
	apiKeyId: string;
	userId: string | null;
	snapshotLimit: number | null;
	apiCallLimit: number | null;
	snapshotsUsed: number | null;
	apiCallsUsed: number | null;
	installCount: number | null;
	blockedUntil: Date | null;
	createdAt: Date;
	lastSeenAt: Date | null;
}

export interface TrialApiKey {
	id: string;
	key: string;
	keyPreview: string | null;
}

export interface DeviceUser {
	id: string;
	email: string;
	name: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Find existing device trial by fingerprint
 */
export async function findDeviceTrialByFingerprint(deviceFingerprint: string): Promise<DeviceTrial | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db
		.select()
		.from(deviceTrials)
		.where(eq(deviceTrials.deviceFingerprint, deviceFingerprint))
		.limit(1);

	return (result?.[0] as DeviceTrial) ?? null;
}

/**
 * Find device trial by API key ID
 */
export async function findDeviceTrialByApiKeyId(apiKeyId: string): Promise<DeviceTrial | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.select().from(deviceTrials).where(eq(deviceTrials.apiKeyId, apiKeyId)).limit(1);

	return (result?.[0] as DeviceTrial) ?? null;
}

/**
 * Find API key by value
 */
export async function findApiKeyByValue(keyValue: string): Promise<TrialApiKey | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.select().from(apiKeys).where(eq(apiKeys.key, keyValue)).limit(1);

	return (result?.[0] as TrialApiKey) ?? null;
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(apiKeyId: string): Promise<TrialApiKey | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.select().from(apiKeys).where(eq(apiKeys.id, apiKeyId)).limit(1);

	return (result?.[0] as TrialApiKey) ?? null;
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Update device trial status
 */
export async function updateDeviceTrial(
	trialId: string,
	updates: Partial<{
		installCount: number;
		blockedUntil: Date | null;
		lastSeenAt: Date;
	}>,
): Promise<void> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	await db.update(deviceTrials).set(updates).where(eq(deviceTrials.id, trialId));
}

/**
 * Create new trial API key
 */
export async function createTrialApiKey(deviceFingerprint: string): Promise<TrialApiKey> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const apiKeyValue = `snap_${nanoid(32)}`;
	const apiKeyPreview = `${apiKeyValue.slice(0, 12)}...`;
	const tempUserId = `device_${deviceFingerprint.slice(0, 16)}`;

	const result = await db
		.insert(apiKeys)
		.values({
			userId: tempUserId,
			key: apiKeyValue,
			keyPreview: apiKeyPreview,
			name: `Device Trial - ${deviceFingerprint.slice(0, 8)}`,
			expiresAt: null,
		})
		.returning();

	if (!result?.[0]) {
		throw new Error("Failed to create API key");
	}

	return {
		id: result[0].id,
		key: apiKeyValue,
		keyPreview: apiKeyPreview,
	};
}

/**
 * Create new device trial
 */
export async function createDeviceTrialRecord(deviceFingerprint: string, apiKeyId: string): Promise<DeviceTrial> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db
		.insert(deviceTrials)
		.values({
			deviceFingerprint,
			apiKeyId,
			snapshotLimit: 50,
			apiCallLimit: 10000,
			snapshotsUsed: 0,
			apiCallsUsed: 0,
			userId: null,
			installCount: 1,
			createdAt: new Date(),
			lastSeenAt: new Date(),
		})
		.returning();

	if (!result?.[0]) {
		throw new Error("Failed to create device trial");
	}

	return result[0] as DeviceTrial;
}

/**
 * Link device trial to user (upgrade trial)
 */
export async function linkDeviceTrialToUser(
	trialId: string,
	userId: string,
	upgradedSnapshotLimit = 1000,
): Promise<void> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	await db
		.update(deviceTrials)
		.set({
			userId,
			snapshotLimit: upgradedSnapshotLimit,
			convertedAt: new Date(),
			lastSeenAt: new Date(),
		})
		.where(eq(deviceTrials.id, trialId));
}

// ============================================================================
// User Query Functions
// ============================================================================

/**
 * Find user by ID
 */
export async function findUserById(userId: string): Promise<DeviceUser | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.select().from(user).where(eq(user.id, userId)).limit(1);

	if (!result?.[0]) {
		return null;
	}

	return {
		id: result[0].id,
		email: result[0].email,
		name: result[0].name,
		emailVerified: result[0].emailVerified ?? false,
		createdAt: result[0].createdAt,
		updatedAt: result[0].updatedAt,
	};
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<DeviceUser | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.select().from(user).where(eq(user.email, email)).limit(1);

	if (!result?.[0]) {
		return null;
	}

	return {
		id: result[0].id,
		email: result[0].email,
		name: result[0].name,
		emailVerified: result[0].emailVerified ?? false,
		createdAt: result[0].createdAt,
		updatedAt: result[0].updatedAt,
	};
}

/**
 * Create new user
 */
export async function createDeviceUser(email: string, name?: string): Promise<DeviceUser> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const userId = nanoid();
	const now = new Date();

	await db.insert(user).values({
		id: userId,
		email,
		name: name || email.split("@")[0],
		emailVerified: false,
		createdAt: now,
		updatedAt: now,
	});

	return {
		id: userId,
		email,
		name: name || email.split("@")[0],
		emailVerified: false,
		createdAt: now,
		updatedAt: now,
	};
}
