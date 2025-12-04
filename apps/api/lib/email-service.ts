import { logger } from "@snapback/infrastructure";
import { Resend } from "resend";
import CancellationEmail from "../emails/cancellation-email.js";
import PaymentFailedEmail from "../emails/payment-failed-email.js";
import PaymentReceiptEmail from "../emails/payment-receipt-email.js";
import WelcomeEmail from "../emails/welcome-email.js";

/**
 * Email Service for Transactional Emails using Resend
 *
 * This service handles sending transactional emails for subscription events.
 */

// Validate RESEND_API_KEY is configured (will be undefined in development/testing)
if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "production") {
	logger.warn(
		"RESEND_API_KEY is not configured - email functionality will be disabled",
	);
}

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailRecipient {
	email: string;
	name?: string;
}

export interface EmailOptions {
	to: EmailRecipient;
	subject: string;
	template: string;
	data: Record<string, unknown>;
}

/**
 * Send a welcome email when a user subscribes
 */
export async function sendWelcomeEmail(
	customerId: string,
	plan: "free" | "solo" | "team" | "enterprise",
	userEmail?: string,
): Promise<void> {
	try {
		if (!userEmail) {
			logger.warn("Cannot send welcome email - no email address", {
				customerId,
			});
			return;
		}

		if (!process.env.RESEND_API_KEY) {
			logger.warn("RESEND_API_KEY not configured - skipping email", {
				customerId,
			});
			return;
		}

		const emailData = {
			plan: plan,
			features: getPlanFeatures(plan),
			dashboardUrl:
				process.env.NEXT_PUBLIC_APP_URL || "https://snapback.dev/dashboard",
			supportEmail: "support@snapback.dev",
		};

		await resend.emails.send({
			from: "SnapBack <welcome@snapback.dev>",
			to: userEmail,
			subject: `Welcome to SnapBack ${plan.charAt(0).toUpperCase() + plan.slice(1)}!`,
			react: WelcomeEmail(emailData),
		});

		logger.info("Welcome email sent", {
			customerId,
			plan,
			recipient: userEmail,
		});
	} catch (error) {
		logger.error("Failed to send welcome email", {
			error,
			customerId,
			plan,
		});
		// Don't throw - email failures shouldn't break webhook processing
	}
}

/**
 * Send a cancellation email when a subscription is canceled
 */
export async function sendCancellationEmail(
	customerId: string,
	userEmail?: string,
): Promise<void> {
	try {
		if (!userEmail) {
			logger.warn("Cannot send cancellation email - no email address", {
				customerId,
			});
			return;
		}

		if (!process.env.RESEND_API_KEY) {
			logger.warn("RESEND_API_KEY not configured - skipping email", {
				customerId,
			});
			return;
		}

		const emailData = {
			retentionOffer: "Get 25% off if you resubscribe within 7 days",
			feedbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/feedback?reason=cancellation`,
			resubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
			supportEmail: "support@snapback.dev",
		};

		await resend.emails.send({
			from: "SnapBack <hello@snapback.dev>",
			to: userEmail,
			subject: "We're sorry to see you go",
			react: CancellationEmail(emailData),
		});

		logger.info("Cancellation email sent", {
			customerId,
			recipient: userEmail,
		});
	} catch (error) {
		logger.error("Failed to send cancellation email", {
			error,
			customerId,
		});
	}
}

/**
 * Send a payment receipt email
 */
export async function sendPaymentReceipt(
	customerId: string,
	amount: number,
	invoiceUrl?: string,
	userEmail?: string,
): Promise<void> {
	try {
		if (!userEmail) {
			logger.warn("Cannot send payment receipt - no email address", {
				customerId,
			});
			return;
		}

		if (!process.env.RESEND_API_KEY) {
			logger.warn("RESEND_API_KEY not configured - skipping email", {
				customerId,
			});
			return;
		}

		const emailData = {
			amount: (amount / 100).toFixed(2), // Convert cents to dollars
			currency: "USD",
			invoiceUrl,
			supportEmail: "support@snapback.dev",
			date: new Date().toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
		};

		await resend.emails.send({
			from: "SnapBack <billing@snapback.dev>",
			to: userEmail,
			subject: "Payment Receipt - SnapBack",
			react: PaymentReceiptEmail(emailData),
		});

		logger.info("Payment receipt sent", {
			customerId,
			amount,
			recipient: userEmail,
		});
	} catch (error) {
		logger.error("Failed to send payment receipt", {
			error,
			customerId,
		});
	}
}

/**
 * Send a payment failed notification email
 */
export async function sendPaymentFailedEmail(
	customerId: string,
	attemptCount: number,
	userEmail?: string,
): Promise<void> {
	try {
		if (!userEmail) {
			logger.warn("Cannot send payment failed email - no email address", {
				customerId,
			});
			return;
		}

		if (!process.env.RESEND_API_KEY) {
			logger.warn("RESEND_API_KEY not configured - skipping email", {
				customerId,
			});
			return;
		}

		const emailData = {
			attemptCount,
			updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
			supportEmail: "support@snapback.dev",
			warningMessage:
				attemptCount >= 3
					? "Your account will be suspended if payment is not received."
					: "Please update your payment method to continue your subscription.",
		};

		await resend.emails.send({
			from: "SnapBack <billing@snapback.dev>",
			to: userEmail,
			subject: "Payment Failed - Action Required",
			react: PaymentFailedEmail(emailData),
		});

		logger.info("Payment failed email sent", {
			customerId,
			attemptCount,
			recipient: userEmail,
		});
	} catch (error) {
		logger.error("Failed to send payment failed email", {
			error,
			customerId,
		});
	}
}

/**
 * Get features for a plan (for email content)
 */
function getPlanFeatures(
	plan: "free" | "solo" | "team" | "enterprise",
): string[] {
	switch (plan) {
		case "enterprise":
			return [
				"Unlimited snapshots",
				"Cloud backup",
				"Advanced AI detection",
				"Custom security rules",
				"Team collaboration",
				"Priority support",
				"SLA guarantee",
				"Dedicated account manager",
			];
		case "team":
			return [
				"Unlimited snapshots",
				"Cloud backup",
				"Advanced AI detection",
				"Custom security rules",
				"Team collaboration",
				"Priority support",
			];
		case "solo":
			return [
				"Unlimited snapshots",
				"Cloud backup",
				"Advanced AI detection",
				"Custom security rules",
			];
		default:
			return ["50 snapshots per month", "Local storage only"];
	}
}

/**
 * Generic email sender (for future use)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
	try {
		if (!process.env.RESEND_API_KEY) {
			throw new Error("RESEND_API_KEY not configured");
		}

		// This would need proper template mapping
		await resend.emails.send({
			from: "SnapBack <noreply@snapback.dev>",
			to: options.to.email,
			subject: options.subject,
			html: `<p>${options.template}</p>`, // Placeholder
		});

		logger.info("Email sent", {
			to: options.to.email,
			subject: options.subject,
			template: options.template,
		});
	} catch (error) {
		logger.error("Failed to send email", {
			error,
			to: options.to.email,
			template: options.template,
		});
		throw error;
	}
}
