/**
 * OpenTelemetry Instrumentation Middleware
 *
 * Layer 3: Middleware integration for distributed tracing.
 * Creates spans for HTTP requests and propagates context across service boundaries.
 */

import type { Context, Next } from "hono";
import type { InstrumentationProvider, Span } from "@snapback/contracts/observability";
import {
	SemanticConventions,
	SpanKind,
	extractTraceHeaders,
	setHttpRequestAttributes,
	setSpanStatusFromHttp,
} from "@snapback/contracts/observability";

// Slow request threshold in milliseconds
const SLOW_REQUEST_THRESHOLD_MS = 1000;

/**
 * Instrumentation middleware factory
 *
 * @param provider - InstrumentationProvider instance (OTel or NoOp)
 * @returns Hono middleware function
 *
 * @example
 * ```typescript
 * import { OTelInstrumentationProvider } from "@snapback/infrastructure/tracing";
 *
 * const provider = new OTelInstrumentationProvider({
 *   serviceName: 'snapback-api',
 *   collectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
 * });
 *
 * app.use("*", instrumentationMiddleware(provider));
 * ```
 */
export function instrumentationMiddleware(provider: InstrumentationProvider) {
	return async (c: Context, next: Next): Promise<void> => {
		const method = c.req.method;
		const path = c.req.path;
		const route = c.req.routePath || path; // Use route pattern if available

		// Extract trace context from incoming headers (W3C Trace Context)
		// Only include propagation headers, filter out sensitive data
		const incomingHeaders = extractTraceHeaders(c.req.raw.headers);
		const parentContext = provider.extractContext(incomingHeaders);

		// Create span for this HTTP request with parent context if available
		await provider.withSpan(
			`HTTP ${method} ${route}`,
			async (span: Span) => {
				// Set HTTP semantic attributes using utility
				setHttpRequestAttributes(span, {
					method,
					url: c.req.url,
					target: path,
					route,
					host: c.req.header('Host'),
					userAgent: c.req.header('User-Agent'),
					forwardedProto: c.req.header('X-Forwarded-Proto'),
				});

				// Add content length if available
				const contentLength = c.req.header('Content-Length');
				if (contentLength) {
					span.setAttribute(SemanticConventions.Http.REQUEST_CONTENT_LENGTH, Number.parseInt(contentLength, 10));
				}

				// Add service metadata
				span.setAttribute(SemanticConventions.Service.NAME, "snapback-api");

				// Store span in context for downstream handlers
				c.set("span", span);
				c.set("instrumentationProvider", provider);

				// Add request event
				span.addEvent("request.start", {
					"request.path": path,
					"request.method": method,
				});

				const startTime = Date.now();

				try {
					// Process request
					await next();

					// Record successful response
					const duration = Date.now() - startTime;
					const status = c.res.status || 200;

					// Set HTTP response attributes and span status using utility
					setSpanStatusFromHttp(span, status, { addErrorEvent: status >= 400 });
					span.setAttribute(SemanticConventions.Performance.DURATION_MS, duration);

					// Add response content length if available
					const responseContentLength = c.res.headers.get('Content-Length');
					if (responseContentLength) {
						span.setAttribute(SemanticConventions.Http.RESPONSE_CONTENT_LENGTH, Number.parseInt(responseContentLength, 10));
					}

					// Add response event
					span.addEvent("request.complete", {
						"response.status": status,
						"response.duration_ms": duration,
					});

					// Warn on slow requests (only in span, not duplicate log)
					if (duration > SLOW_REQUEST_THRESHOLD_MS) {
						span.addEvent("slow_request.detected", {
							duration_ms: duration,
							threshold_ms: SLOW_REQUEST_THRESHOLD_MS,
						});
					}
				} catch (error) {
					// Record exception
					const duration = Date.now() - startTime;
					span.setAttribute(SemanticConventions.Performance.DURATION_MS, duration);

					// Set HTTP status code and span status using utility
					const status = c.res.status || 500;
					const errorMessage = error instanceof Error ? error.message : "Unknown error";
					setSpanStatusFromHttp(span, status, {
						addErrorEvent: true,
						errorMessage,
					});

					if (error instanceof Error) {
						span.recordException(error);
						span.setAttribute(SemanticConventions.Error.TYPE, error.name);
						span.setAttribute(SemanticConventions.Error.MESSAGE, error.message);
					}

					// Re-throw to let error handler process
					throw error;
				}
			},
			{
				kind: SpanKind.SERVER, // This is a server-side span
				parent: parentContext || undefined, // Pass parent context for distributed tracing
			},
		);
	};
}

/**
 * Get current span from Hono context
 * Use in handlers to add custom attributes/events
 *
 * @example
 * ```typescript
 * app.post("/api/snapshots", async (c) => {
 *   const span = getSpan(c);
 *   span?.setAttribute("snapshot.id", snapshotId);
 *   span?.addEvent("snapshot.created");
 *   // ... handler logic
 * });
 * ```
 */
export function getSpan(c: Context): Span | undefined {
	return c.get("span");
}

/**
 * Get instrumentation provider from Hono context
 * Use to create child spans for sub-operations
 *
 * @example
 * ```typescript
 * app.post("/api/snapshots", async (c) => {
 *   const provider = getInstrumentationProvider(c);
 *
 *   await provider.withSpan("db.insert.snapshot", async (span) => {
 *     span.setAttribute("db.system", "sqlite");
 *     await db.insert(snapshot);
 *   });
 * });
 * ```
 */
export function getInstrumentationProvider(c: Context): InstrumentationProvider | undefined {
	return c.get("instrumentationProvider");
}
