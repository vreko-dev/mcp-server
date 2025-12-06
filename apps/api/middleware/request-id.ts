/**
 * Request ID Middleware
 *
 * Generates a unique request ID for each incoming request
 * Attaches it to request context and response headers
 * Enables request tracing across logs
 */

import { randomUUID } from "node:crypto";

// import type { NextRequest } from "next/server";
// import { NextResponse } from "next/server";

// Temporary types to avoid Next.js dependency in API service
interface NextRequest {
	headers: {
		get(name: string): string | null;
	};
}

class NextResponse {
	headers: Map<string, string>;

	constructor() {
		this.headers = new Map();
	}

	static next(): NextResponse {
		return new NextResponse();
	}

	set(name: string, value: string): void {
		this.headers.set(name, value);
	}
}

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
	(request as { __requestId?: string }).__requestId = requestId;

	return response;
}

/**
 * Get request ID from request context
 */
export function extractRequestId(request: unknown): string | undefined {
	const req = request as {
		__requestId?: string;
		headers?: { get?: (name: string) => string | undefined };
	};
	return req.__requestId || req.headers?.get?.(REQUEST_ID_HEADER);
}
