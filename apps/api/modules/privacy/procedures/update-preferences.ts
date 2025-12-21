import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { buildPrivacyPreferences } from "../services/privacy-service";

const updatePreferencesSchema = z.object({
	cloudBackupDefault: z.boolean().optional(),
	telemetryOptIn: z.boolean().optional(),
	analyticsOptIn: z.boolean().optional(),
	telemetryPreferences: z
		.object({
			errorReporting: z.boolean().optional(),
			usageAnalytics: z.boolean().optional(),
			performanceMetrics: z.boolean().optional(),
		})
		.optional(),
});

export const updatePreferences = protectedProcedure
	.input(updatePreferencesSchema)
	.handler(async ({ input, context }) => {
		const currentUser = context.user;
		if (!currentUser) {
			throw new Error("Unauthorized");
		}

		// Build preferences via service
		const privacyPreferences = buildPrivacyPreferences(input);

		return {
			success: true,
			preferences: privacyPreferences,
			message: "Privacy preferences updated successfully",
		};
	});
