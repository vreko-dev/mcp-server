import { checkDatabaseConnection, checkRedisConnection, createHealthCheck } from "@snapback/health";
import { logger } from "@snapback/infrastructure";
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
	status: "healthy" | "unhealthy";
	responseTime: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		// STUB: Mock Stripe check
		// In production, this would call Stripe API
		const stripeKey = process.env.STRIPE_SECRET_KEY;
		if (!stripeKey) {
			return {
				status: "unhealthy",
				responseTime: Date.now() - start,
				error: "Stripe API key not configured",
			};
		}

		// For now, just verify key exists (5ms)
		await new Promise((resolve) => setTimeout(resolve, 5));

		return {
			status: "healthy",
			responseTime: Date.now() - start,
		};
	} catch (err) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
}

// Auth provider health check
async function checkAuthHealth(): Promise<{
	status: "healthy" | "unhealthy";
	responseTime: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		// STUB: Mock auth check
		// In production, verify Better Auth endpoints are responding
		await new Promise((resolve) => setTimeout(resolve, 10));

		return {
			status: "healthy",
			responseTime: Date.now() - start,
		};
	} catch (err) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
}

// Create main health check
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
			check: checkStripeHealth,
		},
		{
			name: "auth",
			check: checkAuthHealth,
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
			statusCode
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
			503
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
			statusCode
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
			503
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
				503
			);
		}

		return c.json({
			status: "ready",
			timestamp: new Date().toISOString(),
		});
	} catch (err) {
		return c.json(
			{
				status: "not_ready",
				timestamp: new Date().toISOString(),
				message: "Readiness check failed",
			},
			503
		);
	}
});

export default app;
