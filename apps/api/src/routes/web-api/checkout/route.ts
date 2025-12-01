import { auth } from "@snapback/auth/auth";
import { logger } from "@snapback/infrastructure";
import { getStripeClient } from "@snapback/integrations/stripe/provider/stripe";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });

	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const { plan, seats = 1 } = body; // 'solo' or 'team'

	const priceId =
		plan === "team"
			? process.env.STRIPE_PRICE_ID_TEAM
			: process.env.STRIPE_PRICE_ID_SOLO;

	try {
		const checkoutSession = await getStripeClient().checkout.sessions.create({
			customer_email: session.user.email,
			line_items: [
				{
					price: priceId,
					quantity: seats,
				},
			],
			mode: "subscription",
			success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgrade=success`,
			cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
			metadata: {
				userId: session.user.id,
				plan,
			},
			subscription_data: {
				metadata: {
					userId: session.user.id,
					plan,
				},
			},
		});

		return NextResponse.json({
			url: checkoutSession.url,
		});
	} catch (error) {
		logger.error("Stripe checkout error:", { error });
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 },
		);
	}
}
