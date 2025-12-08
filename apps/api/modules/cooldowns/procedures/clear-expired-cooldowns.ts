import { protectedProcedure } from "@/orpc/procedures";

export const clearExpiredCooldowns = protectedProcedure.handler(
	async ({ context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// In a real implementation, we would clear expired cooldowns from the database
		// For now, we'll return a mock response
		return {
			clearedCount: 0,
		};
	},
);
