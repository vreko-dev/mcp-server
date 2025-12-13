import { logger } from "@snapback/infrastructure";
import { checkDatabaseConnection, checkRedisConnection, createHealthCheck } from "@snapback/infrastructure/health";
import { Hono } from "hono";

const app = new Hono();

/**
 * Health Check Configuration
 *
 * Services checked:
 * - Database: PostgreSQL connectivity (critical)
 * - Redis: Cache connectivity (optional)
 * - Stripe: Payment API (optional)
 * - Auth: Authentication provider (optional)
 */

// Stripe API health check
async function checkStripeHealth(): Promise<{
	status: "healthy" | "unhealthy" | "not_configured";
	responseTime: number;
	error?: string;
	configured: boolean;
}> {
	const start = Date.now();
	const stripeKey = process.env.STRIPE_SECRET_KEY;

	// Report configuration status honestly
	if (!stripeKey) {
		return {
			status: "not_configured",
			responseTime: Date.now() - start,
			error: "Stripe API key not configured",
			configured: false,
		};
	}

	try {
		// Validate key format (sk_live_ or sk_test_ prefix)
		const isValidFormat = stripeKey.startsWith("sk_live_") || stripeKey.startsWith("sk_test_");
		if (!isValidFormat) {
			return {
				status: "unhealthy",
				responseTime: Date.now() - start,
				error: "Invalid Stripe API key format",
				configured: true,
			};
		}

		// TODO: Add real Stripe API ping when Stripe SDK is integrated
		// For now, key format validation is the best we can do without SDK
		return {
			status: "healthy",
			responseTime: Date.now() - start,
			configured: true,
		};
	} catch (err) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: err instanceof Error ? err.message : "Unknown error",
			configured: true,
		};
	}
}

// Auth provider health check
async function checkAuthHealth(): Promise<{
	status: "healthy" | "unhealthy" | "not_configured";
	responseTime: number;
	error?: string;
	configured: boolean;
}> {
	const start = Date.now();

	// Check if Better Auth is configured
	const authSecret = process.env.BETTER_AUTH_SECRET;
	const authUrl = process.env.BETTER_AUTH_URL || process.env.AUTH_URL;

	if (!authSecret) {
		return {
			status: "not_configured",
			responseTime: Date.now() - start,
			error: "Better Auth secret not configured",
			configured: false,
		};
	}

	try {
		// Validate auth URL is accessible if configured
		if (authUrl) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			try {
				const response = await fetch(`${authUrl}/api/auth/session`, {
					method: "GET",
					signal: controller.signal,
				});
				clearTimeout(timeoutId);

				// 401 is expected when not authenticated, 200 when authenticated
				// Both indicate the auth endpoint is responding
				if (response.status === 200 || response.status === 401) {
					return {
						status: "healthy",
						responseTime: Date.now() - start,
						configured: true,
					};
				}

				return {
					status: "unhealthy",
					responseTime: Date.now() - start,
					error: `Auth endpoint returned ${response.status}`,
					configured: true,
				};
			} catch (fetchErr) {
				clearTimeout(timeoutId);
				if ((fetchErr as Error).name === "AbortError") {
					return {
						status: "unhealthy",
						responseTime: Date.now() - start,
						error: "Auth endpoint timeout (5s)",
						configured: true,
					};
				}
				throw fetchErr;
			}
		}

		// Auth secret configured but no URL to ping - assume healthy
		return {
			status: "healthy",
			responseTime: Date.now() - start,
			configured: true,
		};
	} catch (err) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: err instanceof Error ? err.message : "Unknown error",
			configured: true,
		};
	}
}

// Create main health check
// Wrapper functions to adapt rich health checks to infrastructure interface
const healthCheck = createHealthCheck({
	service: "snapback-api",
	version: "1.0.0",
	dependencies: [
		{
			name: "database",
			check: () => checkDatabaseConnection(process.env.DATABASE_URL || ""),
		},
		{
			name: "redis",
			check: () => checkRedisConnection(process.env.REDIS_URL || ""),
		},
		{
			name: "stripe",
			check: async () => {
				const result = await checkStripeHealth();
				// Map "not_configured" to "degraded" for infrastructure compatibility
				const status = result.status === "not_configured" ? "degraded" : result.status;
				return {
					status: status as "healthy" | "degraded" | "unhealthy",
					message: result.configured
						? result.error
						: `[Not Configured] ${result.error || "Stripe integration not set up"}`,
				};
			},
		},
		{
			name: "auth",
			check: async () => {
				const result = await checkAuthHealth();
				// Map "not_configured" to "degraded" for infrastructure compatibility
				const status = result.status === "not_configured" ? "degraded" : result.status;
				return {
					status: status as "healthy" | "degraded" | "unhealthy",
					message: result.configured
						? result.error
						: `[Not Configured] ${result.error || "Auth integration not set up"}`,
				};
			},
		},
	],
});

// GET /health - Simple health check
app.get("/", async (c) => {
	const start = Date.now();
	try {
		const health = await healthCheck();
		const responseTime = Date.now() - start;
		const statusCode = health.status === "healthy" ? 200 : 503;

		logger.info("Health check", {
			status: health.status,
			responseTime,
		});

		return c.json(
			{
				status: health.status === "healthy" ? "ok" : "error",
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
			},
			statusCode,
		);
	} catch (err) {
		logger.error("Health check failed", {
			error: err instanceof Error ? err.message : String(err),
		});

		return c.json(
			{
				status: "error",
				timestamp: new Date().toISOString(),
				message: "Health check failed",
			},
			503,
		);
	}
});

// GET /detailed - Detailed health check with all dependencies
app.get("/detailed", async (c) => {
	const start = Date.now();
	try {
		const health = await healthCheck();
		const responseTime = Date.now() - start;
		const statusCode = health.status === "healthy" ? 200 : 503;

		logger.info("Detailed health check", {
			status: health.status,
			responseTime,
		});

		return c.json(
			{
				status: health.status === "healthy" ? "ok" : "error",
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				responseTime,
			},
			statusCode,
		);
	} catch (err) {
		logger.error("Detailed health check failed", {
			error: err instanceof Error ? err.message : String(err),
		});

		return c.json(
			{
				status: "error",
				timestamp: new Date().toISOString(),
				message: "Health check failed",
			},
			503,
		);
	}
});

// GET /live - Kubernetes liveness probe (is process alive?)
app.get("/live", async (c) => {
	return c.json({
		status: "alive",
		timestamp: new Date().toISOString(),
	});
});

// GET /ready - Kubernetes readiness probe (is app ready to serve?)
app.get("/ready", async (c) => {
	try {
		const health = await healthCheck();

		// Ready if overall health is healthy
		const isReady = health.status === "healthy";

		if (!isReady) {
			return c.json(
				{
					status: "not_ready",
					timestamp: new Date().toISOString(),
					message: "Critical dependencies unavailable",
				},
				503,
			);
		}

		return c.json({
			status: "ready",
			timestamp: new Date().toISOString(),
		});
	} catch (_err) {
		return c.json(
			{
				status: "not_ready",
				timestamp: new Date().toISOString(),
				message: "Readiness check failed",
			},
			503,
		);
	}
});

export default app;
