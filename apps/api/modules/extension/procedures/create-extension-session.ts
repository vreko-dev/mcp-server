/**
 * Create Extension Session Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import {
	createExtensionSessionRecord,
	findExtensionSession,
	updateExtensionSession,
} from "../services/extension-service";

const createExtensionSessionSchema = z.object({
	id: z.string(),
	sessionStart: z.number(),
	sessionEnd: z.number(),
	extensionVersion: z.string(),
	vscodeVersion: z.string(),
	platform: z.string(),
	requestsCount: z.number(),
	workspaceHash: z.string().optional(),
	highestSeverity: z.enum(["low", "medium", "high", "critical"]).optional(),
	aiPresent: z.boolean().optional(),
	issuesByType: z.record(z.string(), z.number()).optional(),
	bytesSaved: z.number().optional(),
});

export const createExtensionSession = protectedProcedure
	.input(createExtensionSessionSchema)
	.handler(async ({ input, context }) => {
		const userId = context.user.id;

		// Check if session already exists via service layer per C-002
		const existingSession = await findExtensionSession(input.id, userId);

		if (existingSession) {
			// Update existing session
			await updateExtensionSession(input.id, {
				sessionEnd: new Date(input.sessionEnd),
				requestsCount: input.requestsCount,
				highestSeverity: input.highestSeverity,
				aiPresent: input.aiPresent,
				issuesByType: input.issuesByType,
				bytesSaved: input.bytesSaved,
			});
		} else {
			// Create new session
			await createExtensionSessionRecord({
				id: input.id,
				userId,
				sessionStart: new Date(input.sessionStart),
				sessionEnd: new Date(input.sessionEnd),
				extensionVersion: input.extensionVersion,
				vscodeVersion: input.vscodeVersion,
				platform: input.platform,
				requestsCount: input.requestsCount,
				workspaceHash: input.workspaceHash,
				highestSeverity: input.highestSeverity,
				aiPresent: input.aiPresent,
				issuesByType: input.issuesByType,
				bytesSaved: input.bytesSaved,
			});
		}

		return { success: true };
	});
