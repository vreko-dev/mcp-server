import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import { createCheckoutLink } from "@snapback/integrations/stripe/provider/stripe";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/billing/create-checkout
 *
 * Creates a Stripe checkout session for plan upgrades
 */

export async function POST(request: NextRequest) {
	try {
		// Extract auth context from request headers
		const authContextHeader = request.headers.get("x-auth-context");
		if (!authContextHeader) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const authContext = JSON.parse(authContextHeader);

		// Only authenticated users can create checkout sessions
		if (authContext.type !== "user") {
			return NextResponse.json(
				{ error: "Only authenticated users can upgrade plans" },
				{ status: 403 },
			);
		}

		// Parse request body
		const body = await request.json();

		// Validate request body
		if (!body.plan) {
			return NextResponse.json({ error: "plan is required" }, { status: 400 });
		}

		if (!body.successUrl || !body.cancelUrl) {
			return NextResponse.json(
				{ error: "successUrl and cancelUrl are required" },
				{ status: 400 },
			);
		}

		// Validate plan
		const validPlans = ["solo", "team", "enterprise"];
		if (!validPlans.includes(body.plan)) {
			return NextResponse.json(
				{
					error: `Invalid plan. Valid plans: ${validPlans.join(", ")}`,
				},
				{ status: 400 },
			);
		}

		// Get user session
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json(
				{ error: "Invalid authorization header" },
				{ status: 401 },
			);
		}

		const token = authHeader.substring(7);
		const session = await auth.api.getSession({
			headers: new Headers({
				Authorization: `Bearer ${token}`,
			}),
		});

		if (!session) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		// Create Stripe checkout session
		const checkoutUrl = await createCheckoutLink({
			type: "subscription",
			productId: getProductIdForPlan(body.plan),
			redirectUrl: body.successUrl,
			userId: session.user.id,
			email: session.user.email,
			trialPeriodDays: 14, // 14-day trial
		});

		if (!checkoutUrl) {
			return NextResponse.json(
				{ error: "Failed to create checkout session" },
				{ status: 500 },
			);
		}

		// Track checkout initiation in analytics
		logger.info("Checkout session created", {
			userId: session.user.id,
			plan: body.plan,
			checkoutUrl,
		});

		// Return checkout URL to client
		return NextResponse.json({
			checkoutUrl,
		});
	} catch (error) {
		logger.error("Checkout creation error", { error });
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 },
		);
	}
}

function getProductIdForPlan(plan: string): string {
	// In a real implementation, these would come from environment variables
	switch (plan) {
		case "solo":
			return process.env.STRIPE_SOLO_MONTHLY_PRICE_ID || "";
		case "team":
			return process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || "";
		case "enterprise":
			return ""; // Enterprise plans might require custom handling
		default:
			return "";
	}
}
