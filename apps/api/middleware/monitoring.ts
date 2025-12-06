import { log } from "../lib/logger";

interface MonitoringContext {
	requestId: string;
	userId: string;
	apiKeyId: string;
	endpoint: string;
	method: string;
	clientVersion?: string;
	platform?: string;
	ideVersion?: string;
	userAgent?: string;
	ipAddress?: string;
}

// In-memory metrics storage (in production, this would use Redis or a dedicated metrics service)
export const metricsStore: Record<string, any> = {};

export async function monitoringMiddleware(
	context: MonitoringContext,
	next: () => Promise<any>,
) {
	const startTime = Date.now();
	const metricKey = `api_metrics_${new Date().toISOString().split("T")[0]}`; // Daily metrics

	// Initialize metrics for the day if not exists
	if (!metricsStore[metricKey]) {
		metricsStore[metricKey] = {
			totalRequests: 0,
			totalErrors: 0,
			totalResponseTime: 0,
			endpoints: {},
		};
	}

	// Increment request count
	metricsStore[metricKey].totalRequests++;

	// Initialize endpoint metrics if not exists
	if (!metricsStore[metricKey].endpoints[context.endpoint]) {
		metricsStore[metricKey].endpoints[context.endpoint] = {
			requests: 0,
			errors: 0,
			totalResponseTime: 0,
		};
	}

	// Increment endpoint request count
	metricsStore[metricKey].endpoints[context.endpoint].requests++;

	try {
		// Execute the next middleware/handler
		const result = await next();

		// Calculate response time
		const responseTime = Date.now() - startTime;

		// Update metrics
		metricsStore[metricKey].totalResponseTime += responseTime;
		metricsStore[metricKey].endpoints[context.endpoint].totalResponseTime +=
			responseTime;

		// Log performance metrics
		log.apiRequest({
			requestId: context.requestId,
			method: context.method,
			endpoint: context.endpoint,
			userId: context.userId,
			duration: responseTime,
			status: 200,
		});

		return result;
	} catch (error) {
		// Increment error counts
		metricsStore[metricKey].totalErrors++;
		metricsStore[metricKey].endpoints[context.endpoint].errors++;

		// Calculate response time for error
		const responseTime = Date.now() - startTime;

		// Update metrics
		metricsStore[metricKey].totalResponseTime += responseTime;
		metricsStore[metricKey].endpoints[context.endpoint].totalResponseTime +=
			responseTime;

		// Log error metrics
		log.error(error as Error, {
			requestId: context.requestId,
			endpoint: context.endpoint,
			method: context.method,
			userId: context.userId,
			duration: responseTime,
		});

		throw error;
	}
}

// Utility function to get current metrics
export function getMetrics() {
	const today = new Date().toISOString().split("T")[0];
	const metricKey = `api_metrics_${today}`;
	return (
		metricsStore[metricKey] || {
			totalRequests: 0,
			totalErrors: 0,
			totalResponseTime: 0,
			endpoints: {},
		}
	);
}
