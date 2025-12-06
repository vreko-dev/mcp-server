// Email service for subscription lifecycle emails
export {
	type EmailServiceResult,
	sendCancellationEmail,
	sendEmail,
	sendPaymentFailedEmail,
	sendPaymentReceipt,
	sendWelcomeEmail,
} from "./lib/email-service";
