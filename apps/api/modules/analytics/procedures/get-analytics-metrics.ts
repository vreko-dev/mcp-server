import { ORPCError } from "@orpc/client";
import { agentSuggestions, feedback, loops, policyEvaluations, postAcceptOutcomes } from "@snapback/platform";
import { and, eq, gte, lte } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { AnalyticsMetricsInputSchema } from "../types";

export const getAnalyticsMetrics = protectedProcedure
	.route({
		method: "GET",
		path: "/analytics/metrics",
		tags: ["Analytics"],
		summary: "Get aggregated analytics metrics",
		description: "Calculate and return aggregated analytics metrics for a given time period",
	})
	.input(AnalyticsMetricsInputSchema)
	.handler(async ({ input, context: _context }) => {
		try {
			const db = getDb();
			if (!db) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Database not available",
				});
			}

			const { startDate, endDate, userId } = input;

			// Build suggestions query
			const suggestionsConditions: any[] = [
				gte(agentSuggestions.timestamp, startDate),
				lte(agentSuggestions.timestamp, endDate),
			];
			if (userId) {
				suggestionsConditions.push(eq(agentSuggestions.userId, userId));
			}
			const suggestions = await getDb()
				.select()
				.from(agentSuggestions)
				.where(and(...suggestionsConditions))
				.execute();

			// Build outcomes query
			const outcomesConditions: any[] = [
				gte(postAcceptOutcomes.timestamp, startDate),
				lte(postAcceptOutcomes.timestamp, endDate),
			];
			if (userId) {
				outcomesConditions.push(eq(postAcceptOutcomes.userId, userId));
			}
			const outcomes = await getDb()
				.select()
				.from(postAcceptOutcomes)
				.where(and(...outcomesConditions))
				.execute();

			// Build policies query
			const policiesConditions: any[] = [
				gte(policyEvaluations.timestamp, startDate),
				lte(policyEvaluations.timestamp, endDate),
			];
			if (userId) {
				policiesConditions.push(eq(policyEvaluations.userId, userId));
			}
			const policies = await getDb()
				.select()
				.from(policyEvaluations)
				.where(and(...policiesConditions))
				.execute();

			// Build loops query
			const loopsConditions: any[] = [gte(loops.timestamp, startDate), lte(loops.timestamp, endDate)];
			if (userId) {
				loopsConditions.push(eq(loops.userId, userId));
			}
			const loopData = await getDb()
				.select()
				.from(loops)
				.where(and(...loopsConditions))
				.execute();

			// Build feedback query
			const feedbackConditions: any[] = [gte(feedback.timestamp, startDate), lte(feedback.timestamp, endDate)];
			if (userId) {
				feedbackConditions.push(eq(feedback.userId, userId));
			}
			const feedbackData = await getDb()
				.select()
				.from(feedback)
				.where(and(...feedbackConditions))
				.execute();

			// Calculate metrics
			const totalSuggestions = suggestions.length;
			const acceptedSuggestions = suggestions.filter((s: any) => s.accepted).length;
			const dismissedSuggestions = suggestions.filter((s: any) => s.dismissed).length;
			const policyViolations = policies.filter((p: any) => p.evaluationResult === "fail").length;
			const totalLoops = loopData.length;
			const successfulLoops = loopData.filter((l: any) => l.success).length;
			const feedbackCount = feedbackData.length;

			// Calculate average times if we have outcomes data
			let avgTimeToEditMs: number | undefined;
			let avgTimeToSubmitMs: number | undefined;

			if (outcomes.length > 0) {
				const totalEditTime = outcomes.reduce(
					(sum: number, outcome: any) => sum + (outcome.timeToEditMs || 0),
					0,
				);
				const totalSubmitTime = outcomes.reduce(
					(sum: number, outcome: any) => sum + (outcome.timeToSubmitMs || 0),
					0,
				);
				avgTimeToEditMs = totalEditTime / outcomes.length;
				avgTimeToSubmitMs = totalSubmitTime / outcomes.length;
			}

			return {
				totalSuggestions,
				acceptedSuggestions,
				dismissedSuggestions,
				policyViolations,
				totalLoops,
				successfulLoops,
				feedbackCount,
				avgTimeToEditMs,
				avgTimeToSubmitMs,
			};
		} catch (error) {
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to calculate analytics metrics",
			});
		}
	});
