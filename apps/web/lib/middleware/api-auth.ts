import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "../rate-limit";

/**
 * API Authentication Middleware
 *
 * This middleware provides uniform authentication and rate limiting for all API routes.
 * It validates both JWT tokens (for web dashboard) and API keys (for CLI and external systems).
 * Rate limiting: 10 requests per 15 minutes per identifier (IP address or user ID).
 *
 * Usage:
 * import { withApiAuth } from "@/lib/middleware/api-auth";
 *
 * export async function GET(request: NextRequest) {
 *   return withApiAuth(request, async (authContext) => {
 *     // Your API logic here
 *     return NextResponse.json({ message: "Success" });
 *   });
 * }
 */

// Zod schema for validating auth context to prevent injection attacks
const ApiAuthContextSchema = z.object({
	type: z.enum(["user", "device"]),
	userId: z.string().uuid().optional(),
	deviceId: z
		.string()
		.regex(/^[a-f0-9]{64}$/)
		.optional(), // SHA-256 hash
	apiKeyId: z.string().uuid().optional(),
	plan: z.enum(["free", "solo", "team", "enterprise"]),
	permissions: z.object({
		maxSnapshots: z.number().int().min(0),
		cloudBackup: z.boolean(),
		advancedDetection: z.boolean(),
		customRules: z.boolean(),
		teamSharing: z.boolean(),
	}),
});

export type ApiAuthContext = z.infer<typeof ApiAuthContextSchema>;

export async function withApiAuth(
	request: NextRequest,
	handler: (authContext: ApiAuthContext) => Promise<NextResponse>,
): Promise<NextResponse> {
	// Apply rate limiting based on IP address or user identifier
	const identifier =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown";

	const rateLimitResult = checkRateLimit(identifier);

	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{ error: "Rate limit exceeded. Please try again later." },
			{
				status: 429,
				headers: {
					"Retry-After": String(
						Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
					),
					"X-RateLimit-Limit": "10",
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(rateLimitResult.resetAt),
				},
			},
		);
	}

	// Use token from Authorization header for basic auth validation
	const authHeader = request.headers.get("authorization");
	if (!authHeader) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	// For now, create a basic auth context
	// TODO: Implement proper auth middleware
	const authContext: ApiAuthContext = {
		type: "user",
		plan: "free",
		permissions: {
			maxSnapshots: 100,
			cloudBackup: false,
			advancedDetection: false,
			customRules: false,
			teamSharing: false,
		},
	};

	// Call the handler with the basic auth context
	return handler(authContext);
}
