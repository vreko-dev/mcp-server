import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ORPCError } from "@orpc/server";
import { usageLimits, user } from "@snapback/platform";
import { and, eq, gte, lte } from "drizzle-orm";
// Import router from the correct file
// import { router } from '../../orpc/router';
import { z } from "zod";
import { protectedProcedure } from "../../orpc/procedures";
import { getDb } from "../../src/services/database";

// Initialize S3 client
const s3Client = new S3Client({
	region: process.env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
	},
});

export const storageRouter = {
	getPresignedUrl: protectedProcedure
		.input(
			z.object({
				snapshotId: z.string(),
				operation: z.enum(["upload", "download"]),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.user?.id;

			// 1. Verify user authentication
			if (!userId) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "User not authenticated",
				});
			}

			// 2. Get user details
			// Add null check for db
			const db = getDb();
			if (!db) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Database not available",
				});
			}

			const userRecord = await db.query.user.findFirst({
				where: eq(user.id, userId),
			});

			if (!userRecord) {
				throw new ORPCError("NOT_FOUND", {
					message: "User not found",
				});
			}

			// 3. Verify user has cloudBackupEnabled
			// Check if the property exists before accessing it
			if ("cloudBackupEnabled" in userRecord && !userRecord.cloudBackupEnabled) {
				throw new ORPCError("FORBIDDEN", {
					message: "Cloud backup not enabled for your account",
				});
			}

			// 4. Check storage quota (if uploading)
			if (input.operation === "upload") {
				const usage = await getStorageUsage(userId);
				if (usage.used >= usage.quota && usage.quota !== -1) {
					throw new ORPCError("FORBIDDEN", {
						message: "Storage quota exceeded. Upgrade your plan.",
					});
				}
			}

			// 5. Generate presigned URL
			const key = `users/${userId}/snapshots/${input.snapshotId}.enc`;
			const bucket = process.env.S3_BUCKET_NAME || "snapback-snapshots-prod";

			const command =
				input.operation === "upload"
					? new PutObjectCommand({
							Bucket: bucket,
							Key: key,
							ContentType: "application/json",
						})
					: new GetObjectCommand({
							Bucket: bucket,
							Key: key,
						});

			const url = await getSignedUrl(s3Client, command, {
				expiresIn: 3600, // 1 hour
			});

			const cdnUrl = process.env.CDN_URL
				? `${process.env.CDN_URL}/${key}`
				: `https://${bucket}.s3.amazonaws.com/${key}`;

			return {
				url,
				key,
				cdnUrl,
				expiresAt: Date.now() + 3600000, // 1 hour from now
			};
		}),
};

// Helper function
async function getStorageUsage(userId: string) {
	// Get current month start and end dates
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	// Add null check for db
	const db = getDb();
	if (!db) {
		return { used: 0, quota: 0 };
	}

	// Get user's subscription
	const userRecord = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			subscriptions: true,
		},
	});

	if (!userRecord) {
		return { used: 0, quota: 0 };
	}

	// Get subscription
	const subscription =
		userRecord.subscriptions && Array.isArray(userRecord.subscriptions) && userRecord.subscriptions.length > 0
			? userRecord.subscriptions[0]
			: null;

	if (!subscription) {
		return { used: 0, quota: 0 };
	}

	// Get usage limits for current month
	const usageResult = await db
		.select()
		.from(usageLimits)
		.where(
			and(
				eq(usageLimits.subscriptionId, subscription.id),
				gte(usageLimits.month, monthStart),
				lte(usageLimits.month, monthEnd),
			),
		)
		.limit(1);

	const usage = usageResult && usageResult.length > 0 ? usageResult[0] : null;

	return {
		used: usage?.cloudStorageUsedMb || 0,
		quota: usage?.cloudStorageLimitMb || 0,
	};
}
