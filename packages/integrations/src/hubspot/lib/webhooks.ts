import { logger } from "@snapback/infrastructure";
import type { WebhookHandler } from "../types";

/**
 * Verify HubSpot webhook signature
 * @param requestBody The webhook request body
 * @param signature The signature from the X-HubSpot-Signature header
 * @param secret The webhook secret
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(requestBody: string, signature: string, secret: string): boolean {
	try {
		// Import crypto module for signature verification
		const crypto = require("node:crypto");

		// Create HMAC hash using the secret
		const hash = crypto.createHmac("sha256", secret).update(requestBody).digest("hex");

		// Compare the hash with the signature
		return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(signature, "hex"));
	} catch (error) {
		logger.error("Error verifying webhook signature", { error });
		return false;
	}
}

/**
 * Handle HubSpot webhook requests
 * @param req The incoming request
 * @returns Response to the webhook
 */
export const handleHubSpotWebhook: WebhookHandler = async (req: Request) => {
	try {
		// Get the signature from headers
		const signature = req.headers.get("x-hubspot-signature");
		const secret = process.env.HUBSPOT_WEBHOOK_SECRET;

		if (!signature) {
			logger.warn("Missing HubSpot webhook signature");
			return new Response("Missing signature", { status: 400 });
		}

		if (!secret) {
			logger.error("Missing HUBSPOT_WEBHOOK_SECRET environment variable");
			return new Response("Server configuration error", { status: 500 });
		}

		// Get request body
		const requestBody = await req.text();

		// Verify signature
		if (!verifyWebhookSignature(requestBody, signature, secret)) {
			logger.warn("Invalid HubSpot webhook signature");
			return new Response("Invalid signature", { status: 401 });
		}

		// Parse the webhook payload
		const payload = JSON.parse(requestBody);

		// Process the webhook events
		if (Array.isArray(payload)) {
			for (const event of payload) {
				await processWebhookEvent(event);
			}
		} else {
			await processWebhookEvent(payload);
		}

		logger.info("HubSpot webhook processed successfully");
		return new Response("OK", { status: 200 });
	} catch (error) {
		logger.error("Error processing HubSpot webhook", { error });
		return new Response("Error processing webhook", { status: 500 });
	}
};

/**
 * Process individual webhook events
 * @param event The webhook event data
 */
async function processWebhookEvent(event: any) {
	try {
		logger.info("Processing HubSpot webhook event", {
			eventType: event.subscriptionType,
			objectId: event.objectId,
			propertyName: event.propertyName,
		});

		// Handle different event types
		switch (event.subscriptionType) {
			case "contact.creation":
				logger.info("New contact created in HubSpot", {
					contactId: event.objectId,
				});
				// Handle contact creation
				break;

			case "contact.propertyChange":
				logger.info("Contact property changed in HubSpot", {
					contactId: event.objectId,
					property: event.propertyName,
					newValue: event.propertyValue,
				});
				// Handle contact property change
				break;

			case "contact.deletion":
				logger.info("Contact deleted in HubSpot", {
					contactId: event.objectId,
				});
				// Handle contact deletion
				break;

			case "company.creation":
				logger.info("New company created in HubSpot", {
					companyId: event.objectId,
				});
				// Handle company creation
				break;

			case "company.propertyChange":
				logger.info("Company property changed in HubSpot", {
					companyId: event.objectId,
					property: event.propertyName,
					newValue: event.propertyValue,
				});
				// Handle company property change
				break;

			case "deal.creation":
				logger.info("New deal created in HubSpot", {
					dealId: event.objectId,
				});
				// Handle deal creation
				break;

			default:
				logger.debug("Unhandled HubSpot webhook event type", {
					eventType: event.subscriptionType,
				});
		}
	} catch (error) {
		logger.error("Error processing webhook event", { error, event });
		throw error;
	}
}
