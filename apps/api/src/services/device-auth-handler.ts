import { createId } from "@paralleldrive/cuid2";
import { logger } from "@snapback/infrastructure";
import type { DeviceAuthCode } from "@snapback/platform/db/schema/snapback";
import { deviceAuthCodes } from "@snapback/platform/db/schema/snapback";
import { eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Device Auth Device Code Response
 * RFC 8628 device authorization grant response
 */
export interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number; // 900 seconds = 15 minutes
	interval: number; // polling interval in seconds
}

/**
 * Device Token Poll Response (while waiting for user approval)
 */
export interface DeviceTokenPendingResponse {
	error: "authorization_pending";
}

/**
 * Device Token Poll Response (after user approval)
 */
export interface DeviceTokenSuccessResponse {
	api_key: string;
	user_id: string;
	tier: string; // subscription tier
	expires_at?: number; // unix timestamp
}

export type DeviceTokenResponse = DeviceTokenPendingResponse | DeviceTokenSuccessResponse;

/**
 * DeviceAuthHandler
 * Implements RFC 8628 Device Authorization Grant Flow for VS Code extension
 * Allows the extension to authenticate without requiring HTTP callbacks
 */
export class DeviceAuthHandler {
	private readonly DEVICE_CODE_EXPIRES_IN = 900; // 15 minutes
	private readonly POLLING_INTERVAL = 5; // 5 seconds
	private readonly VERIFICATION_URI = "https://snapback.dev/auth/device";

	constructor(private db: PgDatabase) {}

	/**
	 * Request device code
	 * VS Code extension calls this first
	 * Returns device_code, user_code, and verification_uri
	 */
	async requestDeviceCode(clientId = "vscode-extension"): Promise<DeviceCodeResponse> {
		try {
			// Generate codes
			const deviceCode = this.generateCode(32); // longer for device code
			const userCode = this.generateUserCode(8); // shorter for user to type

			const expiresAt = new Date(Date.now() + this.DEVICE_CODE_EXPIRES_IN * 1000);

			const result = await this.db
				.insert(deviceAuthCodes)
				.values({
					deviceCode,
					userCode,
					clientId,
					verificationUri: this.VERIFICATION_URI,
					expiresAt,
					approved: "false",
				})
				.returning();

			const record = result[0];

			logger.info("Device code requested", {
				clientId,
				userCode,
				expiresAt,
			});

			return {
				device_code: record.deviceCode,
				user_code: record.userCode,
				verification_uri: record.verificationUri,
				expires_in: this.DEVICE_CODE_EXPIRES_IN,
				interval: this.POLLING_INTERVAL,
			};
		} catch (error) {
			logger.error("Failed to request device code", {
				clientId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Poll for device token
	 * VS Code extension calls this periodically while waiting for user approval
	 * Returns authorization_pending while waiting, or api_key when approved
	 */
	async pollDeviceToken(deviceCode: string): Promise<DeviceTokenResponse> {
		try {
			// Check if device code exists and hasn't expired
			const record = await this.db
				.select()
				.from(deviceAuthCodes)
				.where(eq(deviceAuthCodes.deviceCode, deviceCode))
				.limit(1)
				.then((r) => r[0]);

			if (!record) {
				logger.warn("Device code not found", { deviceCode });
				return { error: "authorization_pending" };
			}

			// Check if expired
			if (record.expiresAt && new Date() > record.expiresAt) {
				logger.warn("Device code expired", { deviceCode });
				return { error: "authorization_pending" };
			}

			// Check if approved
			if (record.approved === "true" && record.userId) {
				logger.info("Device auth approved, returning API key", {
					deviceCode,
					userId: record.userId,
				});

				// In a real implementation, you would:
				// 1. Generate an API key
				// 2. Store it in the api_keys table
				// 3. Return it here

				return {
					api_key: `sk_live_${createId()}`, // Placeholder
					user_id: record.userId,
					tier: "free", // Would come from user's subscription tier
				};
			}

			// Still waiting for approval
			return { error: "authorization_pending" };
		} catch (error) {
			logger.error("Failed to poll device token", {
				deviceCode,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * User approves device auth in browser
	 * Backend calls this after user authenticates and approves
	 */
	async approveDeviceAuth(userCode: string, userId: string): Promise<DeviceAuthCode | null> {
		try {
			// Find device code by user code
			const existing = await this.db
				.select()
				.from(deviceAuthCodes)
				.where(eq(deviceAuthCodes.userCode, userCode))
				.limit(1)
				.then((r) => r[0]);

			if (!existing) {
				logger.warn("User code not found", { userCode });
				return null;
			}

			// Update to approved
			const result = await this.db
				.update(deviceAuthCodes)
				.set({
					userId,
					approved: "true",
					approvedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(deviceAuthCodes.userCode, userCode))
				.returning();

			logger.info("Device auth approved", {
				userCode,
				userId,
				deviceCode: result[0]?.deviceCode,
			});

			return result[0] || null;
		} catch (error) {
			logger.error("Failed to approve device auth", {
				userCode,
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Reject or cancel device auth
	 */
	async rejectDeviceAuth(userCode: string): Promise<boolean> {
		try {
			const result = await this.db
				.delete(deviceAuthCodes)
				.where(eq(deviceAuthCodes.userCode, userCode))
				.returning();

			logger.info("Device auth rejected", { userCode });
			return result.length > 0;
		} catch (error) {
			logger.error("Failed to reject device auth", {
				userCode,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Clean up expired device codes (run periodically via cron)
	 */
	async cleanupExpiredCodes(): Promise<number> {
		try {
			const now = new Date();

			const result = await this.db
				.delete(deviceAuthCodes)
				.where((table) => {
					// Delete expired and unapproved codes
					return table.expiresAt && new Date(table.expiresAt) < now && table.approved === "false";
				})
				.returning();

			logger.info("Expired device codes cleaned up", { count: result.length });
			return result.length;
		} catch (error) {
			logger.error("Failed to cleanup expired codes", {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Verify user code format (XXXX-XXXX)
	 */
	isValidUserCodeFormat(userCode: string): boolean {
		// Format: XXXX-XXXX (8 chars + hyphen + 4 chars)
		return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode);
	}

	/**
	 * Generate a random device code
	 */
	private generateCode(length: number): string {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let result = "";
		for (let i = 0; i < length; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	/**
	 * Generate user code in format XXXX-XXXX (e.g., "ABCD-1234")
	 */
	private generateUserCode(totalLength: number): string {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		const half = Math.floor(totalLength / 2);
		let code1 = "";
		let code2 = "";

		for (let i = 0; i < half; i++) {
			code1 += chars.charAt(Math.floor(Math.random() * chars.length));
			code2 += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		return `${code1}-${code2}`;
	}
}
