import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { waitlist, waitlistAuditLogs } from "@snapback/platform";
import { and, desc, eq, sql } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { hashEmail } from "./helpers";

export const getRecentActivity = protectedProcedure
	.route({
		method: "GET",
		path: "/waitlist/activity",
		tags: ["Waitlist"],
		summary: "Get recent activity",
		description: "Retrieve recent audit log events for the authenticated user's waitlist entry",
	})
	.handler(async ({ context }) => {
		const db = getDb();
		if (!db) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Database not available",
			});
		}

		const email = context.user.email;

		if (!email) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "User email not available",
			});
		}

		try {
			const entry = await getDb().query.waitlist.findFirst({
				where: eq(waitlist.email, email),
				columns: { id: true },
			});

			if (!entry) {
				return {
					events: [],
				};
			}

			// Get audit logs from last 24 hours
			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

			const logs = await getDb()
				.select()
				.from(waitlistAuditLogs)
				.where(
					and(
						eq(waitlistAuditLogs.waitlistId, entry.id),
						sql`${waitlistAuditLogs.createdAt} >= ${yesterday}`,
					),
				)
				.orderBy(desc(waitlistAuditLogs.createdAt))
				.limit(10);

			return {
				events: logs.map((log) => ({
					action: log.action,
					timestamp: log.createdAt,
					// Don't leak sensitive metadata
					metadata: log.metadata
						? {
								pointsEarned: (log.metadata as { pointsEarned?: number }).pointsEarned,
							}
						: undefined,
				})),
			};
		} catch (error) {
			logger.error("Failed to get recent activity", {
				error,
				emailHash: hashEmail(email),
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Unable to retrieve activity",
			});
		}
	});
