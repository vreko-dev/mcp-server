import type { apiKeys, deviceTrials } from "@snapback/platform";
import { eq, sql } from "drizzle-orm";

export interface DeviceTrialsDependencies {
	db: any; // Type as needed, preventing circular dep on platform types if possible, or use 'any' for now as per pragmatic approach
	deviceTrials: typeof deviceTrials;
	apiKeys: typeof apiKeys;
	nanoid: () => string;
	hash: (plain: string, options?: any) => Promise<string>;
}

/**
 * Device Trials Service
 *
 * Manages device trial creation, validation, and anti-abuse measures
 */

export class DeviceTrialsService {
	constructor(private dependencies?: DeviceTrialsDependencies) {}

	private async getDeps(): Promise<DeviceTrialsDependencies> {
		if (this.dependencies) {
			return this.dependencies;
		}

		const { db, deviceTrials, apiKeys } = await import("@snapback/platform");
		const { nanoid } = await import("nanoid");
		const { hash } = await import("@node-rs/argon2");

		this.dependencies = {
			db,
			deviceTrials,
			apiKeys,
			nanoid,
			hash,
		};

		return this.dependencies;
	}

	/**
	 * Get or create device trial
	 * @param deviceFingerprint Unique device identifier
	 * @returns Device trial info with API key
	 */
	async getOrCreateDeviceTrial(deviceFingerprint: string): Promise<{
		apiKey: string;
		trialInfo: any;
	}> {
		try {
			const { db, deviceTrials, apiKeys } = await this.getDeps();

			if (!db) {
				throw new Error("Database not available");
			}

			// Check if device trial exists
			const existingTrials = await db
				.select()
				.from(deviceTrials)
				.where(eq(deviceTrials.deviceFingerprint, deviceFingerprint));

			if (existingTrials.length > 0) {
				const existingTrial = existingTrials[0];
				if (!existingTrial) {
					throw new Error("Device trial not found");
				}

				// Check if device is blocked
				if (await this.isDeviceBlocked(existingTrial)) {
					throw new Error("Device trial has been blocked due to abuse");
				}

				// Increment install count
				const updatedTrial = await db
					.update(deviceTrials)
					.set({
						installCount: sql`${deviceTrials.installCount} + 1`,
					})
					.where(eq(deviceTrials.id, existingTrial.id))
					.returning();

				if (updatedTrial.length === 0) {
					throw new Error("Failed to update device trial");
				}

				// Return existing API key
				const apiKeyResult = await db
					.select()
					.from(apiKeys)
					.where(eq(apiKeys.id, existingTrial.apiKeyId));

				if (apiKeyResult.length === 0) {
					throw new Error("API key not found for existing trial");
				}

				const apiKey = apiKeyResult[0];
				if (!apiKey) {
					throw new Error("API key not found for existing trial");
				}

				const trialInfo = updatedTrial[0];
				if (!trialInfo) {
					throw new Error("Failed to update device trial");
				}

				return {
					apiKey: apiKey.key, // This should be the raw key, not the hashed one
					trialInfo,
				};
			}

			// Create new device trial
			return await this.createDeviceTrial(deviceFingerprint);
		} catch (error) {
			console.error("Error in getOrCreateDeviceTrial", {
				error,
				deviceFingerprint,
			});
			throw error;
		}
	}

	/**
	 * Create new device trial
	 * @param deviceFingerprint Unique device identifier
	 * @returns Device trial info with API key
	 */
	private async createDeviceTrial(deviceFingerprint: string): Promise<{
		apiKey: string;
		trialInfo: any;
	}> {
		try {
			const { db, apiKeys, deviceTrials } = await this.getDeps();

			if (!db) {
				throw new Error("Database not available");
			}

			// Generate API key
			const { rawKey, hashedKey, keyPreview } = await this.generateApiKey();

			// Create API key record
			const newApiKeyResult = await db
				.insert(apiKeys)
				.values({
					userId: `device_${deviceFingerprint}`,
					name: "Device Trial Key",
					key: hashedKey,
					keyPreview: keyPreview,
					permissions: {
						maxSnapshots: 50,
						cloudBackup: false,
						advancedDetection: false,
						customRules: false,
						teamSharing: false,
					},
				})
				.returning();

			if (newApiKeyResult.length === 0) {
				throw new Error("Failed to create API key");
			}
			const newApiKey = newApiKeyResult[0];
			if (!newApiKey) {
				throw new Error("Failed to create API key");
			}

			// Create device trial record
			const newDeviceTrialResult = await db
				.insert(deviceTrials)
				.values({
					deviceFingerprint,
					apiKeyId: newApiKey.id,
					snapshotsUsed: 0,
					apiCallsUsed: 0,
					snapshotLimit: 50,
					apiCallLimit: 10000,
					installCount: 1,
					lastSeenAt: new Date(),
					createdAt: new Date(),
				})
				.returning();

			if (newDeviceTrialResult.length === 0) {
				throw new Error("Failed to create device trial");
			}
			const newDeviceTrial = newDeviceTrialResult[0];
			if (!newDeviceTrial) {
				throw new Error("Failed to create device trial");
			}

			return {
				apiKey: rawKey,
				trialInfo: newDeviceTrial,
			};
		} catch (error) {
			console.error("Error in createDeviceTrial", {
				error,
				deviceFingerprint,
			});
			throw error;
		}
	}

	/**
	 * Check if device is blocked
	 * @param deviceTrial Device trial record
	 * @returns True if device is blocked
	 */
	private async isDeviceBlocked(deviceTrial: any): Promise<boolean> {
		const { db, deviceTrials } = await this.getDeps();

		if (!db) {
			return true; // If database is not available, treat as blocked
		}

		const now = new Date();

		// Check if install count exceeds limit
		if (deviceTrial.installCount >= 3) {
			// Block for 24 hours
			const blockedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

			await db
				.update(deviceTrials)
				.set({ blockedUntil })
				.where(eq(deviceTrials.id, deviceTrial.id));

			return true;
		}

		// Check if currently blocked
		if (deviceTrial.blockedUntil && deviceTrial.blockedUntil > now) {
			return true;
		}

		return false;
	}

	/**
	 * Link device to user on conversion
	 * @param deviceFingerprint Device fingerprint
	 * @param userId User ID
	 * @returns Updated device trial info
	 */
	async linkDeviceToUser(
		deviceFingerprint: string,
		userId: string,
	): Promise<any> {
		try {
			const { db, deviceTrials, apiKeys } = await this.getDeps();

			if (!db) {
				throw new Error("Database not available");
			}

			// Find device trial
			const deviceTrialsResult = await db
				.select()
				.from(deviceTrials)
				.where(eq(deviceTrials.deviceFingerprint, deviceFingerprint));

			if (deviceTrialsResult.length === 0) {
				throw new Error("Device trial not found");
			}

			const deviceTrial = deviceTrialsResult[0];
			if (!deviceTrial) {
				throw new Error("Device trial not found");
			}

			// Check if already linked to different user
			if (deviceTrial.userId && deviceTrial.userId !== userId) {
				throw new Error("Device already linked to different user");
			}

			// Update device trial with user ID and conversion info
			const [updatedTrial] = await db
				.update(deviceTrials)
				.set({
					userId,
					snapshotLimit: 1000, // Increase limit on conversion
				})
				.where(eq(deviceTrials.id, deviceTrial.id))
				.returning();

			// Update API key user ID
			await db
				.update(apiKeys)
				.set({ userId })
				.where(eq(apiKeys.id, deviceTrial.apiKeyId));

			return updatedTrial;
		} catch (error) {
			console.error("Error in linkDeviceToUser", {
				error,
				deviceFingerprint,
				userId,
			});
			throw error;
		}
	}

	/**
	 * Generate secure API key
	 * @returns Generated API key components
	 */
	private async generateApiKey(): Promise<{
		rawKey: string;
		hashedKey: string;
		keyPreview: string;
	}> {
		const { nanoid, hash } = await this.getDeps();
		const rawKey = `sb_${nanoid()}${nanoid()}`;
		const keyPreview = rawKey.substring(0, 8);
		const hashedKey = await hash(rawKey, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1,
		});

		return { rawKey, hashedKey, keyPreview };
	}
}
