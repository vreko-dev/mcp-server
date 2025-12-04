import { protectedProcedure } from "../../orpc/procedures";
import {
	getAIDetectionStats,
	getMetrics,
	getRecentActivity,
	getSessionMetrics,
	getSubscriptionData,
	getUserMetrics,
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
});
