import pino from "pino";

// Check if Axiom credentials are available
const hasAxiomCredentials =
	(process.env.AXIOM_DATASET?.length ?? 0) > 0 &&
	(process.env.AXIOM_TOKEN?.length ?? 0) > 0;

let logger: pino.Logger;

if (hasAxiomCredentials) {
	const axiomTransport = pino.transport({
		target: "@axiomhq/pino",
		options: {
			dataset: process.env.AXIOM_DATASET || "",
			token: process.env.AXIOM_TOKEN || "",
		},
	});

	logger = pino(
		{
			level: process.env.LOG_LEVEL || "info",
			base: {
				env: process.env.NODE_ENV,
				service: "snapback-api",
				version: process.env.APP_VERSION || "1.0.0",
			},
		},
		axiomTransport,
	);
} else {
	// Fallback to console logging if Axiom is not configured
	logger = pino({
		level: process.env.LOG_LEVEL || "info",
		base: {
			env: process.env.NODE_ENV,
			service: "snapback-api",
			version: process.env.APP_VERSION || "1.0.0",
		},
	});
}

// Structured logging helpers
export const log = {
	apiRequest: (data: {
		requestId: string;
		method: string;
		endpoint: string;
		userId?: string;
		duration: number;
		status: number;
	}) => {
		logger.info({ type: "api_request", ...data });
	},

	featureUsage: (data: { userId: string; feature: string; success: boolean; duration?: number }) => {
		logger.info({ type: "feature_usage", ...data });
	},

	cacheHit: (cacheKey: string, userId: string) => {
		logger.info({ type: "cache_hit", cacheKey, userId });
	},

	rateLimitHit: (data: { userId: string; limitType: string; retryAfter: number }) => {
		logger.warn({ type: "rate_limit_hit", ...data });
	},

	warn: (message: string, context?: Record<string, any>) => {
		logger.warn({ type: "warning", message, ...context });
	},

	error: (error: Error, context?: Record<string, any>) => {
		logger.error({
			type: "error",
			error: {
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
			...context,
		});
	},
};

export { logger };
