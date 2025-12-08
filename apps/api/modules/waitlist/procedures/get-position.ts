import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { waitlist } from "@snapback/platform";
import { eq } from "drizzle-orm";
import {
	getCachedWaitlistPosition,
	setCachedWaitlistPosition,
} from "@/lib/upstash-client";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { hashEmail } from "./helpers";

export const getPosition = protectedProcedure
	.route({
		method: "GET",
		path: "/waitlist/position",
		tags: ["Waitlist"],
		summary: "Get queue position",
		description: "Retrieve the authenticated user's position in the waitlist",
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
			// Check cache first
			const cached = await getCachedWaitlistPosition(email).catch(() => null);
			if (cached !== null) {
				return {
					position: cached,
					fromCache: true,
				};
			}

			// Query database
			const entry = await getDb().query.waitlist.findFirst({
				where: eq(waitlist.email, email),
				columns: {
					queuePosition: true,
					status: true,
					referralCode: true,
				},
			});

			if (!entry) {
				return {
					position: null,
					error: "Not found on waitlist",
				};
			}

			// Cache the result with shorter TTL (10s instead of 60s)
			await setCachedWaitlistPosition(email, entry.queuePosition).catch(
				(err) => {
					logger.warn("Failed to cache position", { error: err });
				},
			);

			return {
				position: entry.queuePosition,
				status: entry.status,
				referralCode: entry.referralCode,
				fromCache: false,
			};
		} catch (error) {
			logger.error("Failed to get waitlist position", {
				error,
				emailHash: hashEmail(email),
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Unable to retrieve waitlist position",
			});
		}
	});
