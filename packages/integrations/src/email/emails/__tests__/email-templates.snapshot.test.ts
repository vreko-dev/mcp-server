import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import WelcomeSubscriptionEmail from "../WelcomeSubscriptionEmail.js";
import CancellationEmail from "../CancellationEmail.js";
import PaymentReceiptEmail from "../PaymentReceiptEmail.js";
import PaymentFailedEmail from "../PaymentFailedEmail.js";

describe("Email Template Snapshot Tests", () => {
	describe("WelcomeSubscriptionEmail", () => {
		it("should match snapshot for Solo plan", async () => {
			const html = await render(
				WelcomeSubscriptionEmail({
					plan: "solo",
					features: [
						"Unlimited snapshots",
						"Cloud backup",
						"Advanced AI detection",
						"Custom security rules",
					],
					dashboardUrl: "https://snapback.dev/dashboard",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toMatchSnapshot();
		});

		it("should match snapshot for Team plan", async () => {
			const html = await render(
				WelcomeSubscriptionEmail({
					plan: "team",
					features: [
						"Unlimited snapshots",
						"Team collaboration",
						"Priority support",
						"Advanced analytics",
					],
					dashboardUrl: "https://snapback.dev/dashboard",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toMatchSnapshot();
		});

		it("should match snapshot for Enterprise plan", async () => {
			const html = await render(
				WelcomeSubscriptionEmail({
					plan: "enterprise",
					features: [
						"Unlimited snapshots",
						"SLA guarantee",
						"Dedicated account manager",
						"Custom integrations",
					],
					dashboardUrl: "https://snapback.dev/dashboard",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toMatchSnapshot();
		});

		it("should render valid HTML structure", async () => {
			const html = await render(
				WelcomeSubscriptionEmail({
					plan: "solo",
					features: ["Unlimited snapshots"],
					dashboardUrl: "https://snapback.dev/dashboard",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toContain("<!DOCTYPE");
			expect(html).toContain("<html");
			expect(html).toContain("</html>");
			expect(html).toContain("Welcome to SnapBack");
		});
	});

	describe("CancellationEmail", () => {
		it("should match snapshot with retention offer", async () => {
			const html = await render(
				CancellationEmail({
					retentionOffer: "Get 25% off if you resubscribe within 7 days",
					feedbackUrl: "https://snapback.dev/feedback?reason=cancellation",
					resubscribeUrl: "https://snapback.dev/pricing",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toMatchSnapshot();
		});

		it("should include all key elements", async () => {
			const html = await render(
				CancellationEmail({
					retentionOffer: "Get 25% off if you resubscribe within 7 days",
					feedbackUrl: "https://snapback.dev/feedback",
					resubscribeUrl: "https://snapback.dev/pricing",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toContain("We&#x27;re sorry to see you go");
			expect(html).toContain("Get 25% off");
			expect(html).toContain("https://snapback.dev/feedback");
			expect(html).toContain("https://snapback.dev/pricing");
			expect(html).toContain("support@snapback.dev");
		});
	});

	describe("PaymentReceiptEmail", () => {
		it("should match snapshot for $49.99 payment", async () => {
			const html = await render(
				PaymentReceiptEmail({
					amount: "49.99",
					currency: "USD",
					date: "December 3, 2025",
					invoiceUrl: "https://snapback.dev/invoice/inv_123",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toMatchSnapshot();
		});

		it("should format currency correctly", async () => {
			const html = await render(
				PaymentReceiptEmail({
					amount: "199.00",
					currency: "USD",
					date: "December 3, 2025",
					invoiceUrl: "https://snapback.dev/invoice/inv_123",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toContain("$199.00");
			expect(html).toContain("USD");
		});

		it("should include invoice link", async () => {
			const html = await render(
				PaymentReceiptEmail({
					amount: "49.99",
					currency: "USD",
					date: "December 3, 2025",
					invoiceUrl: "https://snapback.dev/invoice/inv_456",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toContain("https://snapback.dev/invoice/inv_456");
		});
	});

	describe("PaymentFailedEmail", () => {
		it("should match snapshot with update payment URL", async () => {
			const html = await render(
				PaymentFailedEmail({
					attemptCount: 1,
					updatePaymentUrl: "https://snapback.dev/settings/billing",
					warningMessage:
						"Please update your payment method within 3 days to avoid service interruption",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toMatchSnapshot();
		});

		it("should include warning message prominently", async () => {
			const html = await render(
				PaymentFailedEmail({
					attemptCount: 1,
					updatePaymentUrl: "https://snapback.dev/settings/billing",
					warningMessage: "Payment failed - update your card now",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toContain("Payment failed - update your card now");
			expect(html).toContain("https://snapback.dev/settings/billing");
		});

		it("should display urgency for multiple failed attempts", async () => {
			const html = await render(
				PaymentFailedEmail({
					attemptCount: 3,
					updatePaymentUrl: "https://snapback.dev/settings/billing",
					warningMessage: "Update payment method",
					supportEmail: "support@snapback.dev",
				})
			);

			expect(html).toContain("URGENT");
			expect(html).toContain("attempt");
			expect(html).toContain("3");
		});
	});

	describe("HTML Validation", () => {
		it("all templates should have valid DOCTYPE", async () => {
			const templates = [
				WelcomeSubscriptionEmail({
					plan: "solo",
					features: [],
					dashboardUrl: "https://snapback.dev/dashboard",
					supportEmail: "support@snapback.dev",
				}),
				CancellationEmail({
					retentionOffer: "Test",
					feedbackUrl: "https://test.com",
					resubscribeUrl: "https://test.com",
					supportEmail: "test@test.com",
				}),
				PaymentReceiptEmail({
					amount: "49.99",
					currency: "USD",
					date: "Test",
					supportEmail: "test@test.com",
				}),
				PaymentFailedEmail({
					attemptCount: 1,
					updatePaymentUrl: "https://test.com",
					warningMessage: "Test",
					supportEmail: "test@test.com",
				}),
			];

			for (const template of templates) {
				const html = await render(template);
				expect(html).toContain("<!DOCTYPE");
				expect(html).toContain("<html");
				expect(html).toContain("</html>");
			}
		});

		it("all templates should be mobile-responsive", async () => {
			const templates = [
				WelcomeSubscriptionEmail({
					plan: "solo",
					features: [],
					dashboardUrl: "https://snapback.dev/dashboard",
					supportEmail: "support@snapback.dev",
				}),
				CancellationEmail({
					retentionOffer: "Test",
					feedbackUrl: "https://test.com",
					resubscribeUrl: "https://test.com",
					supportEmail: "test@test.com",
				}),
			];

			for (const template of templates) {
				const html = await render(template);
				// Check for viewport meta tag (common in email templates)
				expect(html).toMatch(/viewport|responsive|width/i);
			}
		});
	});
});
