import { logger } from "@snapback/infrastructure";
import type { SendEmailHandler } from "./../types";

export const send: SendEmailHandler = async ({ to, subject, text }: { to: string; subject: string; text: string }) => {
	let formattedOutput = `Sending email to ${to} with subject ${subject}\n\n`;

	formattedOutput += `Text: ${text}\n\n`;

	logger.info(formattedOutput);
};
