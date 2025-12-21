/**
 * Delete My Data Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 * This procedure handles auth/validation only; business logic in privacy-service.ts
 */

import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { deleteAllUserData } from "../services/privacy-service";

export const deleteMyDataProcedure = protectedProcedure
	.input(
		z.object({
			confirm: z.boolean(),
		}),
	)
	.handler(async ({ context }) => {
		if (!context.user) {
			throw new Error("Unauthorized");
		}

		// Delegate to service layer per C-002
		return await deleteAllUserData(context.user.id);
	});
