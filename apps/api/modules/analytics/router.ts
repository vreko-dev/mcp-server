import { getAgentSuggestions } from "./procedures/get-agent-suggestions";
import { getAnalyticsMetrics } from "./procedures/get-analytics-metrics";
import { getApiKeyUsage } from "./procedures/get-api-key-usage";
import { getDailyMetrics } from "./procedures/get-daily-metrics";
import { getFeedback } from "./procedures/get-feedback";
import { getLoops } from "./procedures/get-loops";
import { getPolicyEvaluations } from "./procedures/get-policy-evaluations";
import { getPostAcceptOutcomes } from "./procedures/get-post-accept-outcomes";
import { getSnapshots } from "./procedures/get-snapshots";
import { ingestEvents } from "./procedures/ingest-events";
import { processDailyMetrics } from "./procedures/process-daily-metrics";

export const analyticsRouter = {
	processDailyMetrics,
	getAgentSuggestions,
	getPostAcceptOutcomes,
	getPolicyEvaluations,
	getLoops,
	getFeedback,
	getApiKeyUsage,
	getSnapshots,
	getDailyMetrics,
	getAnalyticsMetrics,
	ingestEvents,
};

// Export types
export type AnalyticsRouter = typeof analyticsRouter;
