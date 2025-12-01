import type { SendEmailHandler } from "../../types.js";

export const send: SendEmailHandler = async ({ to, subject, html }) => {
	// Postmark email sending logic would go here
	console.log(`Sending Postmark email to ${to} with subject ${subject}`);
	// For now, we'll just log the email content
	return Promise.resolve();
};
