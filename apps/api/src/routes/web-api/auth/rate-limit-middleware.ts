import { type NextRequest, NextResponse } from "next/server";

// In-memory rate limit store
interface RateLimitEntry {
	attempts: number;
	resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Synchronous rate limit check for authentication endpoints
 */
function checkRateLimit(identifier: string): {
	allowed: boolean;
	remaining: number;
	resetAt: number;
} {
	const now = Date.now();
	const entry = rateLimitStore.get(identifier);

	// No entry or expired window - allow and create new entry
	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(identifier, {
			attempts: 1,
			resetAt: now + WINDOW_MS,
		});

		return {
			allowed: true,
			remaining: MAX_ATTEMPTS - 1,
			resetAt: now + WINDOW_MS,
		};
	}

	// Within window - check if under limit
	if (entry.attempts < MAX_ATTEMPTS) {
		entry.attempts++;

		return {
			allowed: true,
			remaining: MAX_ATTEMPTS - entry.attempts,
			resetAt: entry.resetAt,
		};
	}

	// Over limit
	return {
		allowed: false,
		remaining: 0,
		resetAt: entry.resetAt,
	};
}

/**
 * Get client identifier for rate limiting
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 *
 * Security note: If IP cannot be determined, we use a hash of user-agent
 * and other headers to create a semi-unique identifier. This is less secure
 * than IP-based limiting but prevents all "unknown" users from sharing the
 * same rate limit bucket.
 */
function getClientIP(request: NextRequest): string {
	// Try various headers in order of preference
	const headers = [
		"x-real-ip",
		"x-forwarded-for",
		"cf-connecting-ip", // Cloudflare
		"x-vercel-forwarded-for", // Vercel
	];

	for (const header of headers) {
		const ip = request.headers.get(header);
		if (ip) {
			// x-forwarded-for can be a comma-separated list
			return ip.split(",")[0]?.trim() ?? ip.trim();
		}
	}

	// Check other IP headers
	const realIp = request.headers.get("x-real-ip");
	if (realIp) {
		return realIp;
	}

	// Last resort: Create identifier from user-agent and accept-language
	// This prevents all users without IP from sharing the same rate limit
	const userAgent = request.headers.get("user-agent") || "unknown-ua";
	const acceptLanguage = request.headers.get("accept-language") || "unknown-lang";

	// Simple hash to create semi-unique identifier
	const fallbackIdentifier = `fallback:${hashString(userAgent + acceptLanguage)}`;

	// Log warning for monitoring purposes
	if (process.env.NODE_ENV === "production") {
		console.warn("Rate limiting: IP not detectable, using fallback identifier", {
			userAgent: userAgent.substring(0, 50), // Truncate for privacy
			timestamp: new Date().toISOString(),
		});
	}

	return fallbackIdentifier;
}

/**
 * Simple string hash function for creating fallback identifiers
 * @internal
 */
function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
}

/**
 * Higher-order function to wrap auth handlers with rate limiting
 */
export function withAuthRateLimit(handler: (request: NextRequest) => Promise<Response>) {
	return async (request: NextRequest): Promise<Response> => {
		const ip = getClientIP(request);
		const identifier = `auth:${ip}`;

		// Check rate limit
		const limit = checkRateLimit(identifier);

		if (!limit.allowed) {
			const retryAfterSeconds = Math.ceil((limit.resetAt - Date.now()) / 1000);

			return NextResponse.json(
				{
					error: "Too many authentication attempts",
					message: "You have exceeded the maximum number of login attempts. Please try again later.",
					retryAfter: retryAfterSeconds,
				},
				{
					status: 429,
					headers: {
						"Retry-After": retryAfterSeconds.toString(),
						"X-RateLimit-Limit": "10",
						"X-RateLimit-Remaining": "0",
						"X-RateLimit-Reset": limit.resetAt.toString(),
					},
				},
			);
		}

		// Add rate limit headers to successful response
		const response = await handler(request);

		// Clone response to add headers
		const enhancedResponse = new Response(response.body, response);
		enhancedResponse.headers.set("X-RateLimit-Limit", "10");
		enhancedResponse.headers.set("X-RateLimit-Remaining", limit.remaining.toString());
		enhancedResponse.headers.set("X-RateLimit-Reset", limit.resetAt.toString());

		return enhancedResponse;
	};
}

/**
 * Standalone rate limit check for use in existing handlers
 * Returns null if allowed, or a 429 response if blocked
 */
export function checkAuthRateLimit(request: NextRequest): Response | null {
	const ip = getClientIP(request);
	const identifier = `auth:${ip}`;

	const limit = checkRateLimit(identifier);

	if (!limit.allowed) {
		const retryAfterSeconds = Math.ceil((limit.resetAt - Date.now()) / 1000);

		return NextResponse.json(
			{
				error: "Too many authentication attempts",
				message: "You have exceeded the maximum number of login attempts. Please try again later.",
				retryAfter: retryAfterSeconds,
			},
			{
				status: 429,
				headers: {
					"Retry-After": retryAfterSeconds.toString(),
					"X-RateLimit-Limit": "10",
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": limit.resetAt.toString(),
				},
			},
		);
	}

	return null; // Allowed
}
