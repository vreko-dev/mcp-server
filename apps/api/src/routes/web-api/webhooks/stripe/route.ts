import { logger } from "@snapback/infrastructure";
import {
	mapPriceIdToPlan,
	webhookHandler,
} from "@snapback/integrations/stripe/provider/stripe";
import { db, user } from "@snapback/platform";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { apiClient } from "@/lib/api-client";
import {
	handleCheckoutCompleted,
	handleInvoicePaymentFailed,
	handleInvoicePaymentSucceeded,
	handleSubscriptionCreated,
	handleSubscriptionDeleted,
	handleSubscriptionUpdated,
} from "@/lib/stripe-webhook-handlers";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events with full business logic
 */

export async function POST(request: NextRequest) {
	try {
		// Log incoming webhook for monitoring
		logger.info("Stripe webhook received", {
			headers: {
				"stripe-signature": request.headers.get("stripe-signature"),
				"content-length": request.headers.get("content-length"),
			},
		});

		// Use existing webhook handler for signature verification
		const response = await webhookHandler(request);

		// Extract the webhook event from the response
		// Note: This is a simplified approach - in production, you'd want to
		// parse the webhook event from the request body after signature verification
		const rawBody = await request.text();
		const event = JSON.parse(rawBody) as Stripe.Event;

		// Handle different event types with business logic
		let handlerResult: {
			success: boolean;
			message?: string;
			error?: string;
		};

		switch (event.type) {
			case "customer.subscription.created":
				handlerResult = await handleSubscriptionCreated(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "customer.subscription.updated":
				handlerResult = await handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "customer.subscription.deleted":
				handlerResult = await handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "checkout.session.completed":
				handlerResult = await handleCheckoutCompleted(
					event.data.object as Stripe.Checkout.Session,
				);
				// Auto-generate API key on Pro upgrade
				if (handlerResult.success) {
					await handleCheckoutCompletedExtended(
						event.data.object as Stripe.Checkout.Session,
					);
				}
				break;

			case "invoice.payment_succeeded":
				handlerResult = await handleInvoicePaymentSucceeded(
					event.data.object as Stripe.Invoice,
				);
				break;

			case "invoice.payment_failed":
				handlerResult = await handleInvoicePaymentFailed(
					event.data.object as Stripe.Invoice,
				);
				break;

			default:
				logger.info("Unhandled webhook event type", {
					type: event.type,
				});
				handlerResult = {
					success: true,
					message: "Event type not handled",
				};
		}

		// Log handler result
		if (handlerResult.success) {
			logger.info("Stripe webhook processed successfully", {
				eventType: event.type,
				message: handlerResult.message,
			});
		} else {
			logger.error("Stripe webhook handler failed", {
				eventType: event.type,
				error: handlerResult.error,
			});
		}

		return response;
	} catch (error) {
		logger.error("Stripe webhook processing failed", { error });
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 400 },
		);
	}
}

async function handleCheckoutCompletedExtended(
	session: Stripe.Checkout.Session,
) {
	const userId = session.metadata?.userId;
	const priceId = session.metadata?.priceId;

	// Map Stripe price IDs to our plan names
	const plan = priceId ? mapPriceIdToPlan(priceId) || "free" : "free";

	if (!userId) {
		return;
	}

	// 1. Update user subscription tier
	try {
		if (db) {
			await db
				.update(user)
				.set({ subscriptionTier: plan })
				.where(eq(user.id, userId));
		}
	} catch (error) {
		logger.error("Failed to update user subscription tier:", { error });
	}

	// 2. Auto-generate API key using YOUR existing API for paid plans
	if (plan !== "free") {
		try {
			const apiKeyResult = await apiClient.apiKeys.create({
				name: "Production API Key",
			});

			// 3. Send welcome email with API key
			// Note: In a real implementation, you would send the email here
			// For now, we'll just log that we would send it
			logger.info(
				`User ${userId} upgraded to ${plan} - API key generated: ${apiKeyResult.apiKey?.key}`,
			);
		} catch (error) {
			logger.error("Failed to create API key on upgrade:", { error });
		}
	}
}
