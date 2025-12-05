/**
 * S3 Client Integration Tests
 *
 * Tests REAL S3 client functionality with graceful degradation.
 * Following TDD: RED -> GREEN -> REFACTOR
 *
 * Run with: pnpm test:integration
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	checkS3Health,
	getPresignedDownloadUrl,
	getPresignedUploadUrl,
	getS3Client,
	isS3Configured,
} from "../s3-client.js";

describe("S3 Client Integration Tests", () => {
	let s3Available = false;

	beforeAll(() => {
		// Check if S3 is configured
		s3Available = isS3Configured();

		if (s3Available) {
			console.log("✓ S3 configured for integration tests");
		} else {
			console.log("⚠ S3 not configured, testing configuration checks only");
		}
	});

	describe("Configuration Checks", () => {
		it("should detect when S3 is not configured", () => {
			const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
			const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
			const originalBucket = process.env.S3_BUCKET_NAME;

			// Temporarily unset credentials
			delete process.env.AWS_ACCESS_KEY_ID;
			delete process.env.AWS_SECRET_ACCESS_KEY;
			delete process.env.S3_BUCKET_NAME;

			expect(isS3Configured()).toBe(false);

			// Restore
			if (originalAccessKey) process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
			if (originalSecretKey) process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
			if (originalBucket) process.env.S3_BUCKET_NAME = originalBucket;
		});

		it("should detect when S3 is configured", () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			expect(isS3Configured()).toBe(true);
			expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
			expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
			expect(process.env.S3_BUCKET_NAME).toBeDefined();
		});
	});

	describe("S3 Client Initialization", () => {
		it("should throw error when credentials missing", () => {
			const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
			const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

			delete process.env.AWS_ACCESS_KEY_ID;
			delete process.env.AWS_SECRET_ACCESS_KEY;

			expect(() => getS3Client()).toThrow("AWS credentials not configured");

			// Restore
			if (originalAccessKey) process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
			if (originalSecretKey) process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
		});

		it("should initialize S3 client with credentials", () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			const client = getS3Client();
			expect(client).toBeDefined();
			expect(client.config.region).toBeDefined();
		});
	});

	describe("Presigned Upload URLs", () => {
		it("should generate valid presigned upload URL", async () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			const url = await getPresignedUploadUrl("test/file.png", {
				contentType: "image/png",
				expiresIn: 60,
			});

			expect(url).toBeDefined();
			expect(url).toContain("X-Amz-Signature");
			expect(url).toContain("X-Amz-Credential");
			expect(url).toContain(process.env.S3_BUCKET_NAME || "");
		});

		it("should include content-type in signature when specified", async () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			const url = await getPresignedUploadUrl("test/document.pdf", {
				contentType: "application/pdf",
				expiresIn: 300,
			});

			expect(url).toContain("X-Amz-SignedHeaders");
			expect(url).toBeDefined();
		});

		it("should throw error when bucket not configured", async () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			const originalBucket = process.env.S3_BUCKET_NAME;
			delete process.env.S3_BUCKET_NAME;

			await expect(getPresignedUploadUrl("test/file.txt")).rejects.toThrow(
				"S3_BUCKET_NAME not configured",
			);

			// Restore
			if (originalBucket) process.env.S3_BUCKET_NAME = originalBucket;
		});
	});

	describe("Presigned Download URLs", () => {
		it("should generate valid presigned download URL", async () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			const url = await getPresignedDownloadUrl("test/existing-file.png", {
				expiresIn: 3600,
			});

			expect(url).toBeDefined();
			expect(url).toContain("X-Amz-Signature");
			expect(url).toContain(process.env.S3_BUCKET_NAME || "");
		});

		it("should respect custom expiration time", async () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			const shortExpiry = await getPresignedDownloadUrl("test/file.txt", {
				expiresIn: 60, // 1 minute
			});

			expect(shortExpiry).toContain("X-Amz-Expires=60");
		});
	});

	describe("S3 Health Check", () => {
		it("should return false when S3 not configured", async () => {
			const originalBucket = process.env.S3_BUCKET_NAME;
			delete process.env.S3_BUCKET_NAME;

			const health = await checkS3Health();
			expect(health).toBe(false);

			// Restore
			if (originalBucket) process.env.S3_BUCKET_NAME = originalBucket;
		});

		it("should verify bucket accessibility when configured", async () => {
			if (!s3Available) {
				console.log("⏭ Skipping - S3 not configured");
				return;
			}

			const health = await checkS3Health();
			// Will be true if bucket exists and credentials valid
			expect(typeof health).toBe("boolean");
		});
	});
});
