/**
 * Cloud Backup Service
 *
 * Manages S3 backup operations for snapshots.
 * Uses CloudBackupService from SDK with proper error handling and logging.
 *
 * Architecture: Service layer that wraps SDK CloudBackupService
 * Used by: apps/api/modules/snapshots/procedures/create-snapshot.ts
 */

import type { Snapshot } from "@snapback/contracts";
import { logger } from "@snapback/infrastructure";

/**
 * Cloud backup configuration
 * TODO: Move to @snapback/contracts when feature is complete
 */
export interface CloudBackupConfig {
	region: string;
	bucket: string;
	enabled: boolean;
}

/**
 * Upload result from S3 operations
 * TODO: Move to @snapback/contracts when feature is complete
 */
export interface UploadResult {
	success: boolean;
	s3Key?: string;
	checksum?: string;
	error?: string;
}

/**
 * Cloud Backup Service (stub)
 * TODO: Implement in @snapback/sdk when feature is ready
 */
export class CloudBackupService {
	private readonly config: CloudBackupConfig;

	constructor(config: CloudBackupConfig) {
		this.config = config;
		logger.debug("CloudBackupService initialized (stub)", { config });
	}

	async upload(_snapshot: Snapshot, _userId: string): Promise<UploadResult> {
		// Stub implementation - feature not yet complete
		return { success: false, error: "Feature not implemented" };
	}

	async exists(_snapshotId: string, _userId: string): Promise<boolean> {
		// Stub implementation - feature not yet complete
		return false;
	}

	async getPresignedUrl(_snapshotId: string, _userId: string): Promise<string | null> {
		// Stub implementation - feature not yet complete
		return null;
	}
}

/**
 * Error types for cloud backup operations
 */
export class CloudBackupError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "CloudBackupError";
	}
}

/**
 * Result type for cloud backup operations
 */
export type CloudBackupResult<T> = { success: true; data: T } | { success: false; error: CloudBackupError };

/**
 * Cloud Backup Service
 * Handles S3 backup operations with proper error handling and observability
 */
export class CloudBackupOperations {
	private service: CloudBackupService | null = null;
	private config: CloudBackupConfig;

	constructor() {
		// Initialize configuration from environment
		this.config = {
			region: process.env.AWS_REGION || "us-east-1",
			bucket: process.env.S3_BACKUP_BUCKET || "snapback-backups",
			enabled: process.env.CLOUD_BACKUP_ENABLED === "true",
		};

		// Instantiate SDK service if enabled
		if (this.config.enabled) {
			try {
				this.service = new CloudBackupService(this.config);
				logger.info("Cloud backup service initialized", {
					region: this.config.region,
					bucket: this.config.bucket,
					enabled: true,
				});
			} catch (error) {
				logger.error("Failed to initialize cloud backup service", {
					error: error instanceof Error ? error.message : String(error),
					region: this.config.region,
					bucket: this.config.bucket,
				});
			}
		} else {
			logger.info("Cloud backup disabled via configuration", {
				CLOUD_BACKUP_ENABLED: process.env.CLOUD_BACKUP_ENABLED,
			});
		}
	}

	/**
	 * Upload snapshot to S3
	 *
	 * PHASE 1 RED: This method is called but not yet fully integrated
	 * PHASE 2 GREEN: Will be called from create-snapshot.ts after permission check
	 *
	 * @param snapshot - Snapshot data to upload
	 * @param userId - User ID for S3 key structure
	 * @returns Result with S3 key and checksum on success
	 */
	async uploadSnapshot(
		snapshot: Snapshot,
		userId: string,
	): Promise<CloudBackupResult<{ s3Key: string; checksum: string }>> {
		// Check if service is available
		if (!this.service || !this.config.enabled) {
			logger.debug("Cloud backup not enabled, skipping upload", {
				snapshotId: snapshot.id,
				userId,
			});

			return {
				success: false,
				error: new CloudBackupError("Cloud backup not enabled", "DISABLED"),
			};
		}

		try {
			// Call SDK service to upload
			const result: UploadResult = await this.service.upload(snapshot, userId);

			if (!result.success) {
				logger.warn("S3 upload failed", {
					snapshotId: snapshot.id,
					userId,
					error: result.error,
				});

				return {
					success: false,
					error: new CloudBackupError(`S3 upload failed: ${result.error}`, "S3_ERROR", {
						original_error: result.error,
					}),
				};
			}

			logger.info("Snapshot uploaded to S3 successfully", {
				snapshotId: snapshot.id,
				userId,
				s3Key: result.s3Key,
				checksum: result.checksum,
			});

			return {
				success: true,
				data: {
					s3Key: result.s3Key || "",
					checksum: result.checksum || "",
				},
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);

			logger.error("Unexpected error during S3 upload", {
				snapshotId: snapshot.id,
				userId,
				error: errorMsg,
				stack: error instanceof Error ? error.stack : undefined,
			});

			return {
				success: false,
				error: new CloudBackupError(`Unexpected upload error: ${errorMsg}`, "UNEXPECTED_ERROR", {
					original_error: errorMsg,
				}),
			};
		}
	}

	/**
	 * Check if snapshot exists in S3
	 *
	 * @param snapshotId - Snapshot ID to check
	 * @param userId - User ID
	 * @returns true if snapshot exists in S3, false otherwise
	 */
	async snapshotExists(snapshotId: string, userId: string): Promise<boolean> {
		if (!this.service || !this.config.enabled) {
			return false;
		}

		try {
			return await this.service.exists(snapshotId, userId);
		} catch (error) {
			logger.warn("Error checking S3 snapshot existence", {
				snapshotId,
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			return false;
		}
	}

	/**
	 * Generate presigned URL for snapshot download
	 *
	 * @param snapshotId - Snapshot ID
	 * @param userId - User ID
	 * @returns Presigned URL or null if unavailable
	 */
	async getPresignedUrl(snapshotId: string, userId: string): Promise<string | null> {
		if (!this.service || !this.config.enabled) {
			return null;
		}

		try {
			return await this.service.getPresignedUrl(snapshotId, userId);
		} catch (error) {
			logger.warn("Error generating presigned URL", {
				snapshotId,
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			return null;
		}
	}

	/**
	 * Check if cloud backup is enabled
	 */
	isEnabled(): boolean {
		return this.config.enabled && this.service !== null;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): CloudBackupConfig {
		return { ...this.config };
	}
}

// Singleton instance
let instance: CloudBackupOperations | null = null;

/**
 * Get or create CloudBackupOperations singleton
 */
export function getCloudBackupService(): CloudBackupOperations {
	if (!instance) {
		instance = new CloudBackupOperations();
	}

	return instance;
}

export default CloudBackupOperations;
