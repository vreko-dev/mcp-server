import { apiUsageLogs, rateLimitViolations } from "@snapback/platform";
import { getDb } from "../src/services/database";
import { log } from "./logger";

export async function trackUsage(data: {
	requestId: string;
	apiKeyId: string;
	userId: string;
	endpoint: string;
	method: string;
	tokensUsed: number;
	responseTime: number;
	responseStatus: number;
	cached: boolean;
	clientVersion?: string;
	metadata?: Record<string, any>;
}) {
	try {
		const db = getDb();
		if (!db) {
			log.warn("Database not available, skipping usage tracking", {
				context: "trackUsage",
				requestId: data.requestId,
			});
			return;
		}

		await getDb().insert(apiUsageLogs).values({
			id: Date.now(),
			requestId: data.requestId,
			apiKeyId: data.apiKeyId,
			userId: data.userId,
			endpoint: data.endpoint,
			method: data.method,
			tokensUsed: data.tokensUsed,
			requestCount: 1,
			responseTimeMs: data.responseTime,
			responseStatus: data.responseStatus,
			clientVersion: data.clientVersion,
			clientPlatform: data.metadata?.platform,
			ideVersion: data.metadata?.ideVersion,
			ipAddress: data.metadata?.ipAddress,
			countryCode: data.metadata?.countryCode,
			errorCode: data.metadata?.errorCode,
			errorMessage: data.metadata?.errorMessage,
			metadata: data.metadata,
			createdAt: new Date(),
		});
	} catch (error) {
		log.error(error as Error, {
			context: "trackUsage",
			requestId: data.requestId,
			userId: data.userId,
			endpoint: data.endpoint,
		});
	}
}

export async function trackRateLimitViolation(data: {
	userId: string;
	apiKeyId: string;
	limitType: string;
	currentValue: number;
	limitValue: number;
	retryAfter: number;
	metadata?: Record<string, any>;
}) {
	try {
		const db = getDb();
		if (!db) {
			log.warn("Database not available, skipping rate limit tracking", {
				context: "trackRateLimitViolation",
				userId: data.userId,
			});
			return;
		}

		await getDb().insert(rateLimitViolations).values({
			id: Date.now(),
			userId: data.userId,
			apiKeyId: data.apiKeyId,
			limitType: data.limitType,
			currentValue: data.currentValue,
			limitValue: data.limitValue,
			retryAfterSeconds: data.retryAfter,
			metadata: data.metadata,
			createdAt: new Date(),
		});

		log.rateLimitHit({
			userId: data.userId,
			limitType: data.limitType,
			retryAfter: data.retryAfter,
		});
	} catch (error) {
		log.error(error as Error, {
			context: "trackRateLimitViolation",
			userId: data.userId,
			limitType: data.limitType,
		});
	}
}
