import type { Span } from "./InstrumentationProvider";
import { SpanStatusCode } from "./types";
import { SemanticConventions } from "./SemanticConventions";

const TRACE_PARENT_HEADER = "traceparent";
const TRACE_STATE_HEADER = "tracestate";

/**
 * Extract only W3C Trace Context headers from incoming request headers.
 * Filters out all sensitive headers (Authorization, Cookie, etc.).
 *
 * @param headers - Request headers object
 * @returns Filtered headers containing only traceparent and tracestate
 */
export function extractTraceHeaders(
	headers: Headers | Record<string, string>,
): Record<string, string> {
	const traceHeaders: Record<string, string> = {};

	if (headers instanceof Headers) {
		headers.forEach((value, key) => {
			const lowerKey = key.toLowerCase();
			if (lowerKey === TRACE_PARENT_HEADER || lowerKey === TRACE_STATE_HEADER) {
				traceHeaders[key] = value;
			}
		});
	} else {
		for (const [key, value] of Object.entries(headers)) {
			const lowerKey = key.toLowerCase();
			if (lowerKey === TRACE_PARENT_HEADER || lowerKey === TRACE_STATE_HEADER) {
				traceHeaders[key] = value;
			}
		}
	}

	return traceHeaders;
}

/**
 * Set HTTP request attributes on a span using OTel semantic conventions.
 *
 * @param span - Span to set attributes on
 * @param request - HTTP request metadata
 */
export function setHttpRequestAttributes(
	span: Span,
	request: {
		method: string;
		url: string;
		target?: string;
		route?: string;
		host?: string;
		userAgent?: string;
		clientIp?: string;
		scheme?: string;
		forwardedProto?: string;
	},
): void {
	const {
		method,
		url,
		target,
		route,
		host,
		userAgent,
		clientIp,
		scheme,
		forwardedProto,
	} = request;

	// Core HTTP attributes
	span.setAttribute(SemanticConventions.Http.METHOD, method);

	if (target) {
		span.setAttribute(SemanticConventions.Http.TARGET, target);
	}

	if (route) {
		span.setAttribute(SemanticConventions.Http.ROUTE, route);
	}

	if (host) {
		span.setAttribute(SemanticConventions.Http.HOST, host);
	}

	if (userAgent) {
		span.setAttribute(SemanticConventions.Http.USER_AGENT, userAgent);
	}

	// Network attributes
	if (clientIp) {
		span.setAttribute(SemanticConventions.Network.PEER_IP, clientIp);
	}

	// Detect scheme from X-Forwarded-Proto or URL
	const detectedScheme =
		forwardedProto || scheme || (url.startsWith("https") ? "https" : "http");
	span.setAttribute(SemanticConventions.Http.SCHEME, detectedScheme);
}

/**
 * Set HTTP response attributes on a span and update span status based on status code.
 *
 * @param span - Span to set attributes on
 * @param statusCode - HTTP response status code
 * @param options - Optional configuration for error handling
 */
export function setSpanStatusFromHttp(
	span: Span,
	statusCode: number,
	options?: {
		/** Whether to add error event for 4xx/5xx responses */
		addErrorEvent?: boolean;
		/** Custom error message */
		errorMessage?: string;
	},
): void {
	span.setAttribute(SemanticConventions.Http.STATUS_CODE, statusCode);

	// Set span status based on HTTP status code
	if (statusCode >= 500) {
		// 5xx = server error
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: options?.errorMessage || `HTTP ${statusCode}`,
		});

		if (options?.addErrorEvent) {
			span.addEvent("server_error", {
				status: statusCode,
				...(options.errorMessage && { message: options.errorMessage }),
			});
		}
	} else if (statusCode >= 400) {
		// 4xx = client error (not a span error)
		span.setStatus({ code: SpanStatusCode.OK });

		if (options?.addErrorEvent) {
			span.addEvent("client_error", {
				status: statusCode,
				...(options.errorMessage && { message: options.errorMessage }),
			});
		}
	} else {
		// 2xx/3xx = success
		span.setStatus({ code: SpanStatusCode.OK });
	}
}
