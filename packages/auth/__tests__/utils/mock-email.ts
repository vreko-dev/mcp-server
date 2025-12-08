import { vi } from "vitest";

/**
 * Mock email service for testing email-based auth flows
 * Captures sent emails for verification in tests
 */

interface EmailMessage {
	to: string;
	templateId: string;
	context: Record<string, any>;
	locale?: string;
	sentAt: Date;
}

export class MockEmailService {
	private sentEmails: EmailMessage[] = [];

	sendEmail = vi.fn(async (message: Omit<EmailMessage, "sentAt">) => {
		this.sentEmails.push({
			...message,
			sentAt: new Date(),
		});
		return { success: true, messageId: crypto.randomUUID() };
	});

	getLastEmail(to?: string): EmailMessage | undefined {
		if (to) {
			const filtered = this.sentEmails.filter((email) => email.to === to);
			return filtered[filtered.length - 1];
		}
		return this.sentEmails[this.sentEmails.length - 1];
	}

	getEmailsByTemplate(templateId: string, to?: string): EmailMessage[] {
		let filtered = this.sentEmails.filter((email) => email.templateId === templateId);
		if (to) {
			filtered = filtered.filter((email) => email.to === to);
		}
		return filtered;
	}

	getVerificationUrl(email: string): string | null {
		const verificationEmail = this.sentEmails
			.filter((e) => e.to === email && e.templateId === "emailVerification")
			.pop();

		return verificationEmail?.context.url || null;
	}

	getResetPasswordUrl(email: string): string | null {
		const resetEmail = this.sentEmails.filter((e) => e.to === email && e.templateId === "forgotPassword").pop();

		return resetEmail?.context.url || null;
	}

	getMagicLinkUrl(email: string): string | null {
		const magicEmail = this.sentEmails.filter((e) => e.to === email && e.templateId === "magicLink").pop();

		return magicEmail?.context.url || null;
	}

	getAllEmails(): EmailMessage[] {
		return [...this.sentEmails];
	}

	reset(): void {
		this.sentEmails = [];
		this.sendEmail.mockClear();
	}

	hasEmailBeenSent(to: string, templateId?: string): boolean {
		return this.sentEmails.some((email) => email.to === to && (!templateId || email.templateId === templateId));
	}

	getEmailCount(to?: string, templateId?: string): number {
		return this.sentEmails.filter(
			(email) => (!to || email.to === to) && (!templateId || email.templateId === templateId),
		).length;
	}
}

export const createMockEmailService = () => new MockEmailService();
