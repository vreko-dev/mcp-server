import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { waitlist, waitlistReferrals } from "@snapback/platform";
import { count, eq } from "drizzle-orm";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { hashEmail } from "./helpers";

export const getReferrals = protectedProcedure
	.route({
		method: "GET",
		path: "/waitlist/referrals",
		tags: ["Waitlist"],
		summary: "Get referral count",
		description: "Retrieve the number of referrals and points for the authenticated user",
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
					count: 0,
					totalPoints: 0,
				};
			}

			const referralCount = await getDb()
				.select({ count: count() })
				.from(waitlistReferrals)
				.where(eq(waitlistReferrals.referrerId, entry.id));

			return {
				count: referralCount[0]?.count || 0,
				totalPoints: (referralCount[0]?.count || 0) * 10,
			};
		} catch (error) {
			logger.error("Failed to get referral count", {
				error,
				emailHash: hashEmail(email),
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Unable to retrieve referral count",
			});
		}
	});
