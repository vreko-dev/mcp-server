/**
 * Cloud Backup Service for S3 Integration
 * Handles upload/download of snapshots to AWS S3 for Solo+ tiers
 */
import type { Snapshot } from "@snapback-oss/contracts";
export interface CloudBackupConfig {
	region: string;
	bucket: string;
	enabled: boolean;
}
export interface UploadResult {
	success: boolean;
	s3Key?: string;
	checksum?: string;
	error?: string;
}
export interface DownloadResult {
	success: boolean;
	snapshot?: Snapshot;
	error?: string;
}
export declare class CloudBackupService {
	private config;
	private s3Client;
	constructor(config: CloudBackupConfig);
	/**
	 * Upload snapshot to S3 with compression and checksumming
	 */
	upload(snapshot: Snapshot, userId: string): Promise<UploadResult>;
	/**
	 * Download snapshot from S3 with integrity verification
	 */
	download(snapshotId: string, userId: string): Promise<DownloadResult>;
	/**
	 * Check if snapshot exists in S3
	 */
	exists(snapshotId: string, userId: string): Promise<boolean>;
	/**
	 * Generate presigned URL for direct download (7-day expiration)
	 */
	getPresignedUrl(snapshotId: string, userId: string): Promise<string | null>;
}
//# sourceMappingURL=CloudBackupService.d.ts.map
