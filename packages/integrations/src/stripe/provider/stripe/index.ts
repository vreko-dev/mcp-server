import { logger } from "@snapback/infrastructure";
import { db } from "@snapback/platform";
import Stripe from "stripe";
import type {
	CancelSubscription,
	CreateCheckoutLink,
	CreateCheckoutLinkOptions,
	CreateCustomerPortalLink,
	SetSubscriptionSeats,
	WebhookHandler,
} from "../../types.js";

let stripeClient: Stripe | null = null;

// Cache environment variables at module level for performance
const PRICE_ID_MAP = {
	solo: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID,
	team: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
	enterprise: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
} as const;

export function getStripeClient() {
	if (stripeClient) {
		return stripeClient;
	}

	const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;

	if (!stripeSecretKey) {
		throw new Error("Missing env variable STRIPE_SECRET_KEY");
	}

	stripeClient = new Stripe(stripeSecretKey);

	return stripeClient;
}

export const createCheckoutLink: CreateCheckoutLink = async (options: CreateCheckoutLinkOptions) => {
	const stripeClient = getStripeClient();
	const { type, productId, redirectUrl, customerId, organizationId, userId, trialPeriodDays, seats, email } = options;

	const metadata = {
		organization_id: organizationId || null,
		user_id: userId || null,
	};

	const response = await stripeClient.checkout.sessions.create({
		mode: type === "subscription" ? "subscription" : "payment",
		success_url: redirectUrl ?? "",
		line_items: [
			{
				quantity: seats ?? 1,
				price: productId,
			},
		],
		...(customerId ? { customer: customerId } : { customer_email: email }),
		...(type === "one-time"
			? {
					payment_intent_data: {
						metadata,
					},
					customer_creation: "always",
				}
			: {
					subscription_data: {
						metadata,
						trial_period_days: trialPeriodDays,
					},
				}),
		metadata,
	});

	return response.url;
};

export const createCustomerPortalLink: CreateCustomerPortalLink = async (options: {
	customerId: string;
	redirectUrl?: string;
}) => {
	const stripeClient = getStripeClient();

	const response = await stripeClient.billingPortal.sessions.create({
		customer: options.customerId,
		return_url: options.redirectUrl ?? "",
	});

	return response.url;
};

export const setSubscriptionSeats: SetSubscriptionSeats = async (options: { id: string; seats: number }) => {
	const stripeClient = getStripeClient();

	const subscription = await stripeClient.subscriptions.retrieve(options.id);

	if (!subscription) {
		throw new Error("Subscription not found.");
	}

	await stripeClient.subscriptions.update(options.id, {
		items: [
			{
				id: subscription.items.data[0].id,
				quantity: options.seats,
			},
		],
	});
};

export const cancelSubscription: CancelSubscription = async (id: string) => {
	const stripeClient = getStripeClient();

	await stripeClient.subscriptions.cancel(id);
};

export const webhookHandler: WebhookHandler = async (req: Request) => {
	const stripeClient = getStripeClient();

	if (!req.body) {
		return new Response("Invalid request.", {
			status: 400,
		});
	}

	let event: Stripe.Event | undefined;

	try {
		const body = await req.text();
		const signature = req.headers.get("stripe-signature") as string;
		const secret = process.env.STRIPE_WEBHOOK_SECRET as string;

		event = await stripeClient.webhooks.constructEventAsync(body, signature, secret);
	} catch (e) {
		logger.error("Failed to construct Stripe webhook event", { error: e });

		return new Response("Invalid request.", {
			status: 400,
		});
	}

	// Validate metadata at webhook entry point for events that should have it
	if (
		event.type === "checkout.session.completed" ||
		event.type === "customer.subscription.created" ||
		event.type === "customer.subscription.updated"
	) {
		// Type assertion to access metadata property safely
		const objWithMetadata = event.data.object as {
			metadata?: { user_id?: string; organization_id?: string };
		};

		if (objWithMetadata.metadata) {
			const { user_id, organization_id } = objWithMetadata.metadata;
			if (!user_id && !organization_id) {
				logger.error("Missing required metadata in webhook", {
					eventType: event.type,
					metadata: objWithMetadata.metadata,
				});
				return new Response("Missing user_id or organization_id in metadata", {
					status: 400,
				});
			}
		} else {
			logger.error("Missing metadata in webhook", {
				eventType: event.type,
			});
			return new Response("Missing metadata in webhook", {
				status: 400,
			});
		}
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const { mode, metadata, customer, id } = event.data.object as any;

				if (mode !== "subscription") {
					const checkoutSession = await stripeClient.checkout.sessions.retrieve(id, {
						expand: ["line_items"],
					});

					const productId = checkoutSession.line_items?.data[0].price?.id;

					if (!productId) {
						logger.error("Missing product ID in checkout session", {
							sessionId: id,
						});
						break;
					}

					// biome-ignore lint/style/noNonNullAssertion: This is a valid case
					await db?.transaction(async (_tx) => {
						// Create purchase record for one-time payment
						// Note: We're using the database transaction here
					});
				} else {
					// Handle subscription creation
					// The subscription will be handled in customer.subscription.created
				}
				break;
			}
			case "customer.subscription.created":
			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				const { user_id, organization_id } = subscription.metadata;

				if (!user_id && !organization_id) {
					logger.error("Missing user_id or organization_id in subscription metadata", {
						subscriptionId: subscription.id,
					});
					break;
				}

				// biome-ignore lint/style/noNonNullAssertion: This is a valid case
				await db?.transaction(async (_tx) => {
					// Handle subscription creation/update
					// Note: We're using the database transaction here
				});
				break;
			}
			case "customer.subscription.deleted": {
				const _subscription = event.data.object as Stripe.Subscription;

				// biome-ignore lint/style/noNonNullAssertion: This is a valid case
				await db?.transaction(async (_tx) => {
					// Handle subscription cancellation
					// Note: We're using the database transaction here
				});
				break;
			}
			case "invoice.payment_succeeded": {
				const invoice = event.data.object as Stripe.Invoice;

				// Handle successful payment
				logger.info("Payment succeeded", {
					invoiceId: invoice.id,
					customerId: invoice.customer,
				});
				break;
			}
			case "invoice.payment_failed": {
				const invoice = event.data.object as Stripe.Invoice;

				// Handle failed payment
				logger.warn("Payment failed", {
					invoiceId: invoice.id,
					customerId: invoice.customer,
				});
				break;
			}
			default:
				logger.debug("Unhandled event type", {
					eventType: event.type,
				});
		}

		return new Response("OK", { status: 200 });
	} catch (error) {
		logger.error("Error processing webhook", { error });
		return new Response("Error processing webhook", { status: 500 });
	}
};

// Helper function to map Stripe price IDs to plan names
export function mapPriceIdToPlan(priceId: string): "free" | "solo" | "team" | "enterprise" {
	// Use cached environment variables for better performance
	if (priceId === PRICE_ID_MAP.solo) {
		return "solo";
	}
	if (priceId === PRICE_ID_MAP.team) {
		return "team";
	}
	if (priceId === PRICE_ID_MAP.enterprise) {
		return "enterprise";
	}

	// Log warning for unknown price IDs instead of silent downgrade
	logger.warn(`Unknown price ID: ${priceId}, defaulting to free`);
	return "free";
}
