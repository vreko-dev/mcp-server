/**
 * Create API Key Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 * This procedure handles auth/validation only; business logic in apikeys-service.ts
 */

import { ORPCError } from "@orpc/client";
import { z } from "zod";
import { generateSigningSecret } from "@/lib/security";
import { protectedProcedure } from "@/orpc/procedures";
import { createApiKeyRecord, getPermissionsForPlan, getUserSubscriptionInfo } from "../services/apikeys-service";

export const createApiKey = protectedProcedure
	.input(
		z.object({
			name: z.string().min(1).max(50),
		}),
	)
	.handler(async ({ input, context }) => {
		// Import crypto functions from canonical auth package
		const { generateApiKey, hashApiKey } = await import("@snapback/auth");

		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// Get subscription info via service layer per C-002
		const subInfo = await getUserSubscriptionInfo(user.id);

		// Paywall: Free users can't create API keys
		if (subInfo.plan === "free") {
			throw new ORPCError("FORBIDDEN", {
				message: "API keys require Pro plan or higher. Upgrade at /pricing",
			});
		}

		// Check key limit based on plan
		if (subInfo.existingKeyCount >= subInfo.keyLimit) {
			throw new Error(`You've reached the limit of ${subInfo.keyLimit} API keys for your plan`);
		}

		// Generate new key
		const rawKey = generateApiKey();
		const hashedKey = await hashApiKey(rawKey);
		const keyPreview = `${rawKey.slice(0, 8)}...`;

		// Create key via service layer per C-002
		const newKey = await createApiKeyRecord({
			userId: user.id,
			name: input.name,
			hashedKey,
			keyPreview,
			signingSecret: generateSigningSecret(),
			permissions: getPermissionsForPlan(subInfo.plan),
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

// Re-export for backwards compatibility
export { getKeyLimit, getPermissionsForPlan } from "../services/apikeys-service";
