/**
 * API Endpoint: Get Snapshot Suggestions (Phase 4.1)
 * Returns proactive snapshot recommendations based on vitals analysis.
 */

import { logger } from "@snapback/infrastructure";
import { OXYGEN_THRESHOLDS, URGENCY_THRESHOLDS, WorkspaceVitals } from "@snapback/intelligence/vitals";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";

const ResponseSchema = z.discriminatedUnion("error", [
	z.object({
		error: z.literal(false),
		data: z.object({
			urgency: z.number().min(0).max(100),
			recommendation: z.enum(["now", "soon", "monitor"]),
			reason: z.string(),
			metrics: z.object({
				pressureRate: z.number(),
				aiActivityBurst: z.boolean(),
				criticalFilesTouched: z.number(),
				trajectoryConfidence: z.number(),
			}),
			suggestedAction: z.string().optional(),
		}),
	}),
	z.object({ error: z.literal(true), code: z.string(), message: z.string() }),
]);

export type SnapshotSuggestionResponse = z.infer<typeof ResponseSchema>;

const handler = async ({
	context,
	input,
}: {
	context: unknown;
	input: { workspaceId: string };
}): Promise<SnapshotSuggestionResponse> => {
	const userId = (context as { user?: { id: string } }).user?.id;

	if (!userId) {
		logger.warn("getSnapshotSuggestions: unauthorized");
		return {
			error: true,
			code: "UNAUTHORIZED",
			message: "Authentication required",
		};
	}

	try {
		const { workspaceId } = input;
		const vitals = WorkspaceVitals.tryGet(workspaceId);

		if (!vitals) {
			return {
				error: true,
				code: "VITALS_NOT_FOUND",
				message: "Workspace vitals not available",
			};
		}

		const snapshot = vitals.current();
		const calculateUrgency = (s: typeof snapshot): number => {
			let urgency = 0;
			urgency += Math.min(s.pressure.value / 2.5, 40);
			if (s.temperature.level === "burning") urgency += 20;
			else if (s.temperature.level === "hot") urgency += 10;
			if (s.oxygen.value < OXYGEN_THRESHOLDS.low)
				urgency += Math.min((OXYGEN_THRESHOLDS.low - s.oxygen.value) / 2, 25);
			urgency += Math.min(s.pressure.criticalFilesTouched.length * 3, 15);
			return Math.min(urgency, 100);
		};

		const urgency = calculateUrgency(snapshot);
		const recommendation: "now" | "soon" | "monitor" =
			urgency >= URGENCY_THRESHOLDS.critical ? "now" : urgency >= URGENCY_THRESHOLDS.medium ? "soon" : "monitor";

		const reasonMap = {
			now: `Create snapshot immediately - ${snapshot.trajectory === "critical" ? "critical state" : "high risk detected"}`,
			soon: `Create snapshot soon - ${snapshot.trajectory === "escalating" ? "risk escalating" : "moderate activity"}`,
			monitor: "Workspace state is stable - continue monitoring",
		};

		logger.info("Snapshot suggestion generated", { userId, workspaceId, urgency, recommendation });

		return {
			error: false,
			data: {
				urgency,
				recommendation,
				reason: reasonMap[recommendation],
				metrics: {
					pressureRate: snapshot.pressure.value,
					aiActivityBurst: snapshot.temperature.level === "burning",
					criticalFilesTouched: snapshot.pressure.criticalFilesTouched.length,
					trajectoryConfidence: snapshot.trajectory !== "stable" ? 0.8 : 1.0,
				},
				suggestedAction:
					recommendation === "now"
						? "Create snapshot immediately to preserve current state"
						: recommendation === "soon"
							? "Plan to create snapshot in the next few minutes"
							: "Continue monitoring workspace state",
			},
		};
	} catch (error) {
		logger.error("Failed to generate snapshot suggestion", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			error: true,
			code: "INTERNAL_ERROR",
			message: "Failed to generate suggestion",
		};
	}
};

export const getSnapshotSuggestions = protectedProcedure.input(z.object({ workspaceId: z.string() })).handler(handler);
