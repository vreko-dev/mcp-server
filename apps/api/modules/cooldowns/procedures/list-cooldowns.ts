import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

const listCooldownsSchema = z.object({
	limit: z.number().int().min(1).max(100).default(50),
	offset: z.number().int().min(0).default(0),
});

export const listCooldowns = protectedProcedure
	.input(listCooldownsSchema)
	.handler(async ({ context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// In a real implementation, we would list cooldowns from the database
		// For now, we'll return a mock response
		return {
			cooldowns: [],
			totalCount: 0,
		};
	});
