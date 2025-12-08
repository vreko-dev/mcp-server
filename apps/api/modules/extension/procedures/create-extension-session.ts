import { extensionSessions } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

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

		// Check if session already exists
		const existingSession = await getDb()?.query.extensionSessions.findFirst({
			where: and(
				eq(extensionSessions.id, input.id),
				eq(extensionSessions.userId, userId),
			),
		});

		if (existingSession) {
			// Update existing session
			await getDb()
				?.update(extensionSessions)
				.set({
					sessionEnd: new Date(input.sessionEnd),
					requestsCount: input.requestsCount,
					highestSeverity: input.highestSeverity,
					aiPresent: input.aiPresent,
					issuesByType: input.issuesByType,
					bytesSaved: input.bytesSaved,
				})
				.where(eq(extensionSessions.id, input.id));
		} else {
			// Create new session
			const db = getDb();
			if (!db) {
				throw new Error("Database not available");
			}
			await db.insert(extensionSessions).values({
				id: input.id,
				userId,
				apiKeyId: null, // Will be set when API key system is integrated
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
