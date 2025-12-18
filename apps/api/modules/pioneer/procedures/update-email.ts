/**
 * PATCH /api/pioneer/email
 * Update pioneer's preferred contact email
 *
 * The contact email may differ from their GitHub email.
 * Used for important communications about tier upgrades, rewards, etc.
 */

import { logger } from "@snapback/infrastructure";
import { pioneers } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { getPioneerProfile } from "@/src/services/pioneer-service";

const updateEmailSchema = z.object({
	email: z.string().email("Invalid email format"),
});

export const updateEmail = protectedProcedure
	.route({
		method: "PATCH",
		path: "/pioneer/email",
		tags: ["Pioneer Program"],
		summary: "Update pioneer contact email",
	})
	.input(updateEmailSchema)
	.handler(async ({ input, context }) => {
		const user = context.user;

		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		const db = getDb();
		if (!db) {
			throw new Error("DATABASE_UNAVAILABLE");
		}

		// Verify pioneer profile exists
		const profile = await getPioneerProfile(user.id);

		// Update contact email
		await db
			.update(pioneers)
			.set({
				contactEmail: input.email,
				updatedAt: new Date(),
			})
			.where(eq(pioneers.userId, user.id));

		logger.info("Pioneer contact email updated", {
			pioneerId: profile.id,
			email: input.email,
		});

		return {
			success: true,
			message: "Contact email updated successfully",
		};
	});
