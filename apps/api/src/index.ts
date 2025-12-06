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
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { openApiHandler, rpcHandler } from "@/orpc/handler.js";
import { router } from "@/orpc/router.js";
import {
	adaptiveTurnstile,
	verifyChallenge,
} from "./middleware/adaptive-turnstile";
import { enforceRLS } from "./middleware/rls-tenant";
import { csrfProtectionMiddleware } from "./middleware/security-csrf";
import { rateLimitingMiddleware } from "./middleware/security-rate-limit";
import { extractAuthContext } from "./middleware/session";
import apiRoutes from "./routes";
import healthRoute from "./routes/health";
import securityRoutes from "./routes/security/reauth";

const app: HonoApp = new Hono()
	.basePath("/api")
	// Security headers middleware (FIRST)
	.use(
		"*",
		secureHeaders({
			strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
			xFrameOptions: "DENY",
			xContentTypeOptions: "nosniff",
			referrerPolicy: "strict-origin-when-cross-origin",
			permissionsPolicy: {
				camera: [],
				microphone: [],
				geolocation: [],
			},
		}),
	)
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
	// CORS middleware
	.use(
		cors({
			origin: getBaseUrl(),
			allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
			allowMethods: ["POST", "GET", "OPTIONS"],
			exposeHeaders: [
				"Content-Length",
				"X-RateLimit-Remaining",
				"X-RateLimit-Reset",
			],
			maxAge: 600,
			credentials: true,
		}),
	)
	// Security: Rate Limiting (reject abusers early)
	.use("/api/*", rateLimitingMiddleware())
	// Security: CSRF Protection (validate state-changing requests)
	.use("/api/*", csrfProtectionMiddleware())
	// Session extraction (EARLY - before RLS and other middleware)
	.use("*", extractAuthContext)
	// RLS enforcement for org-scoped routes
	.use("/v1/*", enforceRLS)
	// Adaptive Turnstile for auth endpoints
	.use("/auth/sign-in/*", adaptiveTurnstile)
	.use("/auth/sign-up/*", adaptiveTurnstile)
	.use("/auth/otp/*", adaptiveTurnstile)
	// Challenge verification endpoint
	.post("/challenge/verify", verifyChallenge)
	// Security routes (step-up, passkey status, etc.)
	.route("/security", securityRoutes)
	// Auth handler
	.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
	// OpenAPI schema endpoint
	.get("/openapi", async (c) => {
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
	.get("/orpc-openapi", async (c) => {
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
		"/docs",
		Scalar({
			theme: "saturn",
			url: "/api/openapi",
		}),
	)
	// Payments webhook handler
	.post("/webhooks/payments", (c) => paymentsWebhookHandler(c.req.raw))
	// Health check route
	.route("/health", healthRoute)
	// API routes
	.route("/v1", apiRoutes)
	// oRPC handlers (for RPC and OpenAPI)
	.use("*", async (c, next) => {
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

// Centralized error handling (LAST - catches all errors)
// HTTPException errors are handled with structured logging
// Unexpected errors return 500 with minimal detail
app.onError((err, c) => {
	if (err instanceof HTTPException) {
		// Expected HTTP exception - log as warning
		const status = err.status;
		const message = err.message;
		const cause = err.cause as Record<string, unknown>;

		logger.warn("HTTP exception thrown", {
			status,
			message,
			code: cause?.code,
			path: c.req.path,
			method: c.req.method,
		});

		// Return the proper error response
		return err.getResponse();
	}

	// Unexpected error - log as error
	logger.error("Unhandled error in API", {
		message: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? err.stack : undefined,
		path: c.req.path,
		method: c.req.method,
	});

	// Return generic 500 error (don't expose internal details)
	return c.json(
		{
			error: "Internal Server Error",
		},
		500,
	);
});

// Not found handler (FINAL FALLBACK - handles 404s)
app.notFound((c) => {
	return c.json(
		{
			error: "Route not found",
			path: c.req.path,
		},
		404,
	);
});

// Note: Security middleware (rate limiting, CSRF, auth) is registered above
// See middleware/security-*.ts for implementations

export default app;

// Vercel serverless function handler
export const GET = (req: Request) => app.fetch(req);
export const POST = (req: Request) => app.fetch(req);
export const PUT = (req: Request) => app.fetch(req);
export const PATCH = (req: Request) => app.fetch(req);
export const DELETE = (req: Request) => app.fetch(req);
export const OPTIONS = (req: Request) => app.fetch(req);
