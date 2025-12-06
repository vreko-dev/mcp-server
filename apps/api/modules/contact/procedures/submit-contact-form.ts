import { ORPCError } from "@orpc/client";
import { config } from "@snapback/config";
import { logger } from "@snapback/infrastructure";
import { sendEmail } from "@snapback/integrations";
import { localeMiddleware } from "../../../orpc/middleware/locale-middleware";
import { publicProcedure } from "../../../orpc/procedures";
import { contactFormSchema } from "../types";

export const submitContactForm = publicProcedure
	.route({
		method: "POST",
		path: "/contact",
		tags: ["Contact"],
		summary: "Submit contact form",
	})
	.input(contactFormSchema)
	.use(localeMiddleware)
	.handler(async ({ input: { email, name, message } }) => {
		try {
			await sendEmail({
				to: config.contactForm.to,
				subject: config.contactForm.subject,
				text: `Name: ${name}

Email: ${email}

Message: ${message}`,
			});
		} catch (error) {
			logger.error("Error submitting contact form", { error });
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
