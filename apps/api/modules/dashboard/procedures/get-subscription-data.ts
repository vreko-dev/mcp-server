import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getSubscriptionData as getSubscriptionDataFromService } from "../services/dashboard-service";

const subscriptionDataSchema = z.object({
	plan: z.enum(["free", "pro", "team", "enterprise"]),
	status: z.enum(["active", "canceled", "past_due", "trialing", "paused"]),
	currentPeriodEnd: z.date().optional(),
	trialEnd: z.date().optional(),
	snapshotsUsed: z.number(),
	snapshotsLimit: z.number().nullable(),
	percentUsed: z.number(),
	remaining: z.number(),
	daysRemaining: z.number().optional(),
});

const getSubscriptionDataOutputSchema = subscriptionDataSchema;

export const getSubscriptionData = protectedProcedure
	.output(getSubscriptionDataOutputSchema)
	.handler(async ({ context }) => {
		const userId = context.user.id;

		// Delegate to service layer per C-002
		return await getSubscriptionDataFromService(userId);
	});
