import { ORPCError } from "@orpc/client";
import { apiKeyMetadata, apiKeys, subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateSigningSecret } from "@/lib/security";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
// Remove direct import of crypto functions

export const createApiKey = protectedProcedure
	.input(
		z.object({
			name: z.string().min(1).max(50),
		}),
	)
	.handler(async ({ input, context }) => {
		// Dynamically import crypto functions only when needed
		const { generateApiKey, hashApiKey } = await import("../../../lib/crypto");

		// TODO(TICKET-128): Fix context access - should use context.user instead of context.session
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// Check subscription tier
		const db = getDb();
		const userRecord = db
			? await db
					?.select({ subscriptionTier: subscriptions.plan })
					.from(subscriptions)
					.where(eq(subscriptions.userId, user.id))
					.limit(1)
			: [];

		const tier =
			userRecord && userRecord.length > 0
				? userRecord[0]?.subscriptionTier || "free"
				: "free";

		// Paywall: Free users can't create API keys
		if (tier === "free") {
			throw new ORPCError("FORBIDDEN", {
				message: "API keys require Pro plan or higher. Upgrade at /pricing",
			});
		}

		// Check subscription limits
		const subscription = db
			? (
					await db
						?.select()
						.from(subscriptions)
						.where(eq(subscriptions.userId, user.id))
						.limit(1)
				)?.[0]
			: undefined;

		const existingKeys = db
			? await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id))
			: [];

		// Check key limit based on plan
		const keyLimit = getKeyLimit(subscription?.plan || "free");
		if (existingKeys && existingKeys.length >= keyLimit) {
			throw new Error(
				`You've reached the limit of ${keyLimit} API keys for your plan`,
			);
		}

		// Generate new key
		const rawKey = generateApiKey(); // sb_xxxxxxxxxxxxxxxxxxxx
		const hashedKey = await hashApiKey(rawKey);
		const keyPreview = `${rawKey.slice(0, 8)}...`;

		// Store in database
		if (!db) {
			throw new Error("Database not available");
		}

		const [newKey] =
			(await db
				?.insert(apiKeys)
				.values({
					userId: user.id,
					name: input.name,
					key: hashedKey,
					keyPreview,
					permissions: getPermissionsForPlan(subscription?.plan || "free"),
				})
				.returning()) || [];

		if (!newKey) {
			throw new Error("Failed to create API key");
		}

		// Create API key metadata with signing secret
		await db.insert(apiKeyMetadata).values({
			apiKeyId: newKey.id,
			userId: user.id,
			name: input.name,
			environment: "production",
			scopes: ["code:analyze", "code:refactor", "code:search"],
			signingSecret: generateSigningSecret(), // 256-bit cryptographically random secret
		});

		return {
			apiKey: {
				id: newKey.id,
				name: newKey.name,
				key: rawKey, // Only time we return the full key
				createdAt: newKey.createdAt,
			},
			message: "Save this key securely. You won't be able to see it again.",
		};
	});

// Helper to determine key limits based on plan
export function getKeyLimit(plan: string) {
	switch (plan) {
		case "team":
		case "pro":
			return Number.POSITIVE_INFINITY; // unlimited
		case "enterprise":
			return Number.POSITIVE_INFINITY; // unlimited
		default:
			return 0; // Defensive: Free tier should not reach here due to paywall, but return 0 as a safeguard
	}
}

// Helper to determine permissions based on plan
export function getPermissionsForPlan(plan: string) {
	switch (plan) {
		case "enterprise":
			return {
				maxSnapshots: undefined, // unlimited
				cloudBackup: true,
				advancedDetection: true,
				customRules: true,
				teamSharing: true,
			};
		case "team":
			return {
				maxSnapshots: undefined, // unlimited
				cloudBackup: true,
				advancedDetection: true,
				customRules: true,
				teamSharing: true,
			};
		case "pro":
			return {
				maxSnapshots: undefined,
				cloudBackup: true,
				advancedDetection: true,
				customRules: true,
				teamSharing: false,
			};
		default:
			return {
				maxSnapshots: 100, // per month
				cloudBackup: false,
				advancedDetection: false,
				customRules: false,
				teamSharing: false,
			};
	}
}
