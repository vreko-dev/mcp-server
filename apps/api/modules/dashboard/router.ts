import { protectedProcedure } from "../../orpc/procedures";
import {
	getAIDetectionStats,
	getBehavioralMetadata,
	getLearningStats,
	getMetrics,
	getRecentActivity,
	getSessionMetrics,
	getSubscriptionData,
	getUserMetrics,
	getVitalsStats,
} from "./procedures";
import { getOrgMetrics } from "./procedures/get-org-metrics";

export const dashboardRouter = protectedProcedure.router({
	getMetrics,
	getUserMetrics,
	getAIDetectionStats,
	getRecentActivity,
	getSubscriptionData,
	getSessionMetrics,
	getOrgMetrics,
	getVitalsStats,
	getLearningStats,
	getBehavioralMetadata,
});
