import { logger } from "@snapback/infrastructure";
import { Resend } from "resend";

/**
 * Email Service for Transactional Emails using Resend
 *
 * Provides type-safe email sending with Result<T, E> pattern
 * for proper error handling and observability.
 */

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
	? new Resend(process.env.RESEND_API_KEY)
	: null;

// Types
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

export interface WelcomeEmailData {
	plan: "free" | "solo" | "team" | "enterprise";
	features: string[];
	dashboardUrl: string;
	supportEmail: string;
}

export interface PaymentReceiptData {
	amount: number;
	date: string;
	invoiceUrl: string;
}

export interface PaymentFailedData {
	attemptCount: number;
	updatePaymentUrl: string;
	warningMessage: string;
}

export class EmailError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "EmailError";
	}
}

// Result type for email operations
export type EmailResult<T = void> =
	| { success: true; value: T }
	| { success: false; error: EmailError };

/**
 * Check if Resend is configured
 */
function isConfigured(): boolean {
	return resend !== null;
}

/**
 * Get plan features for email content
 */
function getPlanFeatures(
	plan: "free" | "solo" | "team" | "enterprise",
): string[] {
	const features: Record<string, string[]> = {
		enterprise: [
			"Unlimited snapshots",
			"Cloud backup",
			"Advanced AI detection",
			"Custom security rules",
			"Team collaboration",
			"Priority support",
			"SLA guarantee",
			"Dedicated account manager",
		],
		team: [
			"Unlimited snapshots",
			"Cloud backup",
			"Advanced AI detection",
			"Custom security rules",
			"Team collaboration",
			"Priority support",
		],
		solo: [
			"Unlimited snapshots",
			"Cloud backup",
			"Advanced AI detection",
			"Custom security rules",
		],
		free: ["50 snapshots per month", "Local storage only"],
	};

	return features[plan] || features.free;
}

/**
 * Send welcome email to new subscriber
 */
export async function sendWelcomeEmail(
	customerId: string,
	plan: "free" | "solo" | "team" | "enterprise",
	userEmail?: string,
): Promise<EmailResult> {
	try {
		if (!userEmail) {
			logger.warn("Cannot send welcome email - no email address", {
				customerId,
			});

			return {
				success: false,
				error: new EmailError("Email address required", "MISSING_EMAIL", {
					customerId,
				}),
			};
		}

		if (!isConfigured()) {
			logger.warn("RESEND_API_KEY not configured - skipping welcome email", {
				customerId,
			});

			return {
				success: false,
				error: new EmailError(
					"Email service not configured",
					"NOT_CONFIGURED",
					{ customerId },
				),
			};
		}

		const emailData: WelcomeEmailData = {
			plan,
			features: getPlanFeatures(plan),
			dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://snapback.dev"}/dashboard`,
			supportEmail: "support@snapback.dev",
		};

		// For now, send plain HTML until React Email components are ported
		const htmlContent = generateWelcomeEmailHTML(emailData);

		await resend?.emails.send({
			from: "SnapBack <welcome@snapback.dev>",
			to: userEmail,
			subject: `Welcome to SnapBack ${plan.charAt(0).toUpperCase() + plan.slice(1)}!`,
			html: htmlContent,
		});

		logger.info("Welcome email sent successfully", {
			customerId,
			plan,
			recipient: userEmail,
		});

		return { success: true, value: undefined };
	} catch (error) {
		logger.error("Failed to send welcome email", {
			error: error instanceof Error ? error.message : String(error),
			customerId,
			plan,
		});

		return {
			success: false,
			error: new EmailError("Failed to send welcome email", "SEND_FAILED", {
				customerId,
				plan,
				originalError: error instanceof Error ? error.message : String(error),
			}),
		};
	}
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
	customerId: string,
	amount: number,
	userEmail?: string,
): Promise<EmailResult> {
	try {
		if (!userEmail) {
			logger.warn("Cannot send payment receipt - no email address", {
				customerId,
			});

			return {
				success: false,
				error: new EmailError("Email address required", "MISSING_EMAIL", {
					customerId,
				}),
			};
		}

		if (!isConfigured()) {
			logger.warn("RESEND_API_KEY not configured - skipping payment receipt", {
				customerId,
			});

			return {
				success: false,
				error: new EmailError(
					"Email service not configured",
					"NOT_CONFIGURED",
					{ customerId },
				),
			};
		}

		const emailData: PaymentReceiptData = {
			amount,
			date: new Date().toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
			invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://snapback.dev"}/settings/billing`,
		};

		const htmlContent = generatePaymentReceiptHTML(emailData);

		await resend?.emails.send({
			from: "SnapBack <billing@snapback.dev>",
			to: userEmail,
			subject: "Payment Receipt - SnapBack",
			html: htmlContent,
		});

		logger.info("Payment receipt sent successfully", {
			customerId,
			amount,
			recipient: userEmail,
		});

		return { success: true, value: undefined };
	} catch (error) {
		logger.error("Failed to send payment receipt", {
			error: error instanceof Error ? error.message : String(error),
			customerId,
			amount,
		});

		return {
			success: false,
			error: new EmailError("Failed to send payment receipt", "SEND_FAILED", {
				customerId,
				amount,
				originalError: error instanceof Error ? error.message : String(error),
			}),
		};
	}
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(
	customerId: string,
	attemptCount: number,
	userEmail?: string,
): Promise<EmailResult> {
	try {
		if (!userEmail) {
			logger.warn("Cannot send payment failed email - no email address", {
				customerId,
			});

			return {
				success: false,
				error: new EmailError("Email address required", "MISSING_EMAIL", {
					customerId,
				}),
			};
		}

		if (!isConfigured()) {
			logger.warn(
				"RESEND_API_KEY not configured - skipping payment failed email",
				{
					customerId,
				},
			);

			return {
				success: false,
				error: new EmailError(
					"Email service not configured",
					"NOT_CONFIGURED",
					{ customerId },
				),
			};
		}

		const emailData: PaymentFailedData = {
			attemptCount,
			updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://snapback.dev"}/settings/billing`,
			warningMessage:
				attemptCount >= 3
					? "Your account will be suspended if payment is not received."
					: "Please update your payment method to continue your subscription.",
		};

		const htmlContent = generatePaymentFailedHTML(emailData);

		await resend?.emails.send({
			from: "SnapBack <billing@snapback.dev>",
			to: userEmail,
			subject: "Payment Failed - Action Required",
			html: htmlContent,
		});

		logger.info("Payment failed email sent successfully", {
			customerId,
			attemptCount,
			recipient: userEmail,
		});

		return { success: true, value: undefined };
	} catch (error) {
		logger.error("Failed to send payment failed email", {
			error: error instanceof Error ? error.message : String(error),
			customerId,
			attemptCount,
		});

		return {
			success: false,
			error: new EmailError(
				"Failed to send payment failed email",
				"SEND_FAILED",
				{
					customerId,
					attemptCount,
					originalError: error instanceof Error ? error.message : String(error),
				},
			),
		};
	}
}

/**
 * Generic email sender with custom template
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
	try {
		if (!isConfigured()) {
			throw new EmailError("Email service not configured", "NOT_CONFIGURED");
		}

		await resend?.emails.send({
			from: "SnapBack <noreply@snapback.dev>",
			to: options.to.email,
			subject: options.subject,
			html: options.template,
		});

		logger.info("Email sent successfully", {
			to: options.to.email,
			subject: options.subject,
		});

		return { success: true, value: undefined };
	} catch (error) {
		logger.error("Failed to send email", {
			error: error instanceof Error ? error.message : String(error),
			to: options.to.email,
			subject: options.subject,
		});

		if (error instanceof EmailError) {
			return {
				success: false,
				error,
			};
		}

		return {
			success: false,
			error: new EmailError("Failed to send email", "SEND_FAILED", {
				to: options.to.email,
				subject: options.subject,
				originalError: error instanceof Error ? error.message : String(error),
			}),
		};
	}
}

// HTML Template Generators (placeholder until React Email components are ported)

function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to SnapBack</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to SnapBack!</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 18px;">${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} Plan</p>
    </div>

    <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1f2937; margin-top: 0;">Your features:</h2>
        <ul style="color: #4b5563; padding-left: 20px;">
            ${data.features.map((feature) => `<li style="margin: 8px 0;">${feature}</li>`).join("")}
        </ul>

        <div style="margin: 30px 0; text-align: center;">
            <a href="${data.dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Go to Dashboard
            </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Need help? Contact us at <a href="mailto:${data.supportEmail}" style="color: #667eea;">${data.supportEmail}</a>
        </p>
    </div>
</body>
</html>
	`;
}

function generatePaymentReceiptHTML(data: PaymentReceiptData): string {
	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h1 style="color: #1f2937; margin-top: 0;">Payment Receipt</h1>

        <p style="color: #4b5563; font-size: 16px;">Thank you for your payment!</p>

        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                <span style="color: #6b7280;">Amount:</span>
                <span style="color: #1f2937; font-weight: 600;">$${(data.amount / 100).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                <span style="color: #6b7280;">Date:</span>
                <span style="color: #1f2937;">${data.date}</span>
            </div>
        </div>

        <div style="margin: 30px 0; text-align: center;">
            <a href="${data.invoiceUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Invoice
            </a>
        </div>
    </div>
</body>
</html>
	`;
}

function generatePaymentFailedHTML(data: PaymentFailedData): string {
	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h1 style="color: #dc2626; margin-top: 0;">Payment Failed</h1>

        <p style="color: #4b5563; font-size: 16px;">We were unable to process your payment (Attempt ${data.attemptCount}).</p>

        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-weight: 600;">${data.warningMessage}</p>
        </div>

        <p style="color: #4b5563;">Please update your payment method to ensure uninterrupted service.</p>

        <div style="margin: 30px 0; text-align: center;">
            <a href="${data.updatePaymentUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Update Payment Method
            </a>
        </div>
    </div>
</body>
</html>
	`;
}
