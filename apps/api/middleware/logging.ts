import { log } from "../lib/logger";

interface LoggingContext {
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

export async function loggingMiddleware(context: LoggingContext, next: () => Promise<any>) {
	const startTime = Date.now();

	// Log request start
	log.apiRequest({
		requestId: context.requestId,
		method: context.method,
		endpoint: context.endpoint,
		userId: context.userId,
		duration: 0, // Will be updated after completion
		status: 0, // Will be updated after completion
	});

	try {
		// Execute the next middleware/handler
		const result = await next();

		// Log successful completion
		const duration = Date.now() - startTime;
		log.apiRequest({
			requestId: context.requestId,
			method: context.method,
			endpoint: context.endpoint,
			userId: context.userId,
			duration,
			status: 200,
		});

		// Log feature usage
		log.featureUsage({
			userId: context.userId,
			feature: context.endpoint,
			success: true,
			duration,
		});

		return result;
	} catch (error) {
		// Log error
		const duration = Date.now() - startTime;
		log.error(error as Error, {
			requestId: context.requestId,
			endpoint: context.endpoint,
			method: context.method,
			userId: context.userId,
			duration,
		});

		// Log feature usage with error
		log.featureUsage({
			userId: context.userId,
			feature: context.endpoint,
			success: false,
			duration,
		});

		throw error;
	}
}
