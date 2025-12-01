/**
 * Health check utilities for SnapBack services
 */

export interface HealthResponse {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	service: string;
	version?: string;
	checks: {
		[key: string]: {
			status: "healthy" | "degraded" | "unhealthy";
			message?: string;
			latency?: number;
			timestamp: string;
		};
	};
	uptime?: number;
	memoryUsage?: {
		heapUsed: number;
		heapTotal: number;
		rss: number;
	};
}

export interface HealthCheckOptions {
	service: string;
	version?: string;
	dependencies?: Array<{
		name: string;
		check: () => Promise<{ status: "healthy" | "degraded" | "unhealthy"; message?: string }>;
	}>;
}

export function createHealthCheck(options: HealthCheckOptions) {
	return async (): Promise<HealthResponse> => {
		const checks: HealthResponse["checks"] = {};

		// Add system checks
		checks.system = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			latency: 0,
		};

		// Check memory usage
		const memoryUsage = process.memoryUsage();
		checks.memory = {
			status: memoryUsage.heapUsed < 0.8 * memoryUsage.heapTotal ? "healthy" : "degraded",
			message: `Memory usage: ${Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100} MB`,
			timestamp: new Date().toISOString(),
		};

		// Check uptime
		const uptime = process.uptime();

		// Check dependencies if provided
		if (options.dependencies) {
			for (const dep of options.dependencies) {
				try {
					const depStartTime = Date.now();
					const result = await dep.check();
					const latency = Date.now() - depStartTime;

					checks[dep.name] = {
						status: result.status,
						message: result.message,
						latency,
						timestamp: new Date().toISOString(),
					};
				} catch (error) {
					checks[dep.name] = {
						status: "unhealthy",
						message: error instanceof Error ? error.message : "Unknown error",
						timestamp: new Date().toISOString(),
					};
				}
			}
		}

		// Determine overall status
		let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
		for (const check of Object.values(checks)) {
			if (check.status === "unhealthy") {
				overallStatus = "unhealthy";
				break;
			}
			if (check.status === "degraded" && overallStatus === "healthy") {
				overallStatus = "degraded";
			}
		}

		const response: HealthResponse = {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			service: options.service,
			checks,
			uptime,
			memoryUsage: {
				heapUsed: memoryUsage.heapUsed,
				heapTotal: memoryUsage.heapTotal,
				rss: memoryUsage.rss,
			},
		};

		if (options.version) {
			response.version = options.version;
		}

		return response;
	};
}

// Utility function to check database connectivity
export async function checkDatabaseConnection(
	_connectionString: string,
): Promise<{ status: "healthy" | "degraded" | "unhealthy"; message?: string }> {
	try {
		// This is a placeholder - actual implementation would depend on the database driver
		// For example, with Prisma:
		// await prisma.$queryRaw`SELECT 1`;

		// For now, we'll simulate a check
		const startTime = Date.now();

		// Simulate async operation
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

		const latency = Date.now() - startTime;

		if (latency > 1000) {
			return {
				status: "degraded",
				message: `Database connection is slow (${latency}ms)`,
			};
		}

		return {
			status: "healthy",
			message: `Database connection successful (${latency}ms)`,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			message: error instanceof Error ? error.message : "Database connection failed",
		};
	}
}

// Utility function to check Redis connectivity
export async function checkRedisConnection(
	_redisUrl: string,
): Promise<{ status: "healthy" | "degraded" | "unhealthy"; message?: string }> {
	try {
		// This is a placeholder - actual implementation would depend on the Redis client
		// For example, with ioredis:
		// await redis.ping();

		// Simulate async operation
		const startTime = Date.now();
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 30));
		const latency = Date.now() - startTime;

		if (latency > 200) {
			return {
				status: "degraded",
				message: `Redis connection is slow (${latency}ms)`,
			};
		}

		return {
			status: "healthy",
			message: `Redis connection successful (${latency}ms)`,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			message: error instanceof Error ? error.message : "Redis connection failed",
		};
	}
}

// Utility function to check HTTP service connectivity
export async function checkHttpService(
	_url: string,
): Promise<{ status: "healthy" | "degraded" | "unhealthy"; message?: string }> {
	try {
		// This is a placeholder - actual implementation would use fetch or axios
		// For example:
		// const response = await fetch(url, { timeout: 5000 });

		// Simulate async operation
		const startTime = Date.now();
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
		const latency = Date.now() - startTime;

		if (latency > 1000) {
			return {
				status: "degraded",
				message: `HTTP service is slow (${latency}ms)`,
			};
		}

		return {
			status: "healthy",
			message: `HTTP service check successful (${latency}ms)`,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			message: error instanceof Error ? error.message : "HTTP service check failed",
		};
	}
}
