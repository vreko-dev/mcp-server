import { log } from "../lib/logger";

interface ErrorTrackingContext {
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

export async function errorTrackingMiddleware(context: ErrorTrackingContext, next: () => Promise<any>) {
	try {
		// Execute the next middleware/handler
		const result = await next();
		return result;
	} catch (error) {
		// Log error locally
		log.error(error as Error, {
			context: "apiError",
			endpoint: context.endpoint,
			method: context.method,
			userId: context.userId,
			apiKeyId: context.apiKeyId,
		});

		// Re-throw the error for proper handling
		throw error;
	}
}
