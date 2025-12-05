/**
 * S3 Client and Presigned URL Utilities
 *
 * Follows AWS SDK v3 patterns from Context7 documentation:
 * - Modular client initialization
 * - Presigned URL generation with security controls
 * - Graceful degradation when S3 not configured
 *
 * @see https://github.com/aws/aws-sdk-js-v3 (Context7: /aws/aws-sdk-js-v3)
 */

import {
	GetObjectCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@snapback/infrastructure";

let s3Client: S3Client | null = null;

/**
 * Get or create S3 client instance
 * Pattern from Context7: /aws/aws-sdk-js-v3 client initialization
 */
export function getS3Client(): S3Client {
	if (!s3Client) {
		if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
			throw new Error(
				"AWS credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY required)",
			);
		}

		s3Client = new S3Client({
			region: process.env.AWS_REGION || "us-east-1",
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});

		logger.info("✅ S3 client initialized", {
			region: process.env.AWS_REGION || "us-east-1",
			bucket: process.env.S3_BUCKET_NAME,
		});
	}

	return s3Client;
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
	return !!(
		process.env.AWS_ACCESS_KEY_ID &&
		process.env.AWS_SECRET_ACCESS_KEY &&
		process.env.S3_BUCKET_NAME
	);
}

/**
 * Generate presigned upload URL
 * Pattern from Context7: getSignedUrl with PutObjectCommand and signableHeaders
 *
 * @param key - S3 object key (path)
 * @param options - Upload options
 * @returns Presigned URL valid for specified duration
 */
export async function getPresignedUploadUrl(
	key: string,
	options: {
		bucket?: string;
		expiresIn?: number; // seconds, default 3600 (1 hour)
		contentType?: string;
	} = {},
): Promise<string> {
	const client = getS3Client();
	const bucket = options.bucket || process.env.S3_BUCKET_NAME;

	if (!bucket) {
		throw new Error("S3_BUCKET_NAME not configured");
	}

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		...(options.contentType && { ContentType: options.contentType }),
	});

	// Context7 pattern: signableHeaders for ContentType enforcement
	const signedUrl = await getSignedUrl(client, command, {
		expiresIn: options.expiresIn || 3600,
		...(options.contentType && {
			signableHeaders: new Set(["content-type"]),
		}),
	});

	logger.debug("Generated presigned upload URL", {
		key,
		bucket,
		expiresIn: options.expiresIn || 3600,
	});

	return signedUrl;
}

/**
 * Generate presigned download URL
 * Pattern from Context7: getSignedUrl with GetObjectCommand
 *
 * @param key - S3 object key (path)
 * @param options - Download options
 * @returns Presigned URL valid for specified duration
 */
export async function getPresignedDownloadUrl(
	key: string,
	options: {
		bucket?: string;
		expiresIn?: number; // seconds, default 3600 (1 hour)
	} = {},
): Promise<string> {
	const client = getS3Client();
	const bucket = options.bucket || process.env.S3_BUCKET_NAME;

	if (!bucket) {
		throw new Error("S3_BUCKET_NAME not configured");
	}

	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	});

	const signedUrl = await getSignedUrl(client, command, {
		expiresIn: options.expiresIn || 3600,
	});

	logger.debug("Generated presigned download URL", {
		key,
		bucket,
		expiresIn: options.expiresIn || 3600,
	});

	return signedUrl;
}

/**
 * Check S3 bucket health
 * Used by health check endpoint
 *
 * @param bucket - Bucket name (defaults to S3_BUCKET_NAME)
 * @returns true if bucket is accessible
 */
export async function checkS3Health(bucket?: string): Promise<boolean> {
	try {
		const client = getS3Client();
		const bucketName = bucket || process.env.S3_BUCKET_NAME;

		if (!bucketName) {
			return false;
		}

		await client.send(
			new HeadBucketCommand({
				Bucket: bucketName,
			}),
		);

		return true;
	} catch (error) {
		logger.error("S3 health check failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}
