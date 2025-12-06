import { logger } from "@snapback/infrastructure";
import type { emails as mailTemplates } from "../../emails";
import { send } from "../provider/index";
import type { TemplateId } from "./templates";
import { getTemplate } from "./templates";

export async function sendEmail<T extends TemplateId>(
	params: {
		to: string;
	} & (
		| {
				templateId: T;
				context: Parameters<(typeof mailTemplates)[T]>[0];
		  }
		| {
				subject: string;
				text?: string;
				html?: string;
		  }
	),
) {
	const { to } = params;

	let html: string;
	let text: string;
	let subject: string;

	if ("templateId" in params) {
		const { templateId, context } = params;
		logger.info("📧 Mail: Rendering email template", {
			to,
			templateId,
			context: context ? Object.keys(context) : [],
		});

		const template = await getTemplate({
			templateId,
			context,
		});
		subject = template.subject;
		text = template.text;
		html = template.html;

		logger.info("📧 Mail: Template rendered successfully", {
			to,
			templateId,
			subject,
		});
	} else {
		subject = params.subject;
		text = params.text ?? "";
		html = params.html ?? "";

		logger.info("📧 Mail: Sending custom email", { to, subject });
	}

	try {
		await send({
			to,
			subject,
			text,
			html,
		});
		logger.info("✅ Mail: Email sent successfully", { to, subject });
		return true;
	} catch (e) {
		logger.error("❌ Mail: Failed to send email", {
			to,
			subject,
			error: e,
		});
		return false;
	}
}
