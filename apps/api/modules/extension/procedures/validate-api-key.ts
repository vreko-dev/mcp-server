/**
 * Validate API Key Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { verifyApiKey } from "@snapback/auth";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { type ApiKeyRecord, getAllActiveApiKeys, updateApiKeyLastUsed } from "../services/extension-service";

export const validateApiKey = publicProcedure
	.input(
		z.object({
			key: z.string().min(1),
		}),
	)
	.handler(async ({ input }) => {
		const { key } = input;

		// Get all active keys via service layer per C-002
		const allKeys = await getAllActiveApiKeys();

		// Try to find matching key by verifying hash
		let matchedKey: ApiKeyRecord | null = null;

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

		// Update last used timestamp via service layer per C-002
		await updateApiKeyLastUsed(matchedKey.id);

		return {
			valid: true,
			userId: matchedKey.userId,
			apiKeyId: matchedKey.id,
			permissions: matchedKey.permissions,
		};
	});
