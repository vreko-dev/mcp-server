// TODO: Re-enable when redis-client types are available
// Temporarily disabled due to missing type declarations
import { logger } from "@snapback/infrastructure";
import type { NextRequest } from "next/server";

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt?: number;
	retryAfter?: number;
	consumed?: number;
}

export async function rateLimitMiddleware(
	_request: NextRequest,
): Promise<RateLimitResult> {
	// Stub implementation - always allow for now
	logger.warn("Rate limiting middleware is currently disabled");
	return { allowed: true, remaining: 100, limit: 100 };
}

export async function checkRateLimit(
	_userId: string,
	_plan: string,
	_requestCost: number,
): Promise<RateLimitResult> {
	// Stub implementation - always allow for now
	return { allowed: true, remaining: 100, limit: 100 };
}
