import { verifyApiKey } from "@snapback/auth";
import { apiKeys } from "@snapback/platform";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

export const validateApiKey = publicProcedure
	.input(
		z.object({
			key: z.string().min(1),
		}),
	)
	.handler(async ({ input }) => {
		const { key } = input;

		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		const allKeysResult = await db.select().from(apiKeys).where(sql`${apiKeys.revokedAt} IS NULL`);

		const allKeys = allKeysResult || [];

		// Try to find matching key by verifying hash
		let matchedKey: typeof apiKeys.$inferSelect | null = null;

		for (const dbKey of allKeys) {
			const isValid = await verifyApiKey(key, dbKey.key);
			if (isValid) {
				matchedKey = dbKey;
				break;
			}
		}

		if (!matchedKey) {
			throw new Error("Invalid API key");
		}

		if (matchedKey.revokedAt) {
			throw new Error("API key has been revoked");
		}

		// Update last used timestamp
		await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, matchedKey.id));

		return {
			valid: true,
			userId: matchedKey.userId,
			apiKeyId: matchedKey.id,
			permissions: matchedKey.permissions,
		};
	});
