import { checkHttpService, createHealthCheck } from "@snapback/health";
import type { Context } from "hono";
import { Hono } from "hono";

const app = new Hono();

// Create health check with API dependency
const healthCheck = createHealthCheck({
	service: "snapback-mcp",
	version: "1.0.0",
	dependencies: [
		{
			name: "api",
			check: () => checkHttpService(process.env.API_URL || "http://api:8080"),
		},
	],
});

// GET /health
app.get("/", async (c: Context) => {
	const health = await healthCheck();
	const statusCode = health.status === "healthy" ? 200 : 503;
	return c.json(health, statusCode);
});

export default app;
