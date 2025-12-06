import { render } from "@react-email/render";
import { emails as mailTemplates } from "../../emails";

const subjectMap: Record<string, string> = {
	emailVerification: "Verify your email address",
	magicLink: "Sign in to your account",
	forgotPassword: "Reset your password",
	welcomeEmail: "Welcome to SnapBack",
	newUser: "Welcome to SnapBack",
	apiKeyCreatedEmail: "Your new API key",
	organizationInvitation: "You've been invited to join an organization",
	newsletterSignup: "Welcome to the SnapBack newsletter",
};

export async function getTemplate<T extends TemplateId>({
	templateId,
	context,
}: {
	templateId: T;
	context: Parameters<(typeof mailTemplates)[T]>[0];
}) {
	const template = mailTemplates[templateId];

	const email = template(context as any);

	const subject = subjectMap[templateId] || "Notification from SnapBack";

	const html = await render(email);
	const text = await render(email, { plainText: true });
	return { html, text, subject };
}

export type TemplateId = keyof typeof mailTemplates;
