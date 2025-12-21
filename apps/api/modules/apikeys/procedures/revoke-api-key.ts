import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getApiKeyWithOwnerCheck, revokeApiKeyById } from "../services/apikeys-service";

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

		// Verify ownership via service
		const key = await getApiKeyWithOwnerCheck(input.id, user.id);

		if (!key) {
			throw new Error("Key not found or unauthorized");
		}

		// Revoke via service
		const success = await revokeApiKeyById(input.id);

		if (!success) {
			throw new Error("Key not found");
		}

		return { success: true };
	});
