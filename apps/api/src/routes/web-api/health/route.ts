import { logger } from "@snapback/infrastructure";
import { db as drizzle } from "@snapback/platform";
import { sql } from "drizzle-orm";
import { existsSync } from "fs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Health check endpoint for Docker containers and load balancers
 * Provides comprehensive system status including database connectivity
 */
export async function GET(_request: NextRequest) {
	const startTime = Date.now();

	try {
		// Basic health check data
		const healthData = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			environment: process.env.NODE_ENV || "development",
			version: process.env.npm_package_version || "unknown",
			checks: {
				database: "unknown",
				memory: "unknown",
				disk: "unknown",
			},
			responseTime: 0,
		};

		// Database connectivity check
		try {
			if (drizzle) {
				await drizzle.execute(sql`SELECT 1`);
				healthData.checks.database = "healthy";
			} else {
				healthData.checks.database = "unavailable";
			}
		} catch (error) {
			healthData.checks.database = "unhealthy";
			healthData.status = "degraded";
			logger.error("Database health check failed:", { error });
		}

		// Database query performance check
		try {
			if (drizzle) {
				const queryStart = Date.now();
				await drizzle.execute(sql`SELECT 1`);
				const queryTime = Date.now() - queryStart;

				// Add query performance to details in non-production environments
				if (process.env.NODE_ENV !== "production") {
					if (!(healthData as { details?: Record<string, unknown> }).details) {
						(healthData as { details?: Record<string, unknown> }).details = {};
					}
					(
						(healthData as { details?: Record<string, unknown> })
							.details as Record<string, unknown>
					).databaseQueryTimeMs = queryTime;
				}

				// Consider degraded if query takes more than 100ms
				if (queryTime > 100) {
					healthData.checks.database = "degraded";
					if (healthData.status === "healthy") {
						healthData.status = "degraded";
					}
				}
			}
		} catch (error) {
			healthData.checks.database = "unhealthy";
			healthData.status = "degraded";
			logger.error("Database performance check failed:", { error });
		}

		// Memory usage check
		const memUsage = process.memoryUsage();
		const memUsageMB = {
			rss: Math.round(memUsage.rss / 1024 / 1024),
			heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
			heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
			external: Math.round(memUsage.external / 1024 / 1024),
		};

		// Consider unhealthy if using more than 400MB RSS memory
		if (memUsageMB.rss > 400) {
			healthData.checks.memory = "warning";
			if (healthData.status === "healthy") {
				healthData.status = "degraded";
			}
		} else {
			healthData.checks.memory = "healthy";
		}

		// Disk space check (basic check for filesystem accessibility)
		try {
			// Check if common directories exist and are accessible
			const pathsToCheck = ["/tmp", "/var/tmp", "."];
			let diskCheckPassed = false;

			for (const path of pathsToCheck) {
				if (existsSync(path)) {
					diskCheckPassed = true;
					break;
				}
			}

			healthData.checks.disk = diskCheckPassed ? "healthy" : "unhealthy";

			if (!diskCheckPassed) {
				healthData.status = "degraded";
			}
		} catch (error) {
			healthData.checks.disk = "unhealthy";
			healthData.status = "degraded";
			logger.error("Disk health check failed:", { error });
		}

		// Response time
		healthData.responseTime = Date.now() - startTime;

		// Determine HTTP status code
		let statusCode = 200;
		if (healthData.status === "unhealthy") {
			statusCode = 503; // Service Unavailable
		} else if (healthData.status === "degraded") {
			statusCode = 200; // OK but with warnings
		}

		// Add detailed info for non-production environments
		if (process.env.NODE_ENV !== "production") {
			if (!(healthData as { details?: Record<string, unknown> }).details) {
				(healthData as { details?: Record<string, unknown> }).details = {};
			}

			Object.assign(
				(healthData as { details?: Record<string, unknown> }).details as Record<
					string,
					unknown
				>,
				{
					memory: memUsageMB,
					nodeVersion: process.version,
					platform: process.platform,
					arch: process.arch,
					pid: process.pid,
					ppid: process.ppid,
				},
			);
		}

		return NextResponse.json(healthData, {
			status: statusCode,
			headers: {
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
			},
		});
	} catch (error) {
		logger.error("Health check failed:", { error });

		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				error:
					process.env.NODE_ENV === "production"
						? "Internal server error"
						: (error as Error).message,
				responseTime: Date.now() - startTime,
			},
			{
				status: 503,
				headers: {
					"Cache-Control": "no-cache, no-store, must-revalidate",
					Pragma: "no-cache",
					Expires: "0",
				},
			},
		);
	}
}

// Support HEAD requests for simple health checks
export async function HEAD() {
	try {
		// Quick database check for HEAD requests
		if (drizzle) {
			await drizzle.execute(sql`SELECT 1`);
		}
		return new NextResponse(null, { status: 200 });
	} catch (_error) {
		return new NextResponse(null, { status: 503 });
	}
}
