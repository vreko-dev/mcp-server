/**
 * List Purchases Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getOrganizationPurchases, getUserPurchases } from "../services/payments-service";

export const listPurchases = protectedProcedure
	.route({
		method: "GET",
		path: "/payments/purchases",
		tags: ["Payments"],
		summary: "Get purchases",
		description: "Get all purchases of the current user or the provided organization",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
		}),
	)
	.handler(async ({ input: { organizationId }, context: { user } }) => {
		// Delegate to service layer per C-002
		if (organizationId) {
			const purchases = await getOrganizationPurchases(organizationId);
			return { purchases };
		}

		const purchases = await getUserPurchases(user.id);
		return { purchases };
	});
