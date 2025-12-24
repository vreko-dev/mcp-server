/**
 * Dashboard Behavioral Metadata Procedure
 *
 * Returns behavioral metadata for the authenticated user's workspace.
 * Provides insights into developer workflow patterns and AI interaction.
 *
 * Contract: BehavioralMetadataResponse
 * Auth: Requires authenticated user (protectedProcedure)
 */

import { logger } from "@snapback/infrastructure";
import { WorkspaceVitals } from "@snapback/intelligence/vitals";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";

// Response schema matching BehavioralMetadata from @snapback/intelligence
const BehavioralMetadataResponseSchema = z.discriminatedUnion("error", [
	z.object({
		error: z.literal(false),
		data: z.object({
			sessionDuration: z.number(),
			aiAcceptanceRate: z.number(),
			churnRate: z.number(),
			testPassRate: z.number(),
			fileSaveCount: z.number(),
			aiSuggestionsShown: z.number(),
			aiSuggestionsAccepted: z.number(),
			aiSuggestionsRejected: z.number(),
			avgTimeBetweenEdits: z.number(),
		}),
	}),
	z.object({
		error: z.literal(true),
		code: z.string(),
		message: z.string(),
	}),
]);

type BehavioralMetadataResponse = z.infer<typeof BehavioralMetadataResponseSchema>;

/**
 * Get behavioral metadata for the authenticated user's workspace
 */
export const getBehavioralMetadataHandler = async ({
	context,
	input,
}: {
	context: unknown;
	input: { workspaceId: string };
}): Promise<BehavioralMetadataResponse> => {
	const userId = (context as { user?: { id: string } }).user?.id;

	if (!userId) {
		logger.warn("getBehavioralMetadata called without authenticated user");
		return {
			error: true,
			code: "UNAUTHORIZED",
			message: "Authentication required to access behavioral metadata",
		};
	}

	try {
		const { workspaceId } = input;

		// Get behavioral metadata from WorkspaceVitals
		const vitals = WorkspaceVitals.tryGet(workspaceId);
		const metadata = vitals?.getBehavioralMetadata() ?? null;

		if (!metadata) {
			logger.warn("Behavioral metadata not available for workspace", { userId, workspaceId });
			// Return default values instead of error
			return {
				error: false,
				data: {
					sessionDuration: 0,
					aiAcceptanceRate: 0,
					churnRate: 0,
					testPassRate: 0,
					fileSaveCount: 0,
					aiSuggestionsShown: 0,
					aiSuggestionsAccepted: 0,
					aiSuggestionsRejected: 0,
					avgTimeBetweenEdits: 0,
				},
			};
		}

		logger.info("Behavioral metadata fetched", {
			userId,
			workspaceId,
			sessionDuration: metadata.sessionDuration,
			aiAcceptanceRate: metadata.aiAcceptanceRate,
		});

		return {
			error: false,
			data: metadata,
		};
	} catch (error) {
		logger.error("Failed to fetch behavioral metadata", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			error: true,
			code: "INTERNAL_ERROR",
			message: "Failed to fetch behavioral metadata",
		};
	}
};

/**
 * Protected procedure for getting behavioral metadata
 */
export const getBehavioralMetadata = protectedProcedure
	.input(z.object({ workspaceId: z.string() }))
	.handler(getBehavioralMetadataHandler);
