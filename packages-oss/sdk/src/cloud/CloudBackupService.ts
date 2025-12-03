/**
 * Cloud Backup Service for S3 Integration
 * Handles upload/download of snapshots to AWS S3 for Solo+ tiers
 */

import * as crypto from "node:crypto";
import { promisify } from "node:util";
import * as zlib from "node:zlib";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Snapshot } from "@snapback-oss/contracts";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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

export class CloudBackupService {
	private s3Client: S3Client;

	constructor(private config: CloudBackupConfig) {
		this.s3Client = new S3Client({ region: config.region });
	}

	/**
	 * Upload snapshot to S3 with compression and checksumming
	 */
	async upload(snapshot: Snapshot, userId: string): Promise<UploadResult> {
		if (!this.config.enabled) {
			return { success: false, error: "Cloud backup not enabled" };
		}

		try {
			// Serialize snapshot
			const snapshotJson = JSON.stringify(snapshot);

			// Compress
			const compressed = await gzip(Buffer.from(snapshotJson, "utf-8"));

			// Calculate checksum
			const checksum = crypto.createHash("sha256").update(compressed).digest("hex");

			// S3 key structure: snapshots/{userId}/{snapshotId}.json.gz
			const s3Key = `snapshots/${userId}/${snapshot.id}.json.gz`;

			// Upload to S3
			const command = new PutObjectCommand({
				Bucket: this.config.bucket,
				Key: s3Key,
				Body: compressed,
				ContentType: "application/json",
				ContentEncoding: "gzip",
				Metadata: {
					"snapback-checksum": checksum,
					"snapback-version": "1.0",
					"snapback-timestamp": snapshot.timestamp.toString(),
				},
			});

			await this.s3Client.send(command);

			return {
				success: true,
				s3Key,
				checksum,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Download snapshot from S3 with integrity verification
	 */
	async download(snapshotId: string, userId: string): Promise<DownloadResult> {
		if (!this.config.enabled) {
			return { success: false, error: "Cloud backup not enabled" };
		}

		try {
			// S3 key structure
			const s3Key = `snapshots/${userId}/${snapshotId}.json.gz`;

			// Download from S3
			const command = new GetObjectCommand({
				Bucket: this.config.bucket,
				Key: s3Key,
			});

			const response = await this.s3Client.send(command);

			if (!response.Body) {
				return { success: false, error: "Empty response from S3" };
			}

			// Convert stream to buffer
			const chunks: Buffer[] = [];
			for await (const chunk of response.Body as any) {
				chunks.push(chunk);
			}
			const compressed = Buffer.concat(chunks);

			// Verify checksum if present
			const storedChecksum = response.Metadata?.["snapback-checksum"];
			if (storedChecksum) {
				const calculatedChecksum = crypto.createHash("sha256").update(compressed).digest("hex");
				if (calculatedChecksum !== storedChecksum) {
					return { success: false, error: "Checksum mismatch - data corruption detected" };
				}
			}

			// Decompress
			const decompressed = await gunzip(compressed);

			// Parse JSON
			const snapshot = JSON.parse(decompressed.toString("utf-8")) as Snapshot;

			return {
				success: true,
				snapshot,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Check if snapshot exists in S3
	 */
	async exists(snapshotId: string, userId: string): Promise<boolean> {
		if (!this.config.enabled) {
			return false;
		}

		try {
			const s3Key = `snapshots/${userId}/${snapshotId}.json.gz`;

			const command = new HeadObjectCommand({
				Bucket: this.config.bucket,
				Key: s3Key,
			});

			await this.s3Client.send(command);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Generate presigned URL for direct download (7-day expiration)
	 */
	async getPresignedUrl(snapshotId: string, userId: string): Promise<string | null> {
		if (!this.config.enabled) {
			return null;
		}

		try {
			const s3Key = `snapshots/${userId}/${snapshotId}.json.gz`;

			const command = new GetObjectCommand({
				Bucket: this.config.bucket,
				Key: s3Key,
			});

			// 7-day expiration
			const url = await getSignedUrl(this.s3Client, command, { expiresIn: 7 * 24 * 60 * 60 });
			return url;
		} catch {
			return null;
		}
	}
}
