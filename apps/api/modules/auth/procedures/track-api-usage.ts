import { ORPCError } from "@orpc/server";
import { apiKeys, apiUsage } from "@snapback/platform";
import { and, eq, gte, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

export const trackApiUsageProcedure = publicProcedure
	.input(
		z.object({
			apiKey: z.string(),
			endpoint: z.string(),
			method: z.string(),
			statusCode: z.number(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		}),
	)
	.handler(async ({ input }) => {
		// Check if database is available
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		// Dynamically import verifyApiKey and hashApiKey only when needed
		const { verifyApiKey, hashApiKey } = await import("../../../lib/crypto");

		// Always perform a hash comparison to prevent timing attacks
		// This ensures the function takes the same amount of time regardless of key validity
		const dummyHash = await hashApiKey("sk_live_00000000000000000000000000000000");

		// Check format
		if (!input.apiKey.match(/^sk_(live|test)_[a-zA-Z0-9]{32}$/)) {
			// Security: Always return generic error to prevent enumeration
			// Perform dummy hash comparison to maintain timing consistency
			await verifyApiKey(input.apiKey, dummyHash);
			throw new ORPCError("UNAUTHORIZED", {
				message: "Invalid API key format",
			});
		}

		// Extract key prefix for efficient lookup (first 8 characters)
		const keyPrefix = input.apiKey.substring(0, 8);

		// Find candidate keys in database with matching prefix
		// Limit to 10 candidates to prevent abuse
		// Include keys with null expiresAt (never expire)
		const candidateKeysResult = await getDb()
			?.select()
			.from(apiKeys)
			.where(
				and(
					like(apiKeys.keyPreview, `${keyPrefix}%`),
					isNull(apiKeys.revokedAt),
					or(gte(apiKeys.expiresAt, new Date()), isNull(apiKeys.expiresAt)),
				),
			)
			.limit(10);

		// Ensure we have an array to iterate over
		const candidateKeys = Array.isArray(candidateKeysResult) ? candidateKeysResult : [];

		// Find matching key by verifying hash among candidates only
		let validKey = null;
		for (const storedKey of candidateKeys) {
			const matches = await verifyApiKey(input.apiKey, storedKey.key);
			if (matches) {
				validKey = storedKey;
				break;
			}
		}

		// If no valid key found, perform dummy comparison and return error
		if (!validKey) {
			// Security: Always return generic error to prevent enumeration
			// Perform dummy hash comparison to maintain timing consistency
			await verifyApiKey(input.apiKey, dummyHash);
			throw new ORPCError("UNAUTHORIZED", {
				message: "Invalid API key",
			});
		}

		// Check if key is expired
		if (validKey.expiresAt && validKey.expiresAt < new Date()) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "API key expired",
			});
		}

		// Record usage
		await getDb().insert(apiUsage).values({
			apiKeyId: validKey.id,
			endpoint: input.endpoint,
			method: input.method,
			statusCode: input.statusCode,
			metadata: input.metadata,
			timestamp: new Date(),
		});

		// Update last used
		await getDb().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, validKey.id));

		return { success: true };
	});
