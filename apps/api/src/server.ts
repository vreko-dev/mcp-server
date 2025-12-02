import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Scalar } from "@scalar/hono-api-reference";
import { auth } from "@snapback/auth";
import { config, getBaseUrl } from "@snapback/config";
import { logger } from "@snapback/infrastructure";
import { webhookHandler as paymentsWebhookHandler } from "@snapback/integrations/stripe/provider/stripe";
import type { Hono as HonoApp } from "hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { openApiHandler, rpcHandler } from "@/orpc/handler.js";
import { router } from "@/orpc/router.js";
import { createRateLimitMiddleware } from "./middleware/ratelimit.js";
import { requestLoggingMiddleware } from "./middleware/request-logging.js";
import healthRoute from "./routes/health.js";
import protectedExamplesRoute from "./routes/protected-examples.js";
import apiRoutes from "./routes/index.js";
import { testRoutes } from "./routes/test/index.js";

// Auth handler app - Better Auth expects raw requests with path rewriting
const authApp: HonoApp = new Hono().all("*", async (c) => {
	// Rewrite request path for Better Auth
	// /api/auth/** -> /auth/**
	const originalUrl = new URL(c.req.raw.url);
	const newPath = originalUrl.pathname.replace(/^\/(?:api\/)?/, "/");
	const rewrittenUrl = new URL(originalUrl);
	rewrittenUrl.pathname = newPath;

	// Create a new request with the rewritten URL
	const rewrittenRequest = new Request(rewrittenUrl, {
		method: c.req.raw.method,
		headers: c.req.raw.headers,
		body: c.req.raw.body,
		duplex: "half" as any,
	});

	return auth.handler(rewrittenRequest);
});

// Create the main API app WITHOUT basePath
const apiApp: HonoApp = new Hono()
	// ... existing code ...
	.route("/api/auth", authApp)
	// Rate limiting middleware - with optional Redis support
	// Pass Redis client if available: createRateLimitMiddleware(redisClient)
	.use("*", createRateLimitMiddleware())
	// Request logging middleware
	.use("*", requestLoggingMiddleware)
	// Body limit middleware - 10MB max size
	.use(
		bodyLimit({
			maxSize: 10 * 1024 * 1024, // 10MB
			onError: (c) => {
				return c.json(
					{
						error: "Payload too large",
						message: "Request body exceeds 10MB limit",
					},
					413,
				);
			},
		}),
	)
	// Logger middleware
	.use(
		honoLogger((message, ...rest) => {
			// Convert hono logger format to our contracts logger format
			if (rest.length > 0) {
				logger.info(message, { args: rest });
			} else {
				logger.info(message);
			}
		}),
	)
	// Cors middleware - updated for cross-domain requests
	.use(
		cors({
			origin: (origin) => {
				// Allow requests from web app domain and localhost for development
				const allowedOrigins = [
					"http://localhost:3000",
					"https://localhost:3000",
					"http://snapback.dev",
					"https://snapback.dev",
					"http://console.snapback.dev",
					"https://console.snapback.dev",
					"http://new-docs.snapback.dev",
					"https://new-docs.snapback.dev",
					"http://api.snapback.dev",
					"https://api.snapback.dev",
					"http://mcp.snapback.dev",
					"https://mcp.snapback.dev",
					// Add more domains as needed for production
				];

				if (!origin) {
					return "*"; // Allow requests with no origin (mobile apps, etc.)
				}

				if (allowedOrigins.includes(origin)) {
					return origin;
				}

				// For development, allow localhost with any port
				if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost:")) {
					return origin;
				}

				// For development, allow all *.snapback.dev subdomains
				if (process.env.NODE_ENV === "development" && origin.endsWith(".snapback.dev")) {
					return origin;
				}

				return ""; // Block other origins
			},
			allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
			allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE", "PATCH"],
			exposeHeaders: ["Content-Length", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
			maxAge: 600,
			credentials: true,
		}),
	)
	// OpenAPI schema endpoint
	.get("/api/openapi", async (c) => {
		const _authSchema = await auth.api.generateOpenAPISchema();

		const appSchema = await new OpenAPIGenerator({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}).generate(router, {
			info: {
				title: `${config.appName} API`,
				version: "1.0.0",
			},
			servers: [
				{
					url: getBaseUrl(),
					description: "API server",
				},
			],
		});

		// Return app schema (auth schema merging not needed without openapi-merge dependency)
		return c.json(appSchema);
	})
	.get("/api/orpc-openapi", async (c) => {
		const appSchema = await new OpenAPIGenerator({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}).generate(router, {
			info: {
				title: `${config.appName} API`,
				version: "1.0.0",
			},
		});

		return c.json(appSchema);
	})
	// Scalar API reference based on OpenAPI schema
	.get(
		"/api/docs",
		Scalar({
			theme: "saturn",
			url: "/api/openapi",
		}),
	)
	// Payments webhook handler
	.post("/api/webhooks/payments", (c) => paymentsWebhookHandler(c.req.raw))
	// Health check (with database dependency monitoring)
	.route("/api/health", healthRoute)
	// Protected route examples (Auth + validation + RBAC)
	.route("/api", protectedExamplesRoute)
	// Test-only routes (NODE_ENV=test guard inside)
	.route("/api/test", testRoutes)
	// API routes
	.route("/api/v1", apiRoutes)
	// oRPC handlers (for RPC and OpenAPI) - skip auth routes
	.use("*", async (c, next) => {
		// Skip auth routes - let Better Auth handler process them
		if (c.req.path.startsWith("/api/auth/")) {
			return await next();
		}

		const context = {
			headers: c.req.raw.headers,
		};

		const isRpc = c.req.path.includes("/rpc/");

		const handler = isRpc ? rpcHandler : openApiHandler;

		const prefix = isRpc ? "/api/rpc" : "/api";

		const { matched, response } = await handler.handle(c.req.raw, {
			prefix,
			context,
		});

		if (matched) {
			return c.newResponse(response.body, response);
		}

		await next();
	});

// Export apiApp as the main app
const app = apiApp;

// Note: Rate limiting is handled by individual route middlewares
// See src/middleware/ratelimit.ts for rate limiting implementation

// Start the server
const port = Number.parseInt(process.env.PORT || "3001", 10);
console.log(`🚀 API Server ready at http://localhost:${port}/api`);

export { app };

// Also export as default for compatibility
export default app;

// Vercel serverless function handlers
export const GET = (req: Request) => app.fetch(req);
export const POST = (req: Request) => app.fetch(req);
export const PUT = (req: Request) => app.fetch(req);
export const PATCH = (req: Request) => app.fetch(req);
export const DELETE = (req: Request) => app.fetch(req);
export const OPTIONS = (req: Request) => app.fetch(req);

// If running directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
	// Use Node.js HTTP server instead of Bun
	const http = await import("node:http");
	const server = http.createServer((req, res) => {
		// Convert Node.js request to Request object
		const request = new Request(`http://localhost:${port}${req.url}`, {
			method: req.method,
			headers: Object.entries(req.headers).reduce((headers, [key, value]) => {
				if (Array.isArray(value)) {
					for (const v of value) {
						headers.append(key, v);
					}
				} else if (value) {
					headers.append(key, value);
				}
				return headers;
			}, new Headers()),
			body: req.method !== "GET" && req.method !== "HEAD" ? req : null,
		});

		// Handle the request with Hono app
		// Fix: Properly handle the Promise without calling .then on it directly
		const fetchPromise = app.fetch(request) as Promise<Response>;
		fetchPromise
			.then(async (response: Response) => {
				res.statusCode = response.status;
				response.headers.forEach((value: string, key: string) => {
					res.setHeader(key, value);
				});
				return response.arrayBuffer();
			})
			.then((buffer: ArrayBuffer) => {
				res.end(Buffer.from(buffer));
			})
			.catch((error: Error) => {
				console.error("Server error:", error);
				res.statusCode = 500;
				res.end("Internal Server Error");
			});
	});

	server.listen(port, () => {
		console.log(`🚀 API Server running on port ${port}`);
		console.log(`📝 Docs available at http://localhost:${port}/api/docs`);
		console.log(`🏥 Health check at http://localhost:${port}/api/health`);
	});
}
