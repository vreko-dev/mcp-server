/**
 * GET /api/pioneer/actions/history
 * Get chronological action history for a pioneer with detailed activity log
 */

import { logger } from "@snapback/infrastructure";
import { pioneerActions } from "@snapback/platform";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { ensureDatabase, getPioneerProfile } from "@/src/services/pioneer-service";

const getActionHistorySchema = z.object({
	days: z.number().int().min(1).max(90).default(30),
	limit: z.number().int().min(1).max(100).default(50),
});

const ActionHistoryItemSchema = z.object({
	id: z.string(),
	actionType: z.string(),
	pointsAwarded: z.number(),
	verified: z.boolean(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	createdAt: z.date(),
	tierAtTime: z.string().nullable(),
});

const ActionHistoryResponseSchema = z.object({
	success: z.boolean(),
	history: z.array(ActionHistoryItemSchema),
	stats: z.object({
		totalPoints: z.number(),
		actionsCount: z.number(),
		mostCommonAction: z.string().nullable(),
		streakDays: z.number(),
	}),
	pioneerInfo: z.object({
		currentTier: z.string(),
		currentPoints: z.number(),
		joinedAt: z.date(),
	}),
});

export type ActionHistoryResponse = z.infer<typeof ActionHistoryResponseSchema>;

/**
 * Calculate streak days (consecutive days with actions)
 */
function calculateStreak(actions: Array<{ createdAt: Date }>): number {
	if (actions.length === 0) return 0;

	const sortedDates = actions
		.map((a) => a.createdAt)
		.sort((a, b) => b.getTime() - a.getTime())
		.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());

	const uniqueDates = [...new Set(sortedDates)];
	if (uniqueDates.length === 0) {
		return 0;
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayTime = today.getTime();
	const oneDayMs = 24 * 60 * 60 * 1000;

	// Check if latest action is today or yesterday
	const latestActionDate = uniqueDates[0];
	if (latestActionDate < todayTime - oneDayMs) {
		return 0; // Streak broken
	}

	let streak = 0;
	let expectedDate = latestActionDate;

	for (const dateTime of uniqueDates) {
		if (dateTime === expectedDate) {
			streak++;
			expectedDate -= oneDayMs;
		} else if (dateTime < expectedDate) {
			break;
		}
	}

	return streak;
}

export const getActionHistory = protectedProcedure
	.route({
		method: "GET",
		path: "/pioneer/actions/history",
		tags: ["Pioneer Program"],
		summary: "Get chronological action history",
	})
	.input(getActionHistorySchema)
	.handler(async ({ input, context }) => {
		const user = context.user;

		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		const db = ensureDatabase();
		const { days, limit } = input;

		// Fetch pioneer profile
		const pioneer = await getPioneerProfile(user.id);

		// Calculate date range
		const sinceDate = new Date();
		sinceDate.setDate(sinceDate.getDate() - days);

		// Fetch action history ordered by date
		const actions = await db
			.select({
				id: pioneerActions.id,
				actionType: pioneerActions.actionType,
				points: pioneerActions.points,
				verified: pioneerActions.verified,
				metadata: pioneerActions.metadata,
				createdAt: pioneerActions.createdAt,
			})
			.from(pioneerActions)
			.where(eq(pioneerActions.pioneerId, pioneer.id))
			.orderBy(desc(pioneerActions.createdAt))
			.limit(limit);

		// Calculate stats
		const totalPoints = actions.reduce((sum, a) => sum + (a.points ?? 0), 0);
		const actionsCount = actions.length;

		// Find most common action type
		const typeCounts: Record<string, number> = {};
		actions.forEach((a) => {
			typeCounts[a.actionType] = (typeCounts[a.actionType] || 0) + 1;
		});

		const mostCommonAction = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

		// Calculate streak
		const streakDays = calculateStreak(actions);

		// Map to response format with tierAtTime (currently null, could be enhanced)
		const history = actions.map((action) => ({
			id: action.id,
			actionType: action.actionType,
			pointsAwarded: action.points ?? 0,
			verified: action.verified,
			metadata: action.metadata,
			createdAt: action.createdAt,
			tierAtTime: null, // Could track tier at action time in future
		}));

		logger.info("Pioneer action history fetched", {
			pioneerId: pioneer.id,
			actionsCount,
			totalPoints,
			streakDays,
		});

		return {
			success: true,
			history,
			stats: {
				totalPoints,
				actionsCount,
				mostCommonAction,
				streakDays,
			},
			pioneerInfo: {
				currentTier: pioneer.tier,
				currentPoints: pioneer.totalPoints,
				joinedAt: pioneer.createdAt,
			},
		};
	});
