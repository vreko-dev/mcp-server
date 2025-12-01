import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import { db, snapbackSchema } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Authentication Middleware
 *
 * Validates API keys and JWT tokens for requests to protected endpoints
 */

export interface AuthContext {
	type: "user" | "device";
	userId?: string;
	deviceId?: string;
	apiKeyId?: string;
	plan: "free" | "solo" | "team" | "enterprise";
	permissions: {
		maxSnapshots: number;
		cloudBackup: boolean;
		advancedDetection: boolean;
		customRules: boolean;
		teamSharing: boolean;
	};
}

export async function authMiddleware(request: NextRequest) {
	try {
		// Extract Authorization header
		const authHeader = request.headers.get("authorization");

		if (!authHeader) {
			return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
		}

		// Determine auth type
		if (authHeader.startsWith("Bearer ")) {
			const token = authHeader.substring(7);

			// Check if it's a JWT token (longer, base64-like)
			if (token.length > 50 && token.includes(".")) {
				// JWT token - validate with Better Auth
				return await validateJWTToken(request, token);
			}
			// API key - validate against database
			return await validateAPIKey(request, token);
		}

		return NextResponse.json({ error: "Invalid Authorization header format" }, { status: 401 });
	} catch (error) {
		logger.error(`Authentication middleware error: ${error instanceof Error ? error.message : String(error)}`, {
			error,
		});
		return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
	}
}

async function validateJWTToken(_request: NextRequest, token: string) {
	try {
		// Validate JWT token with Better Auth
		const session = await auth.api.getSession({
			headers: new Headers({ Authorization: `Bearer ${token}` }),
		});

		if (!session) {
			return NextResponse.json({ error: "Invalid or expired JWT token" }, { status: 401 });
		}

		// Get user's subscription/plan
		const plan = await getUserPlan(session.user.id);
		const permissions = getUserPermissions(plan);

		// Attach auth context to request
		const authContext: AuthContext = {
			type: "user",
			userId: session.user.id,
			plan,
			permissions,
		};

		// Create response with auth context
		const response = NextResponse.next();
		response.headers.set("x-auth-context", JSON.stringify(authContext));
		return response;
	} catch (error) {
		logger.error(`JWT validation error: ${error instanceof Error ? error.message : String(error)}`, { error });
		return NextResponse.json({ error: "Invalid or expired JWT token" }, { status: 401 });
	}
}

async function validateAPIKey(_request: NextRequest, _apiKey: string) {
	// API Key authentication will be available in a future release
	// The full implementation is archived in /archive/web-middleware/
	// Track progress: https://github.com/Marcelle-Labs/snapback.dev/issues/TBD

	const featureFlagEnabled = process.env.ENABLE_API_KEYS === "true";

	if (!featureFlagEnabled) {
		return NextResponse.json(
			{
				error: "API key authentication not yet available",
				message:
					"API key authentication is coming soon. Please use session-based auth via the web dashboard for now.",
				documentation: "https://docs.snapback.dev/authentication",
			},
			{ status: 501 },
		);
	}

	// Future implementation will go here when feature flag is enabled
	throw new Error("API key validation not implemented");
}

async function getUserPlan(userId: string): Promise<"free" | "solo" | "team" | "enterprise"> {
	try {
		// MVP: Simple orgId check - if user has an orgId, they're on a team plan
		// This replaces the complex team detection logic for MVP

		// In a real implementation, this would check if the user belongs to an organization
		// For now, we'll use a simple check that mimics the orgId-based logic
		if (!db) {
			return "free";
		}

		// Check if user belongs to any organization (member table from Better Auth)
		// const orgMemberships = await db // TODO: Re-enable when organization membership functionality is implemented
		// 	.select()
		// 	.from(member)
		// 	.where(eq(member.userId, userId))
		// 	.limit(1);

		// if (orgMemberships.length > 0) {
		// 	return "team"; // User belongs to an organization, so team plan
		// }

		// Check user's direct subscriptions
		const subscriptions = await db
			.select()
			.from(snapbackSchema.subscriptions)
			.where(eq(snapbackSchema.subscriptions.userId, userId))
			.orderBy(snapbackSchema.subscriptions.createdAt)
			.limit(1);

		if (subscriptions.length > 0) {
			const subscription = subscriptions[0];
			if (subscription) {
				// Map plan types to our simplified tier system
				switch (subscription.plan) {
					case "solo":
						return "solo";
					case "team":
						return "team";
					case "enterprise":
						return "enterprise";
					default:
						return "free";
				}
			}
		}

		return "free"; // Default to free plan
	} catch (error) {
		logger.error("Error getting user plan", { error, userId });
		return "free"; // Default to free plan
	}
}

function getUserPermissions(plan: "free" | "solo" | "team" | "enterprise") {
	switch (plan) {
		case "solo":
			return {
				maxSnapshots: 1000,
				cloudBackup: true,
				advancedDetection: true,
				customRules: false,
				teamSharing: false,
			};
		case "team":
			return {
				maxSnapshots: 5000,
				cloudBackup: true,
				advancedDetection: true,
				customRules: true,
				teamSharing: true,
			};
		case "enterprise":
			return {
				maxSnapshots: 999999,
				cloudBackup: true,
				advancedDetection: true,
				customRules: true,
				teamSharing: true,
			};
		default:
			return {
				maxSnapshots: 100,
				cloudBackup: false,
				advancedDetection: false,
				customRules: false,
				teamSharing: false,
			};
	}
}
