import { purchase } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

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
		// Check if database is available
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		if (organizationId) {
			const purchases = await db.select().from(purchase).where(eq(purchase.organizationId, organizationId));

			return { purchases };
		}

		const purchases = await db.select().from(purchase).where(eq(purchase.userId, user.id));

		return { purchases };
	});
