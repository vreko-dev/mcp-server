// Email service for subscription lifecycle emails
export {
	sendEmail,
	sendWelcomeEmail,
	sendCancellationEmail,
	sendPaymentReceipt,
	sendPaymentFailedEmail,
	type EmailServiceResult,
} from "./lib/email-service";
