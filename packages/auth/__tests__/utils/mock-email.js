var __awaiter =
	(this && this.__awaiter) ||
	((thisArg, _arguments, P, generator) => {
		function adopt(value) {
			return value instanceof P
				? value
				: new P((resolve) => {
						resolve(value);
					});
		}
		return new (P || (P = Promise))((resolve, reject) => {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator.throw(value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	});

import { vi } from "vitest";
export class MockEmailService {
	constructor() {
		this.sentEmails = [];
		this.sendEmail = vi.fn((message) =>
			__awaiter(this, void 0, void 0, function* () {
				this.sentEmails.push(Object.assign(Object.assign({}, message), { sentAt: new Date() }));
				return { success: true, messageId: crypto.randomUUID() };
			}),
		);
	}
	getLastEmail(to) {
		if (to) {
			const filtered = this.sentEmails.filter((email) => email.to === to);
			return filtered[filtered.length - 1];
		}
		return this.sentEmails[this.sentEmails.length - 1];
	}
	getEmailsByTemplate(templateId, to) {
		let filtered = this.sentEmails.filter((email) => email.templateId === templateId);
		if (to) {
			filtered = filtered.filter((email) => email.to === to);
		}
		return filtered;
	}
	getVerificationUrl(email) {
		const verificationEmail = this.sentEmails
			.filter((e) => e.to === email && e.templateId === "emailVerification")
			.pop();
		return (
			(verificationEmail === null || verificationEmail === void 0 ? void 0 : verificationEmail.context.url) ||
			null
		);
	}
	getResetPasswordUrl(email) {
		const resetEmail = this.sentEmails.filter((e) => e.to === email && e.templateId === "forgotPassword").pop();
		return (resetEmail === null || resetEmail === void 0 ? void 0 : resetEmail.context.url) || null;
	}
	getMagicLinkUrl(email) {
		const magicEmail = this.sentEmails.filter((e) => e.to === email && e.templateId === "magicLink").pop();
		return (magicEmail === null || magicEmail === void 0 ? void 0 : magicEmail.context.url) || null;
	}
	getAllEmails() {
		return [...this.sentEmails];
	}
	reset() {
		this.sentEmails = [];
		this.sendEmail.mockClear();
	}
	hasEmailBeenSent(to, templateId) {
		return this.sentEmails.some((email) => email.to === to && (!templateId || email.templateId === templateId));
	}
	getEmailCount(to, templateId) {
		return this.sentEmails.filter(
			(email) => (!to || email.to === to) && (!templateId || email.templateId === templateId),
		).length;
	}
}
export const createMockEmailService = () => new MockEmailService();
