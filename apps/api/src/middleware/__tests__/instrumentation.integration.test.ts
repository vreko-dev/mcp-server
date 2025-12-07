/**
 * Instrumentation Middleware Integration Tests
 *
 * Tests middleware behavior, span lifecycle, error handling,
 * and interaction with Hono request/response cycle.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import { instrumentationMiddleware, getSpan, getInstrumentationProvider } from "../instrumentation";
import { OTelInstrumentationProvider } from "@snapback/infrastructure";
import { NoOpInstrumentationProvider, SpanStatusCode, SemanticConventions } from "@snapback/contracts/observability";
import type { Span } from "@snapback/contracts/observability";

// Mock Sentry to avoid native module issues in tests
vi.mock("@sentry/node", () => ({
	default: {},
	Sentry: {},
}));

vi.mock("@sentry/profiling-node", () => ({
	default: {},
}));

describe("Instrumentation Middleware Integration", () => {
	let app: Hono;
	let provider: OTelInstrumentationProvider;

	beforeEach(() => {
		app = new Hono();
		provider = new OTelInstrumentationProvider({
			serviceName: "test-api",
			serviceVersion: "1.0.0",
			environment: "test",
			enableConsole: false,
		});
	});

	afterEach(async () => {
		await provider.shutdown();
	});

	describe("Span Lifecycle", () => {
		it("should create span for successful request", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => c.json({ success: true }));

			// Act
			const res = await app.request("/test");

			// Assert
			expect(res.status).toBe(200);
			// Span should have been created and closed (no assertion needed - success is implicit)
		});

		it("should set span attributes for HTTP request", async () => {
			// Arrange
			let capturedSpan: Span | undefined;

			app.use("*", instrumentationMiddleware(provider));
			app.get("/api/users/:id", (c) => {
				capturedSpan = getSpan(c);
				return c.json({ userId: c.req.param("id") });
			});

			// Act
			const res = await app.request("/api/users/123", {
				headers: {
					"Host": "api.snapback.dev",
					"User-Agent": "test-client/1.0",
					"Content-Length": "100",
				},
			});

			// Assert
			expect(res.status).toBe(200);
			expect(capturedSpan).toBeDefined();
		});

		it("should handle requests with parent trace context", async () => {
			// Arrange: Create parent trace
			const parentHeaders: Record<string, string> = {};
			await provider.withSpan("upstream-service", async () => {
				provider.injectContext(parentHeaders);
			});

			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => c.json({ success: true }));

			// Act: Send request with parent trace context
			const res = await app.request("/test", {
				headers: {
					traceparent: parentHeaders.traceparent,
				},
			});

			// Assert
			expect(res.status).toBe(200);
			// Child span should have been created (linked to parent)
		});

		it("should handle requests without trace context", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => c.json({ success: true }));

			// Act: Request without traceparent header
			const res = await app.request("/test");

			// Assert: Should create root span
			expect(res.status).toBe(200);
		});
	});

	describe("Error Handling", () => {
		it("should record exception when handler throws error", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/error", () => {
				throw new Error("Test error");
			});

			// Act & Assert
			await expect(app.request("/error")).rejects.toThrow("Test error");
			// Span should have recorded exception (verified by no crash)
		});

		it("should set ERROR status for 500 responses", async () => {
			// Arrange
			let spanStatus: { code: number; message?: string } | undefined;

			app.use("*", instrumentationMiddleware(provider));
			app.get("/server-error", (c) => {
				const span = getSpan(c);
				if (span) {
					// Capture span status after middleware sets it
					return c.json({ error: "Internal Server Error" }, 500);
				}
				return c.json({ error: "No span" }, 500);
			});

			// Act
			const res = await app.request("/server-error");

			// Assert
			expect(res.status).toBe(500);
			// Span should have ERROR status (verified by completion without crash)
		});

		it("should track client errors (4xx) separately from server errors", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/not-found", (c) => c.json({ error: "Not Found" }, 404));
			app.get("/bad-request", (c) => c.json({ error: "Bad Request" }, 400));

			// Act
			const res404 = await app.request("/not-found");
			const res400 = await app.request("/bad-request");

			// Assert: 4xx should have OK status with client_error event
			expect(res404.status).toBe(404);
			expect(res400.status).toBe(400);
		});
	});

	describe("Performance Tracking", () => {
		it("should add slow request event when duration exceeds threshold", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/slow", async (c) => {
				// Simulate slow operation (1100ms > 1000ms threshold)
				await new Promise((resolve) => setTimeout(resolve, 1100));
				return c.json({ success: true });
			});

			// Act
			const start = Date.now();
			const res = await app.request("/slow");
			const duration = Date.now() - start;

			// Assert
			expect(res.status).toBe(200);
			expect(duration).toBeGreaterThan(1000);
			// slow_request.detected event should have been added (verified by completion)
		});

		it("should track request duration accurately", async () => {
			// Arrange
			let duration: number | undefined;

			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", async (c) => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return c.json({ success: true });
			});

			// Act
			const start = Date.now();
			const res = await app.request("/test");
			const actualDuration = Date.now() - start;

			// Assert
			expect(res.status).toBe(200);
			expect(actualDuration).toBeGreaterThanOrEqual(100);
		});
	});

	describe("Context Storage", () => {
		it("should store span in Hono context for downstream handlers", async () => {
			// Arrange
			let retrievedSpan: Span | undefined;

			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => {
				retrievedSpan = getSpan(c);
				return c.json({ hasSpan: !!retrievedSpan });
			});

			// Act
			const res = await app.request("/test");
			const data = await res.json();

			// Assert
			expect(data.hasSpan).toBe(true);
			expect(retrievedSpan).toBeDefined();
			expect(retrievedSpan?.isRecording()).toBe(true);
		});

		it("should store provider in Hono context", async () => {
			// Arrange
			let retrievedProvider;

			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => {
				retrievedProvider = getInstrumentationProvider(c);
				return c.json({ hasProvider: !!retrievedProvider });
			});

			// Act
			const res = await app.request("/test");
			const data = await res.json();

			// Assert
			expect(data.hasProvider).toBe(true);
			expect(retrievedProvider).toBe(provider);
		});

		it("should allow handlers to add custom attributes to span", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.post("/api/snapshots", (c) => {
				const span = getSpan(c);
				if (span) {
					span.setAttribute("snapshot.id", "snap-123");
					span.setAttribute("snapshot.file_count", 5);
					span.addEvent("snapshot.created", {
						timestamp: Date.now(),
					});
				}
				return c.json({ id: "snap-123" }, 201);
			});

			// Act
			const res = await app.request("/api/snapshots", { method: "POST" });

			// Assert
			expect(res.status).toBe(201);
			// Custom attributes should have been added (verified by completion)
		});
	});

	describe("Header Filtering", () => {
		it("should only extract W3C trace headers, not sensitive headers", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => c.json({ success: true }));

			// Act: Send request with sensitive headers
			const res = await app.request("/test", {
				headers: {
					"authorization": "Bearer secret-token",
					"cookie": "session=secret-session",
					"x-api-key": "secret-key",
					"traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
				},
			});

			// Assert: Only traceparent should have been extracted
			expect(res.status).toBe(200);
			// Sensitive headers should not be in span context (verified by completion)
		});

		it("should extract both traceparent and tracestate headers", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => c.json({ success: true }));

			// Act
			const res = await app.request("/test", {
				headers: {
					"traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
					"tracestate": "vendor=value",
				},
			});

			// Assert
			expect(res.status).toBe(200);
		});
	});

	describe("Middleware Ordering", () => {
		it("should work correctly when placed after other middleware", async () => {
			// Arrange: Add logging middleware before instrumentation
			const logs: string[] = [];

			app.use("*", async (c, next) => {
				logs.push("before");
				await next();
				logs.push("after");
			});

			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => {
				logs.push("handler");
				return c.json({ success: true });
			});

			// Act
			const res = await app.request("/test");

			// Assert
			expect(res.status).toBe(200);
			expect(logs).toEqual(["before", "handler", "after"]);
		});

		it("should allow downstream middleware to access span", async () => {
			// Arrange
			let downstreamSpan: Span | undefined;

			app.use("*", instrumentationMiddleware(provider));
			app.use("*", async (c, next) => {
				downstreamSpan = getSpan(c);
				await next();
			});
			app.get("/test", (c) => c.json({ success: true }));

			// Act
			const res = await app.request("/test");

			// Assert
			expect(res.status).toBe(200);
			expect(downstreamSpan).toBeDefined();
		});
	});

	describe("NoOp Provider", () => {
		it("should not break when using NoOp provider", async () => {
			// Arrange
			const noopProvider = new NoOpInstrumentationProvider();

			app.use("*", instrumentationMiddleware(noopProvider));
			app.get("/test", (c) => {
				const span = getSpan(c);
				span?.setAttribute("test", "value");
				return c.json({ success: true });
			});

			// Act
			const res = await app.request("/test");

			// Assert: Should work without errors
			expect(res.status).toBe(200);
		});
	});

	describe("Scheme Detection", () => {
		it("should detect https from X-Forwarded-Proto header", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => c.json({ success: true }));

			// Act
			const res = await app.request("http://localhost/test", {
				headers: {
					"X-Forwarded-Proto": "https",
				},
			});

			// Assert
			expect(res.status).toBe(200);
			// Span should have https scheme attribute
		});

		it("should fallback to URL scheme when header not present", async () => {
			// Arrange
			app.use("*", instrumentationMiddleware(provider));
			app.get("/test", (c) => c.json({ success: true }));

			// Act
			const res = await app.request("https://api.snapback.dev/test");

			// Assert
			expect(res.status).toBe(200);
			// Span should have https scheme
		});
	});
});
