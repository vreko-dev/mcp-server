import type { SendEmailHandler } from "../../types";

export const send: SendEmailHandler = async ({ to, subject, html, text }) => {
	// Plunk email sending logic would go here
	console.log(`Sending Plunk email to ${to} with subject ${subject}`);
	// For now, we'll just log the email content
	return Promise.resolve();
};
