import { Hono } from "hono";

const app = new Hono();

// GET /api/v1/analytics/usage
app.get("/analytics/usage", async (c) => {
	// Mock analytics data
	const mockData = {
		data: [
			{ date: "2023-01-01", requests: 120, users: 42 },
			{ date: "2023-01-02", requests: 150, users: 45 },
			{ date: "2023-01-03", requests: 180, users: 50 },
		],
		summary: {
			totalEvents: 450,
			uniqueUsers: 50,
			timeframe: "last_3_days",
		},
	};

	return c.json(mockData);
});

// GET /api/v1/analytics/performance
app.get("/analytics/performance", async (c) => {
	// Mock performance data
	const mockData = {
		data: [
			{ endpoint: "/analyze", p95: 120, p99: 200, count: 1000 },
			{ endpoint: "/policy/evaluate", p95: 80, p99: 150, count: 800 },
			{ endpoint: "/telemetry/ingest", p95: 20, p99: 50, count: 2000 },
		],
		summary: {
			avgResponseTime: 73,
			totalRequests: 3800,
			errorRate: 0.02,
		},
	};

	return c.json(mockData);
});

// GET /api/v1/analytics/errors
app.get("/analytics/errors", async (c) => {
	// Mock error data
	const mockData = {
		data: [
			{ error: "Invalid API key", count: 12, lastSeen: "2023-01-03T10:00:00Z" },
			{
				error: "Rate limit exceeded",
				count: 8,
				lastSeen: "2023-01-03T09:30:00Z",
			},
			{ error: "Analysis timeout", count: 3, lastSeen: "2023-01-02T15:45:00Z" },
		],
		summary: {
			totalErrors: 23,
			uniqueErrors: 3,
			timeframe: "last_24_hours",
		},
	};

	return c.json(mockData);
});

export default app;
