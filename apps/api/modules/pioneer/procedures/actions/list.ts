/**
 * GET /api/pioneer/actions
 * List pioneer actions with optional filtering
 */

import { logger } from "@snapback/infrastructure";
import { pioneerActions } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { ensureDatabase, getPioneerProfile } from "@/src/services/pioneer-service";

const listActionsSchema = z.object({
	actionType: z
		.enum(["github_star", "discord_join", "referral", "feedback", "bug_report", "tutorial_complete"])
		.optional(),
	verifiedOnly: z.boolean().optional(),
	limit: z.number().int().min(1).max(1000).default(100),
	offset: z.number().int().min(0).default(0),
});

export const listActions = protectedProcedure
	.route({
		method: "GET",
		path: "/pioneer/actions",
		tags: ["Pioneer Program"],
		summary: "List pioneer actions",
	})
	.input(listActionsSchema)
	.handler(async ({ input, context }) => {
		const user = context.user;

		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		const db = ensureDatabase();
		const { actionType, verifiedOnly, limit, offset } = input;

		// Fetch pioneer profile (consolidated)
		const pioneer = await getPioneerProfile(user.id);

		// Build filter conditions
		const conditions = [eq(pioneerActions.pioneerId, pioneer.id)];

		if (actionType) {
			conditions.push(eq(pioneerActions.actionType, actionType as any));
		}

		if (verifiedOnly) {
			conditions.push(eq(pioneerActions.verified, true));
		}

		// Fetch total count for pagination
		const allActions = await db
			.select()
			.from(pioneerActions)
			.where(and(...conditions));

		const totalActions = allActions.length;

		// Fetch paginated results
		const actions = await db
			.select()
			.from(pioneerActions)
			.where(and(...conditions))
			.limit(limit)
			.offset(offset);

		// Build summary breakdown
		const breakdown: Record<string, number> = {};
		allActions.forEach((action) => {
			const type = action.actionType;
			breakdown[type] = (breakdown[type] || 0) + 1;
		});

		logger.info("Pioneer actions listed", {
			pioneerId: pioneer.id,
			filters: { actionType, verifiedOnly },
			count: actions.length,
			total: totalActions,
		});

		return {
			success: true,
			actions,
			summary: {
				totalActions,
				breakdown,
			},
		};
	});
