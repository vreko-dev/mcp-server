/**
 * Device Trial Service
 *
 * Manages device trial creation, quota validation, and abuse detection.
 * Implements the anonymous → email → paid progressive funnel.
 *
 * TDD Status: REFACTOR phase - Type safety & documentation
 *
 * @module DeviceTrialService
 * @package @snapback/core
 */

import { logger } from "@snapback/infrastructure";
import { apiKeys, deviceTrials } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { DEVICE_TRIAL_CONSTANTS } from "./device-trials.constants";

/**
 * Error codes for device trial operations
 */
export enum DeviceTrialErrorCode {
	INVALID_FINGERPRINT = "INVALID_FINGERPRINT",
	DUPLICATE_DEVICE = "DUPLICATE_DEVICE",
	DEVICE_BLOCKED = "DEVICE_BLOCKED",
	QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
	DATABASE_ERROR = "DATABASE_ERROR",
	INVALID_API_KEY = "INVALID_API_KEY",
}

/**
 * Base error class for device trial operations
 * Provides structured error handling with code and context
 */
export class DeviceTrialErrorBase extends Error {
	constructor(
		public readonly code: DeviceTrialErrorCode,
		message: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "DeviceTrialError";
	}
}

/**
 * Thrown when fingerprint validation fails
 */
export class InvalidFingerprintError extends DeviceTrialErrorBase {
	constructor(message: string, context?: Record<string, unknown>) {
		super(DeviceTrialErrorCode.INVALID_FINGERPRINT, message, context);
		this.name = "InvalidFingerprintError";
	}
}

/**
 * Thrown when device is blocked due to abuse
 */
export class DeviceBlockedError extends DeviceTrialErrorBase {
	constructor(
		message: string,
		public readonly blockedUntil: Date,
		context?: Record<string, unknown>,
	) {
		super(DeviceTrialErrorCode.DEVICE_BLOCKED, message, {
			blockedUntil: blockedUntil.toISOString(),
			...context,
		});
		this.name = "DeviceBlockedError";
	}
}

/**
 * Thrown when database operation fails
 */
export class DeviceTrialDatabaseError extends DeviceTrialErrorBase {
	constructor(message: string, cause?: Error, context?: Record<string, unknown>) {
		super(DeviceTrialErrorCode.DATABASE_ERROR, message, {
			cause: cause?.message,
			...context,
		});
		this.name = "DeviceTrialDatabaseError";
	}
}

/**
 * Result type for operations
 */
type Result<T, E = DeviceTrialErrorBase> = { success: true; value: T } | { success: false; error: E };

/**
 * Device trial data returned after successful trial creation
 */
export interface DeviceTrialData {
	id: string;
	deviceFingerprint: string;
	apiKeyId: string;
	apiKey: string;
	apiKeyPreview: string;
	snapshotLimit: number;
	apiCallLimit: number;
	snapshotsUsed: number;
	apiCallsUsed: number;
	trialStage: "anonymous" | "email" | "paid";
	installCount: number;
	blockedUntil: Date | null;
	createdAt: Date;
}

/**
 * Type guard for checking if error is a device trial error
 */
export function isDeviceTrialError(error: unknown): error is DeviceTrialErrorBase {
	return error instanceof DeviceTrialErrorBase;
}

/**
 * Device Trial Service
 *
 * Handles all device trial operations:
 * - Trial creation and validation
 * - Quota management
 * - Abuse detection and blocking
 * - Device-to-user linking
 */
export class DeviceTrialService {
	constructor(private db: any) {
		if (!db) {
			throw new Error("Database instance is required");
		}
	}

	/**
	 * Validate fingerprint format and length
	 *
	 * @param fingerprint - Device fingerprint to validate
	 * @returns Success with undefined or error if validation fails
	 *
	 * Validation rules:
	 * - Cannot be empty
	 * - Must be 16-1024 characters
	 * - Must contain only alphanumeric characters
	 */
	private validateFingerprint(fingerprint: string): Result<void> {
		// Check if empty
		if (!fingerprint || fingerprint.length === 0) {
			const error = new InvalidFingerprintError("Fingerprint cannot be empty");
			logger.warn("Device trial validation failed", {
				code: error.code,
				reason: "empty_fingerprint",
			});
			return { success: false, error };
		}

		// Check minimum length
		if (fingerprint.length < DEVICE_TRIAL_CONSTANTS.MIN_FINGERPRINT_LENGTH) {
			const error = new InvalidFingerprintError(
				`Fingerprint must be at least ${DEVICE_TRIAL_CONSTANTS.MIN_FINGERPRINT_LENGTH} characters`,
				{ minLength: DEVICE_TRIAL_CONSTANTS.MIN_FINGERPRINT_LENGTH, actual: fingerprint.length },
			);
			logger.warn("Device trial validation failed", {
				code: error.code,
				reason: "fingerprint_too_short",
				minLength: DEVICE_TRIAL_CONSTANTS.MIN_FINGERPRINT_LENGTH,
				actual: fingerprint.length,
			});
			return { success: false, error };
		}

		// Check maximum length
		if (fingerprint.length > DEVICE_TRIAL_CONSTANTS.MAX_FINGERPRINT_LENGTH) {
			const error = new InvalidFingerprintError(
				`Fingerprint must be at most ${DEVICE_TRIAL_CONSTANTS.MAX_FINGERPRINT_LENGTH} characters`,
				{ maxLength: DEVICE_TRIAL_CONSTANTS.MAX_FINGERPRINT_LENGTH, actual: fingerprint.length },
			);
			logger.warn("Device trial validation failed", {
				code: error.code,
				reason: "fingerprint_too_long",
				maxLength: DEVICE_TRIAL_CONSTANTS.MAX_FINGERPRINT_LENGTH,
				actual: fingerprint.length,
			});
			return { success: false, error };
		}

		// Check format (alphanumeric only)
		if (!/^[a-zA-Z0-9]+$/.test(fingerprint)) {
			const error = new InvalidFingerprintError("Fingerprint must contain only alphanumeric characters");
			logger.warn("Device trial validation failed", {
				code: error.code,
				reason: "invalid_fingerprint_format",
			});
			return { success: false, error };
		}

		return { success: true, value: undefined };
	}

	/**
	 * Generate a new API key for device trial
	 */
	private generateApiKey(): { key: string; preview: string } {
		const key = `${DEVICE_TRIAL_CONSTANTS.API_KEY_PREFIX}_${nanoid(DEVICE_TRIAL_CONSTANTS.API_KEY_LENGTH)}`;
		const preview = `${key.slice(0, 12)}...`;
		return { key, preview };
	}

	/**
	 * Create a new device trial
	 *
	 * Handles new device trials and returning devices with rate limit checking.
	 * Implements progressive funnel (anonymous → email → paid).
	 *
	 * @param fingerprint Device fingerprint (must be validated)
	 * @returns Result with trial data or error
	 *
	 * @example
	 * ```typescript
	 * const result = await service.createDeviceTrial("abc123def456...");
	 * if (result.success) {
	 *   console.log("Trial created:", result.value.id);
	 *   console.log("API Key:", result.value.apiKeyPreview);
	 * } else {
	 *   console.error("Trial creation failed:", result.error.message);
	 * }
	 * ```
	 */
	async createDeviceTrial(fingerprint: string): Promise<Result<DeviceTrialData>> {
		// Validate fingerprint
		const validationResult = this.validateFingerprint(fingerprint);
		if (!validationResult.success) {
			return validationResult;
		}

		try {
			// Check for existing trial
			const existingTrials = await this.db
				.select()
				.from(deviceTrials)
				.where(eq(deviceTrials.deviceFingerprint, fingerprint))
				.limit(1);

			if (existingTrials && existingTrials.length > 0) {
				const trial = existingTrials[0];

				// Check if device is blocked
				if (trial.blockedUntil && trial.blockedUntil.getTime() > Date.now()) {
					const error = new DeviceBlockedError(
						"Device is temporarily blocked due to excessive reinstalls",
						trial.blockedUntil,
					);
					logger.warn("Device trial creation blocked", {
						code: error.code,
						deviceId: trial.id,
						blockedUntil: trial.blockedUntil.toISOString(),
					});
					return { success: false, error };
				}

				// Handle block expiration
				if (trial.blockedUntil && trial.blockedUntil.getTime() <= Date.now()) {
					const updatedInstallCount = (trial.installCount || 1) + 1;

					await this.db
						.update(deviceTrials)
						.set({
							blockedUntil: null,
							installCount: updatedInstallCount,
							lastSeenAt: new Date(),
						})
						.where(eq(deviceTrials.id, trial.id));

					logger.info("Device trial block expired", {
						deviceId: trial.id,
						installCount: updatedInstallCount,
					});
					return this.getTrialWithApiKey(trial.id);
				}

				// Increment install count and check for abuse
				const newInstallCount = (trial.installCount || 1) + 1;

				if (newInstallCount > DEVICE_TRIAL_CONSTANTS.MAX_INSTALLS_IN_24H) {
					const hoursSinceCreation = (Date.now() - trial.createdAt.getTime()) / (1000 * 60 * 60);

					if (hoursSinceCreation < 24) {
						// Block device
						const blockedUntil = new Date(Date.now() + DEVICE_TRIAL_CONSTANTS.BLOCK_DURATION_MS);

						await this.db
							.update(deviceTrials)
							.set({
								installCount: newInstallCount,
								blockedUntil,
							})
							.where(eq(deviceTrials.id, trial.id));

						const error = new DeviceBlockedError(
							"Too many reinstalls detected. Device temporarily blocked.",
							blockedUntil,
							{ installCount: newInstallCount },
						);
						logger.error("Device trial abuse detected", {
							code: error.code,
							deviceId: trial.id,
							installCount: newInstallCount,
							blockedUntil: blockedUntil.toISOString(),
						});
						return { success: false, error };
					}
				}

				// Update trial
				await this.db
					.update(deviceTrials)
					.set({
						installCount: newInstallCount,
						lastSeenAt: new Date(),
					})
					.where(eq(deviceTrials.id, trial.id));

				logger.debug("Device trial updated", { deviceId: trial.id, installCount: newInstallCount });
				return this.getTrialWithApiKey(trial.id);
			}

			// Create new trial
			return this.createNewTrial(fingerprint);
		} catch (error) {
			const dbError = new DeviceTrialDatabaseError(
				"Failed to create device trial",
				error instanceof Error ? error : undefined,
			);
			logger.error("Device trial creation database error", {
				code: dbError.code,
				cause: dbError.context?.cause,
			});
			return { success: false, error: dbError };
		}
	}

	/**
	 * Create a brand new device trial (first install)
	 *
	 * Generates API key, creates trial record, and initializes with anonymous quotas.
	 *
	 * @param fingerprint Device fingerprint
	 * @returns Result with new trial data or error
	 *
	 * @private Internal helper - called by createDeviceTrial
	 */
	private async createNewTrial(fingerprint: string): Promise<Result<DeviceTrialData>> {
		try {
			// Generate API key
			const { key: apiKeyValue, preview: apiKeyPreview } = this.generateApiKey();

			// Create temporary user ID for device trial
			const tempUserId = `device_${fingerprint.slice(0, 16)}`;

			// Insert API key
			const apiKeyResult = await this.db
				.insert(apiKeys)
				.values({
					userId: tempUserId,
					key: apiKeyValue,
					keyPreview: apiKeyPreview,
					name: `Device Trial - ${fingerprint.slice(0, 8)}`,
					expiresAt: null,
				})
				.returning();

			const newApiKey = apiKeyResult && apiKeyResult.length > 0 ? apiKeyResult[0] : null;

			if (!newApiKey) {
				const error = new DeviceTrialDatabaseError("Failed to generate API key");
				logger.error("Device trial API key creation failed", { code: error.code });
				return { success: false, error };
			}

			// Insert device trial
			const trialResult = await this.db
				.insert(deviceTrials)
				.values({
					deviceFingerprint: fingerprint,
					apiKeyId: newApiKey.id,
					snapshotLimit: DEVICE_TRIAL_CONSTANTS.ANONYMOUS_SNAPSHOT_LIMIT,
					apiCallLimit: DEVICE_TRIAL_CONSTANTS.ANONYMOUS_API_CALL_LIMIT,
					snapshotsUsed: 0,
					apiCallsUsed: 0,
					userId: null,
					installCount: 1,
					blockedUntil: null,
					createdAt: new Date(),
					lastSeenAt: new Date(),
				})
				.returning();

			const trial = trialResult && trialResult.length > 0 ? trialResult[0] : null;

			if (!trial) {
				const error = new DeviceTrialDatabaseError("Failed to create device trial record");
				logger.error("Device trial record creation failed", { code: error.code });
				return { success: false, error };
			}

			logger.info("New device trial created", {
				deviceId: trial.id,
				apiKeyPreview,
				quota: DEVICE_TRIAL_CONSTANTS.ANONYMOUS_SNAPSHOT_LIMIT,
			});

			return {
				success: true,
				value: {
					id: trial.id,
					deviceFingerprint: trial.deviceFingerprint,
					apiKeyId: newApiKey.id,
					apiKey: apiKeyValue,
					apiKeyPreview,
					snapshotLimit: trial.snapshotLimit,
					apiCallLimit: trial.apiCallLimit,
					snapshotsUsed: 0,
					apiCallsUsed: 0,
					trialStage: "anonymous",
					installCount: 1,
					blockedUntil: null,
					createdAt: trial.createdAt,
				},
			};
		} catch (error) {
			const dbError = new DeviceTrialDatabaseError(
				"Failed to create device trial",
				error instanceof Error ? error : undefined,
			);
			logger.error("Device trial creation database error", {
				code: dbError.code,
				cause: dbError.context?.cause,
			});
			return { success: false, error: dbError };
		}
	}

	/**
	 * Get trial with API key populated
	 *
	 * Retrieves trial data and associated API key in a single operation.
	 *
	 * @param trialId Trial ID
	 * @returns Result with trial data including API key or error
	 *
	 * @private Internal helper - used to return full trial data
	 */
	private async getTrialWithApiKey(trialId: string): Promise<Result<DeviceTrialData>> {
		try {
			const trialResult = await this.db.select().from(deviceTrials).where(eq(deviceTrials.id, trialId)).limit(1);

			if (!trialResult || trialResult.length === 0) {
				const error = new DeviceTrialDatabaseError("Trial not found");
				logger.warn("Device trial lookup failed", { code: error.code, trialId });
				return { success: false, error };
			}

			const trial = trialResult[0];

			// Get API key
			const apiKeyResult = await this.db.select().from(apiKeys).where(eq(apiKeys.id, trial.apiKeyId)).limit(1);

			const apiKey = apiKeyResult && apiKeyResult.length > 0 ? apiKeyResult[0] : null;

			if (!apiKey) {
				const error = new DeviceTrialDatabaseError("API key not found");
				logger.error("Device trial API key lookup failed", { code: error.code, trialId });
				return { success: false, error };
			}

			return {
				success: true,
				value: {
					id: trial.id,
					deviceFingerprint: trial.deviceFingerprint,
					apiKeyId: trial.apiKeyId,
					apiKey: apiKey.key,
					apiKeyPreview: apiKey.keyPreview,
					snapshotLimit: trial.snapshotLimit,
					apiCallLimit: trial.apiCallLimit,
					snapshotsUsed: trial.snapshotsUsed || 0,
					apiCallsUsed: trial.apiCallsUsed || 0,
					trialStage: trial.userId ? "email" : "anonymous",
					installCount: trial.installCount || 1,
					blockedUntil: trial.blockedUntil || null,
					createdAt: trial.createdAt,
				},
			};
		} catch (error) {
			const dbError = new DeviceTrialDatabaseError(
				"Failed to retrieve trial",
				error instanceof Error ? error : undefined,
			);
			logger.error("Device trial retrieval database error", {
				code: dbError.code,
				cause: dbError.context?.cause,
			});
			return { success: false, error: dbError };
		}
	}

	/**
	 * Validate device quota availability
	 *
	 * Checks if device has remaining quota for snapshots and API calls.
	 * Used before operations to ensure user hasn't exceeded trial limits.
	 *
	 * @param fingerprint Device fingerprint
	 * @returns Result with { hasQuota: boolean } indicating if usage is available
	 *
	 * @example
	 * ```typescript
	 * const result = await service.validateQuota(fingerprint);
	 * if (result.success && result.value.hasQuota) {
	 *   // Proceed with snapshot creation
	 * }
	 * ```
	 */
	async validateQuota(fingerprint: string): Promise<Result<{ hasQuota: boolean }>> {
		try {
			const trials = await this.db
				.select()
				.from(deviceTrials)
				.where(eq(deviceTrials.deviceFingerprint, fingerprint))
				.limit(1);

			if (!trials || trials.length === 0) {
				logger.debug("Device trial not found for quota check", { fingerprint });
				return {
					success: true,
					value: { hasQuota: false },
				};
			}

			const trial = trials[0];

			// Check snapshots quota
			const snapshotsAvailable = trial.snapshotsUsed < trial.snapshotLimit;

			// Check API calls quota
			const apiCallsAvailable = trial.apiCallsUsed < trial.apiCallLimit;

			const hasQuota = snapshotsAvailable && apiCallsAvailable;

			if (!hasQuota) {
				logger.warn("Device trial quota exhausted", {
					trialId: trial.id,
					snapshotsUsed: trial.snapshotsUsed,
					snapshotLimit: trial.snapshotLimit,
					apiCallsUsed: trial.apiCallsUsed,
					apiCallLimit: trial.apiCallLimit,
				});
			}

			return {
				success: true,
				value: { hasQuota },
			};
		} catch (error) {
			const dbError = new DeviceTrialDatabaseError(
				"Failed to validate quota",
				error instanceof Error ? error : undefined,
			);
			logger.error("Device trial quota validation database error", {
				code: dbError.code,
				cause: dbError.context?.cause,
			});
			return { success: false, error: dbError };
		}
	}

	/**
	 * Link device trial to user account (conversion)
	 *
	 * Called when anonymous device trial user signs up with email.
	 * Transitions trial to "email" stage and increases quotas.
	 *
	 * @param fingerprint Device fingerprint
	 * @param userId User account ID from authentication provider
	 * @returns Result with { linked: boolean } indicating conversion success
	 *
	 * @example
	 * ```typescript
	 * const result = await service.linkDeviceToUser(fingerprint, userId);
	 * if (result.success && result.value.linked) {
	 *   console.log("Trial converted to email tier");
	 * }
	 * ```
	 */
	async linkDeviceToUser(fingerprint: string, userId: string): Promise<Result<{ linked: boolean }>> {
		try {
			const trials = await this.db
				.select()
				.from(deviceTrials)
				.where(eq(deviceTrials.deviceFingerprint, fingerprint))
				.limit(1);

			if (!trials || trials.length === 0) {
				const error = new DeviceTrialDatabaseError("Trial not found");
				logger.warn("Device trial not found for linking", { code: error.code, fingerprint, userId });
				return { success: false, error };
			}

			const trial = trials[0];

			// Update trial to link user and increase quota
			await this.db
				.update(deviceTrials)
				.set({
					userId,
					convertedAt: new Date(),
					snapshotLimit: DEVICE_TRIAL_CONSTANTS.CONVERTED_SNAPSHOT_LIMIT,
					apiCallLimit: DEVICE_TRIAL_CONSTANTS.CONVERTED_API_CALL_LIMIT,
				})
				.where(eq(deviceTrials.id, trial.id));

			logger.info("Device trial converted to email tier", {
				trialId: trial.id,
				userId,
				snapshotLimit: DEVICE_TRIAL_CONSTANTS.CONVERTED_SNAPSHOT_LIMIT,
			});

			return {
				success: true,
				value: { linked: true },
			};
		} catch (error) {
			const dbError = new DeviceTrialDatabaseError(
				"Failed to link device to user",
				error instanceof Error ? error : undefined,
			);
			logger.error("Device trial linking database error", {
				code: dbError.code,
				cause: dbError.context?.cause,
			});
			return { success: false, error: dbError };
		}
	}
}
