/**
 * Request ID Middleware
 *
 * Generates a unique request ID for each incoming request
 * Attaches it to request context and response headers
 * Enables request tracing across logs
 */

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "X-Request-ID";

/**
 * Generate or extract request ID from request
 */
export function getRequestId(request: NextRequest): string {
	// Check if request already has an ID (from upstream proxy)
	const existingId = request.headers.get(REQUEST_ID_HEADER);
	if (existingId) {
		return existingId;
	}

	// Generate new request ID
	return `req_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Middleware to add request ID to all requests
 */
export function requestIdMiddleware(request: NextRequest): NextResponse {
	const requestId = getRequestId(request);

	// Clone response and add request ID header
	const response = NextResponse.next();
	response.headers.set(REQUEST_ID_HEADER, requestId);

	// Store in request context for logging
	// This will be picked up by the logger
	(request as any).__requestId = requestId;

	return response;
}

/**
 * Get request ID from request context
 */
export function extractRequestId(request: any): string | undefined {
	return request.__requestId || request.headers?.get?.(REQUEST_ID_HEADER);
}
