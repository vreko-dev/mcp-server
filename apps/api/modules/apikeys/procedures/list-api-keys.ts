import { apiKeys } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

export const listApiKeys = protectedProcedure.handler(async ({ context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	const db = getDb();
	const keys = db
		? await db
				.select({
					id: apiKeys.id,
					name: apiKeys.name,
					keyPreview: apiKeys.keyPreview,
					lastUsedAt: apiKeys.lastUsedAt,
					createdAt: apiKeys.createdAt,
					revokedAt: apiKeys.revokedAt,
				})
				.from(apiKeys)
				.where(eq(apiKeys.userId, user.id))
				.orderBy(apiKeys.createdAt)
		: [];

	return { keys };
});
