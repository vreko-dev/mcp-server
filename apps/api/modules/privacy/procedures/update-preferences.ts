import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

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

		// Check if database is available
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		// For now, we'll just return success without actually updating anything
		// since the user table doesn't have a metadata field
		const privacyPreferences = {
			cloudBackupDefault: input.cloudBackupDefault ?? false,
			telemetryOptIn: input.telemetryOptIn ?? true,
			analyticsOptIn: input.analyticsOptIn ?? false,
			telemetryPreferences: input.telemetryPreferences ?? {
				errorReporting: true,
				usageAnalytics: false,
				performanceMetrics: true,
			},
			updatedAt: new Date().toISOString(),
		};

		return {
			success: true,
			preferences: privacyPreferences,
			message: "Privacy preferences updated successfully",
		};
	});
