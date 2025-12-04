import { apiKeys } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isDatabaseAvailable } from "../../../lib/database";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

export const revokeApiKey = protectedProcedure
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// Check if the API key belongs to the user
		if (!isDatabaseAvailable()) {
			throw new Error("Database not available");
		}

		const result = isDatabaseAvailable()
			? await getDb()
					.select()
					.from(apiKeys)
					.where(eq(apiKeys.id, input.id))
					.limit(1)
			: [];

		const key = result && result.length > 0 ? result[0] : undefined;

		if (!key || key.userId !== user.id) {
			throw new Error("Key not found or unauthorized");
		}

		if (!isDatabaseAvailable()) {
			throw new Error("Database not available");
		}

		const updateResult = isDatabaseAvailable()
			? await getDb()
					.update(apiKeys)
					.set({ revokedAt: new Date() })
					.where(eq(apiKeys.id, input.id))
					.returning()
			: [];

		const updated =
			updateResult && updateResult.length > 0 ? updateResult[0] : undefined;

		if (!updated) {
			throw new Error("Key not found");
		}

		return { success: true };
	});
