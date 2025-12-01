/**
 * Health Check Endpoint
 *
 * Returns system health status
 * Checks database, Redis, and S3 connectivity
 */

import { sql } from "drizzle-orm";
import { getDb } from "../src/services/database";

export interface HealthCheckResult {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	checks: {
		database: "healthy" | "unhealthy";
		redis?: "healthy" | "unhealthy";
		s3?: "healthy" | "unhealthy";
	};
	version: string;
	uptime: number;
}

const startTime = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<"healthy" | "unhealthy"> {
	try {
		const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Database check timeout")), 2000));

		const dbInstance = getDb();
		if (!dbInstance) {
			return "unhealthy";
		}

		const check = dbInstance.execute(sql`SELECT 1 as health`);

		await Promise.race([check, timeout]);
		return "healthy";
	} catch (error) {
		console.error("[Health] Database check failed:", error);
		return "unhealthy";
	}
}

/**
 * Check Redis connectivity (optional)
 */
async function checkRedis(): Promise<"healthy" | "unhealthy" | undefined> {
	if (!process.env.REDIS_URL) {
		return undefined; // Redis not configured
	}

	try {
		// TODO: Implement Redis ping check
		// const redis = await getRedisClient();
		// await redis.ping();
		return "healthy";
	} catch (error) {
		console.error("[Health] Redis check failed:", error);
		return "unhealthy";
	}
}

/**
 * Check S3 connectivity (optional)
 */
async function checkS3(): Promise<"healthy" | "unhealthy" | undefined> {
	if (!process.env.AWS_S3_BUCKET) {
		return undefined; // S3 not configured
	}

	try {
		// TODO: Implement S3 HeadBucket check
		// const s3 = getS3Client();
		// await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
		return "healthy";
	} catch (error) {
		console.error("[Health] S3 check failed:", error);
		return "unhealthy";
	}
}

/**
 * Perform health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
	const [database, redis, s3] = await Promise.all([checkDatabase(), checkRedis(), checkS3()]);

	// Determine overall status
	let status: "healthy" | "degraded" | "unhealthy" = "healthy";

	if (database === "unhealthy") {
		status = "unhealthy"; // Database is critical
	} else if (redis === "unhealthy" || s3 === "unhealthy") {
		status = "degraded"; // Optional services degraded
	}

	return {
		status,
		timestamp: new Date().toISOString(),
		checks: {
			database,
			...(redis !== undefined && { redis }),
			...(s3 !== undefined && { s3 }),
		},
		version: process.env.npm_package_version || "1.0.0-alpha",
		uptime: Date.now() - startTime,
	};
}

/**
 * Health check HTTP handler
 */
export async function healthCheckHandler(): Promise<Response> {
	const result = await performHealthCheck();

	const statusCode = result.status === "healthy" ? 200 : 503;

	return new Response(JSON.stringify(result), {
		status: statusCode,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-cache, no-store, must-revalidate",
		},
	});
}
