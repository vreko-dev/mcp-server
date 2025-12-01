import { logger } from "@snapback/infrastructure";
import type { SendEmailHandler } from "../types.js";

const from = process.env.MAIL_FROM || "noreply@snapback.dev";

export const send: SendEmailHandler = async ({ to, subject, html }: { to: string; subject: string; html?: string }) => {
	logger.info("📧 Resend: Sending email", { to, subject, from });

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
		},
		body: JSON.stringify({
			from,
			to,
			subject,
			html,
		}),
	});

	if (!response.ok) {
		const errorData = await response.json();
		logger.error("❌ Resend: Email send failed", {
			status: response.status,
			statusText: response.statusText,
			error: errorData,
			to,
			subject,
		});
		throw new Error("Could not send email");
	}

	const data = await response.json();
	logger.info("✅ Resend: Email sent successfully", {
		to,
		subject,
		emailId: data.id,
	});
};
