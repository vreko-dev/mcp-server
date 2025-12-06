import { logger } from "@snapback/infrastructure";
import { send as sendResendEmail } from "../../email/provider/resend";
import type { SendEmailParams } from "../../email/types";
// @ts-ignore - Config types should be available after build
import type { PlanTier } from "@snapback/config";

export interface EmailServiceResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export async function sendEmail(params: SendEmailParams): Promise<EmailServiceResult> {
	// Validate email address
	if (!isValidEmail(params.to)) {
		throw new Error("Invalid email address");
	}

	try {
		logger.info("Sending email", {
			to: params.to,
			subject: params.subject,
		});

		// For now, use Resend as default provider
		await sendResendEmail(params);

		logger.info("Email sent successfully", { to: params.to });

		return {
			success: true,
			messageId: "mock-message-id", // In real implementation, this would come from the provider
		};
	} catch (error) {
		logger.error("Failed to send email", { error, to: params.to });

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Send welcome email to new subscriber
 */
export async function sendWelcomeEmail(
	customerId: string,
	plan: PlanTier,
	email?: string
): Promise<void> {
	if (!email) {
		logger.warn("Cannot send welcome email: no email address", { customerId });
		return;
	}

	await sendEmail({
		to: email,
		subject: `Welcome to SnapBack ${plan.charAt(0).toUpperCase() + plan.slice(1)}!`,
		text: `Thank you for subscribing to SnapBack ${plan}. Your account is now active.`,
	});
}

/**
 * Send cancellation email
 */
export async function sendCancellationEmail(
	customerId: string,
	email?: string
): Promise<void> {
	if (!email) {
		logger.warn("Cannot send cancellation email: no email address", { customerId });
		return;
	}

	await sendEmail({
		to: email,
		subject: "SnapBack Subscription Cancelled",
		text: "Your SnapBack subscription has been cancelled. Your local snapshots remain available.",
	});
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceipt(
	customerId: string,
	amount: number,
	email?: string
): Promise<void> {
	if (!email) {
		logger.warn("Cannot send payment receipt: no email address", { customerId });
		return;
	}

	await sendEmail({
		to: email,
		subject: "SnapBack Payment Receipt",
		text: `Your payment of $${(amount / 100).toFixed(2)} has been processed successfully.`,
	});
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
	customerId: string,
	amount: number,
	email?: string
): Promise<void> {
	if (!email) {
		logger.warn("Cannot send payment failed email: no email address", { customerId });
		return;
	}

	await sendEmail({
		to: email,
		subject: "SnapBack Payment Failed",
		text: `Your payment of $${(amount / 100).toFixed(2)} could not be processed. Please update your payment method.`,
	});
}
