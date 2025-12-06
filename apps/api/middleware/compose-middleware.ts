import { errorTrackingMiddleware } from "./error-tracking";
import { loggingMiddleware } from "./logging";
import { monitoringMiddleware } from "./monitoring";

// Define the context type that will be passed through all middleware
export interface MiddlewareContext {
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

// Example of how to use all middleware components together in sequence
export async function withComprehensiveMiddleware<T>(
	context: MiddlewareContext,
	handler: () => Promise<T>,
): Promise<T> {
	// Error tracking (should be first to catch all errors)
	const result = await errorTrackingMiddleware(context, async () => {
		// Logging
		return await loggingMiddleware(context, async () => {
			// Performance monitoring
			return await monitoringMiddleware(context, async () => {
				// Execute the actual handler
				return await handler();
			});
		});
	});

	return result;
}
