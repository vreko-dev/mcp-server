import { protectedProcedure } from "../../orpc/procedures";
import {
	getAIDetectionStats,
	getRecentActivity,
	getSessionMetrics,
	getSubscriptionData,
	getUserMetrics,
} from "./procedures";
import { getOrgMetrics } from "./procedures/get-org-metrics";

export const dashboardRouter = protectedProcedure.router({
	getUserMetrics,
	getAIDetectionStats,
	getRecentActivity,
	getSubscriptionData,
	getSessionMetrics,
	getOrgMetrics,
});
