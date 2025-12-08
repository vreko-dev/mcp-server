import { logger } from "@snapback/infrastructure";
import { subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "../../src/services/database";

// Email queue and log table would be defined in the database schema
// For now, we'll use in-memory storage for demonstration
interface EmailQueueItem {
	id: string;
	userId: string;
	campaignId: string;
	template: string;
	subject: string;
	data: Record<string, any>;
	sendAt: Date;
	status: "pending" | "sent" | "failed";
	retryCount: number;
	error?: string;
}

interface EmailLogItem {
	id: string;
	userId: string;
	campaignId: string;
	sentAt: Date;
	template: string;
}

interface CampaignStep {
	delay: string;
	template: string;
	subject: string;
	data: (user: any) => Record<string, any>;
	condition?: (user: any) => boolean;
}

interface Campaign {
	id: string;
	name: string;
	trigger: {
		type: string;
		condition: Record<string, any>;
	};
	sequence: CampaignStep[];
}

// In-memory storage for demonstration
// In a real implementation, this would use database tables
const emailQueue: EmailQueueItem[] = [];
const emailLog: EmailLogItem[] = [];

export class EmailOrchestrator {
	/**
	 * Enqueue campaign emails for a user
	 * @param campaignId Campaign identifier
	 * @param user User object
	 */
	async enqueueCampaignEmails(campaignId: string, user: any) {
		try {
			// Get subscription data
			const db = getDb();
			if (!db) {
				throw new Error("Database not available");
			}

			const subscriptionResult = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.userId, user.id))
				.limit(1);

			const subscription = subscriptionResult && subscriptionResult.length > 0 ? subscriptionResult[0] : null;

			// Get user properties for email personalization
			const userProperties = {
				name: user.name,
				email: user.email,
				plan: subscription?.plan || "free",
				subscriptionStatus: subscription?.status || "none",
				totalSnapshots: user.totalSnapshots || 0,
				totalRecoveries: user.totalRecoveries || 0,
				trialEndDate: subscription?.trialEnd,
			};

			// Define campaign sequences
			const campaigns = this.getCampaigns();
			const campaign = campaigns.find((c) => c.id === campaignId);

			if (!campaign) {
				logger.warn("Campaign not found", { campaignId });
				return;
			}

			// Process each step in the campaign sequence
			for (const step of campaign.sequence) {
				// Check step conditions
				if (step.condition && typeof step.condition === "function" && !step.condition(userProperties)) {
					continue;
				}

				// Calculate send time
				const sendAt = this.calculateSendTime(step.delay);

				// Check if already sent
				const existing = emailLog.find((log) => log.userId === user.id && log.campaignId === campaignId);

				if (existing) {
					continue;
				}

				// Queue email
				const queueItem: EmailQueueItem = {
					id: `email_${Date.now()}_${Math.random()}`,
					userId: user.id,
					campaignId,
					template: step.template,
					subject: this.interpolate(step.subject, userProperties),
					data: step.data(userProperties),
					sendAt,
					status: "pending",
					retryCount: 0,
				};

				emailQueue.push(queueItem);
				logger.info("Email queued", {
					emailId: queueItem.id,
					campaignId,
					template: step.template,
					sendAt,
				});
			}
		} catch (error: any) {
			logger.error("Failed to enqueue campaign emails", {
				error: error.message || error,
				campaignId,
				userId: user.id,
			});
		}
	}

	/**
	 * Process the email queue
	 */
	async processEmailQueue() {
		const now = new Date();

		// Get pending emails that should be sent
		const pendingEmails = emailQueue.filter((email) => email.status === "pending" && email.sendAt <= now);

		for (const email of pendingEmails) {
			try {
				// In a real implementation, you would send the actual email here
				// For now, we'll just log the action
				logger.info("Would send email", {
					emailId: email.id,
					template: email.template,
					subject: email.subject,
					userId: email.userId,
				});

				// Update queue status
				email.status = "sent";
				email.retryCount = 0;

				// Add to log
				emailLog.push({
					id: email.id,
					userId: email.userId,
					campaignId: email.campaignId,
					sentAt: new Date(),
					template: email.template,
				});

				// Log to analytics (PostHog)
				logger.info("Email sent event", {
					distinctId: email.userId,
					event: "email_sent",
					properties: {
						campaign_id: email.campaignId,
						template: email.template,
					},
				});
			} catch (error: any) {
				logger.error("Email send failed", {
					error: error.message || error,
					emailId: email.id,
				});

				// Update queue status
				email.status = "failed";
				email.error = error.message || String(error);
				email.retryCount += 1;
			}
		}
	}

	/**
	 * Get all defined campaigns
	 */
	private getCampaigns(): Campaign[] {
		return [
			{
				id: "welcome_series",
				name: "Welcome Series",
				trigger: {
					type: "event",
					condition: { event: "signup_completed" },
				},
				sequence: [
					{
						delay: "0d",
						template: "welcome",
						subject: "🧢 Welcome to SnapBack!",
						data: (user: any) => ({
							name: user.name,
							apiKey: user.first_api_key,
						}),
					},
					{
						delay: "1d",
						template: "quick-start",
						subject: "3 ways to maximize your protection",
						data: (user: any) => ({
							name: user.name,
							hasInstalledExtension: user.has_used_vscode,
						}),
						condition: (user: any) => !user.hasInstalledExtension,
					},
				],
			},
			{
				id: "trial_welcome",
				name: "Trial Welcome",
				trigger: {
					type: "event",
					condition: { event: "trial_started" },
				},
				sequence: [
					{
						delay: "0d",
						template: "trial-welcome",
						subject: "🚀 Your 14-day trial starts now",
						data: (user: any) => ({
							name: user.name,
							trialEndDate: user.trialEndDate,
						}),
					},
				],
			},
			{
				id: "trial_at_risk",
				name: "Trial At Risk",
				trigger: {
					type: "cohort_entry",
					condition: { cohort: "Trial At Risk" },
				},
				sequence: [
					{
						delay: "0d",
						template: "trial-emergency-checkin",
						subject: "⏰ Don't lose your protection - trial ending soon",
						data: (user: any) => ({
							name: user.name,
							daysLeft: this.calculateDaysLeft(user.trialEndDate),
							usage: user.totalSnapshots,
						}),
					},
				],
			},
			{
				id: "churn_risk",
				name: "Churn Risk",
				trigger: {
					type: "cohort_entry",
					condition: { cohort: "Churn Risk" },
				},
				sequence: [
					{
						delay: "0d",
						template: "we-miss-you",
						subject: "We hate to see you go - special offer inside",
						data: (user: any) => ({
							name: user.name,
						}),
					},
				],
			},
			{
				id: "feature_limit_hit",
				name: "Feature Limit Hit",
				trigger: {
					type: "event",
					condition: { event: "feature_limit_hit" },
				},
				sequence: [
					{
						delay: "0d",
						template: "upgrade-prompt",
						subject: "Ready to unlock unlimited protection?",
						data: (user: any) => ({
							name: user.name,
							feature: user.limit_hit_feature,
						}),
					},
				],
			},
			{
				id: "first_snapshot",
				name: "First Snapshot",
				trigger: {
					type: "event",
					condition: { event: "snapshot_created", is_first: true },
				},
				sequence: [
					{
						delay: "0d",
						template: "first-snapshot-celebration",
						subject: "🎉 First snapshot created!",
						data: (user: any) => ({
							name: user.name,
						}),
					},
				],
			},
		];
	}

	/**
	 * Calculate send time based on delay string
	 * @param delay Delay string (e.g., "0d", "1d", "3d")
	 */
	private calculateSendTime(delay: string): Date {
		const now = new Date();
		const match = delay.match(/^(\d+)([dhw])$/);

		if (!match) {
			return now; // Send immediately if format is invalid
		}

		const value = Number.parseInt(match[1], 10);
		const unit = match[2];

		switch (unit) {
			case "d": // days
				now.setDate(now.getDate() + value);
				break;
			case "h": // hours
				now.setHours(now.getHours() + value);
				break;
			case "w": // weeks
				now.setDate(now.getDate() + value * 7);
				break;
		}

		return now;
	}

	/**
	 * Calculate days left until a date
	 * @param endDate End date
	 */
	private calculateDaysLeft(endDate: string): number {
		if (!endDate) {
			return 0;
		}

		const end = new Date(endDate);
		const now = new Date();
		const diffTime = end.getTime() - now.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	/**
	 * Interpolate variables in a string
	 * @param template Template string
	 * @param data Data object
	 */
	private interpolate(template: string, data: any): string {
		return template.replace(/\{([^}]+)\}/g, (match, key) => {
			return data[key] !== undefined ? String(data[key]) : match;
		});
	}
}
