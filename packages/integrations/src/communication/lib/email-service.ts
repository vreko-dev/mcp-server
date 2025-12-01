import { logger } from "@snapback/infrastructure";
import { send as sendResendEmail } from "../../email/provider/resend.js";
import type { SendEmailParams } from "../../email/types.js";

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
