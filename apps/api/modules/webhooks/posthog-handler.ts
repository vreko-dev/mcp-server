import crypto from "node:crypto";
import type { Logger } from "@snapback/infrastructure";
import type { EmailOrchestrator } from "./email-orchestrator";

export interface PostHogHandlerDependencies {
	logger: Pick<Logger, "info" | "warn" | "error">;
	emailOrchestrator: Pick<EmailOrchestrator, "enqueueCampaignEmails">;
	webhookSecret?: string;
}

async function getDefaultDependencies(): Promise<PostHogHandlerDependencies> {
	const { logger } = await import("@snapback/infrastructure");
	const { EmailOrchestrator } = await import("./email-orchestrator");
	const emailOrchestrator = new EmailOrchestrator();

	return {
		logger,
		emailOrchestrator,
		webhookSecret: process.env.POSTHOG_WEBHOOK_SECRET,
	};
}

export async function handlePostHogWebhook(
	req: Request,
	deps?: PostHogHandlerDependencies,
): Promise<Response> {
	const dependencies = deps || (await getDefaultDependencies());
	const { logger, emailOrchestrator, webhookSecret } = dependencies;

	try {
		const body = await req.text();

		// Verify signature if secret is configured
		const signature = req.headers.get("X-Hub-Signature");

		if (webhookSecret) {
			if (!signature) {
				logger.warn("PostHog webhook missing signature");
				return new Response("Missing signature", { status: 401 });
			}

			const expectedSignature = crypto
				.createHmac("sha256", webhookSecret)
				.update(body)
				.digest("hex");

			if (signature !== `sha256=${expectedSignature}`) {
				logger.warn("PostHog webhook invalid signature");
				return new Response("Invalid signature", { status: 401 });
			}
		}

		let payload;
		try {
			payload = JSON.parse(body);
		} catch (_e) {
			return new Response("Invalid JSON", { status: 400 });
		}

		const { event, person, properties } = payload;

		if (!event || !person) {
			return new Response("Invalid payload format", { status: 400 });
		}

		logger.info(`Received PostHog event: ${event}`, {
			distinctId: person.distinct_ids?.[0],
			eventId: payload.uuid,
		});

		// Extract user ID (distinct_id)
		// PostHog sends distinct_ids as an array, usually the first one is what we want
		// If aliased correctly, one of these should be our userId
		const distinctId = person.distinct_ids?.[0];

		if (!distinctId) {
			logger.warn("PostHog webhook missing distinct_id");
			return new Response("Missing distinct_id", { status: 200 }); // Return 200 to ack
		}

		// Mock user object wrapper for orchestrator
		// In a real app we might fetch user details, but orchestrator fetches by ID
		const userRef = { id: distinctId };

		// Handle specific events
		switch (event) {
			case "user_entered_cohort":
				if (properties?.cohort_name) {
					// Map cohort names to campaigns
					if (properties.cohort_name === "Trial At Risk") {
						await emailOrchestrator.enqueueCampaignEmails(
							"trial_at_risk",
							userRef,
						);
					} else if (properties.cohort_name === "Churn Risk") {
						await emailOrchestrator.enqueueCampaignEmails(
							"churn_risk",
							userRef,
						);
					}
				}
				break;

			// Custom engagement events
			case "snapshot_created":
				if (properties?.is_first) {
					await emailOrchestrator.enqueueCampaignEmails(
						"first_snapshot",
						userRef,
					);
				}
				break;

			case "trial_started":
				await emailOrchestrator.enqueueCampaignEmails("trial_welcome", userRef);
				break;

			case "signup_completed":
				await emailOrchestrator.enqueueCampaignEmails(
					"welcome_series",
					userRef,
				);
				break;

			case "feature_limit_hit":
				await emailOrchestrator.enqueueCampaignEmails(
					"feature_limit_hit",
					userRef,
				);
				break;
		}

		// Always return 200 OK to acknowledge receipt
		return new Response("OK", { status: 200 });
	} catch (error: any) {
		logger.error("Error handling PostHog webhook", { error: error.message });
		return new Response("Internal Server Error", { status: 500 });
	}
}
