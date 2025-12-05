import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Resend } from "resend";

// Mock Resend
const mockSend = vi.fn();
const mockResend = {
	emails: {
		send: mockSend,
	},
} as unknown as Resend;

vi.mock("resend", () => ({
	Resend: vi.fn(() => mockResend),
}));

// Mock logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("Email Service", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(async () => {
		// Save original env
		originalEnv = process.env;
		process.env = {
			...originalEnv,
			RESEND_API_KEY: "test_api_key",
			NEXT_PUBLIC_APP_URL: "https://test.snapback.dev",
		};

		// Reset mocks
		vi.clearAllMocks();

		// Reset modules to get fresh instance
		vi.resetModules();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("sendWelcomeEmail", () => {
		it("should send welcome email successfully", async () => {
			const { sendWelcomeEmail } = await import("../email.js");

			mockSend.mockResolvedValueOnce({ id: "email-123" });

			const result = await sendWelcomeEmail("cust_123", "solo", "test@example.com");

			expect(result.success).toBe(true);
			expect(mockSend).toHaveBeenCalledOnce();
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "SnapBack <welcome@snapback.dev>",
					to: "test@example.com",
					subject: "Welcome to SnapBack Solo!",
				}),
			);
		});

		it("should include correct features for each plan", async () => {
			const { sendWelcomeEmail } = await import("../email.js");

			mockSend.mockResolvedValue({ id: "email-123" });

			// Test enterprise plan
			await sendWelcomeEmail("cust_1", "enterprise", "test@example.com");
			const enterpriseCall = mockSend.mock.calls[0][0];
			expect(enterpriseCall.html).toContain("Dedicated account manager");
			expect(enterpriseCall.html).toContain("SLA guarantee");

			// Test free plan
			await sendWelcomeEmail("cust_2", "free", "free@example.com");
			const freeCall = mockSend.mock.calls[1][0];
			expect(freeCall.html).toContain("50 snapshots per month");
		});

		it("should return error when email address is missing", async () => {
			const { sendWelcomeEmail } = await import("../email.js");
			const { logger } = await import("@snapback/infrastructure");

			const result = await sendWelcomeEmail("cust_123", "solo", undefined);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_EMAIL");
				expect(result.error.message).toBe("Email address required");
			}

			expect(logger.warn).toHaveBeenCalledWith(
				"Cannot send welcome email - no email address",
				{ customerId: "cust_123" },
			);
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("should return error when RESEND_API_KEY not configured", async () => {
			delete process.env.RESEND_API_KEY;

			const { sendWelcomeEmail } = await import("../email.js");
			const { logger } = await import("@snapback/infrastructure");

			const result = await sendWelcomeEmail("cust_123", "solo", "test@example.com");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("NOT_CONFIGURED");
			}

			expect(logger.warn).toHaveBeenCalledWith(
				"RESEND_API_KEY not configured - skipping welcome email",
				{ customerId: "cust_123" },
			);
		});

		it("should handle Resend API errors gracefully", async () => {
			const { sendWelcomeEmail } = await import("../email.js");
			const { logger } = await import("@snapback/infrastructure");

			const apiError = new Error("Rate limit exceeded");
			mockSend.mockRejectedValueOnce(apiError);

			const result = await sendWelcomeEmail("cust_123", "solo", "test@example.com");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("SEND_FAILED");
				expect(result.error.context?.originalError).toBe("Rate limit exceeded");
			}

			expect(logger.error).toHaveBeenCalledWith(
				"Failed to send welcome email",
				expect.objectContaining({
					error: "Rate limit exceeded",
					customerId: "cust_123",
				}),
			);
		});

		it("should capitalize plan name in subject", async () => {
			const { sendWelcomeEmail } = await import("../email.js");

			mockSend.mockResolvedValue({ id: "email-123" });

			await sendWelcomeEmail("cust_1", "team", "team@example.com");

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: "Welcome to SnapBack Team!",
				}),
			);
		});
	});

	describe("sendPaymentReceiptEmail", () => {
		it("should send payment receipt successfully", async () => {
			const { sendPaymentReceiptEmail } = await import("../email.js");
			const { logger } = await import("@snapback/infrastructure");

			mockSend.mockResolvedValueOnce({ id: "email-123" });

			const result = await sendPaymentReceiptEmail(
				"cust_123",
				5000, // $50.00
				"test@example.com",
			);

			expect(result.success).toBe(true);
			expect(mockSend).toHaveBeenCalledOnce();
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "SnapBack <billing@snapback.dev>",
					to: "test@example.com",
					subject: "Payment Receipt - SnapBack",
				}),
			);

			const htmlContent = mockSend.mock.calls[0][0].html;
			expect(htmlContent).toContain("$50.00");

			expect(logger.info).toHaveBeenCalledWith(
				"Payment receipt sent successfully",
				expect.objectContaining({
					customerId: "cust_123",
					amount: 5000,
				}),
			);
		});

		it("should format amount correctly", async () => {
			const { sendPaymentReceiptEmail } = await import("../email.js");

			mockSend.mockResolvedValue({ id: "email-123" });

			await sendPaymentReceiptEmail("cust_1", 999, "test@example.com");
			expect(mockSend.mock.calls[0][0].html).toContain("$9.99");

			await sendPaymentReceiptEmail("cust_2", 10050, "test@example.com");
			expect(mockSend.mock.calls[1][0].html).toContain("$100.50");
		});

		it("should return error when email missing", async () => {
			const { sendPaymentReceiptEmail } = await import("../email.js");

			const result = await sendPaymentReceiptEmail("cust_123", 5000, undefined);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_EMAIL");
			}
		});

		it("should handle send failures", async () => {
			const { sendPaymentReceiptEmail } = await import("../email.js");

			mockSend.mockRejectedValueOnce(new Error("Network error"));

			const result = await sendPaymentReceiptEmail(
				"cust_123",
				5000,
				"test@example.com",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("SEND_FAILED");
			}
		});
	});

	describe("sendPaymentFailedEmail", () => {
		it("should send payment failed email successfully", async () => {
			const { sendPaymentFailedEmail } = await import("../email.js");
			const { logger } = await import("@snapback/infrastructure");

			mockSend.mockResolvedValueOnce({ id: "email-123" });

			const result = await sendPaymentFailedEmail("cust_123", 1, "test@example.com");

			expect(result.success).toBe(true);
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "SnapBack <billing@snapback.dev>",
					to: "test@example.com",
					subject: "Payment Failed - Action Required",
				}),
			);

			expect(logger.info).toHaveBeenCalledWith(
				"Payment failed email sent successfully",
				expect.objectContaining({
					customerId: "cust_123",
					attemptCount: 1,
				}),
			);
		});

		it("should show different warning based on attempt count", async () => {
			const { sendPaymentFailedEmail } = await import("../email.js");

			mockSend.mockResolvedValue({ id: "email-123" });

			// First attempt
			await sendPaymentFailedEmail("cust_1", 1, "test@example.com");
			const firstCall = mockSend.mock.calls[0][0].html;
			expect(firstCall).toContain(
				"Please update your payment method to continue your subscription.",
			);

			// Third+ attempt
			await sendPaymentFailedEmail("cust_2", 3, "test@example.com");
			const thirdCall = mockSend.mock.calls[1][0].html;
			expect(thirdCall).toContain(
				"Your account will be suspended if payment is not received.",
			);
		});

		it("should return error when email missing", async () => {
			const { sendPaymentFailedEmail } = await import("../email.js");

			const result = await sendPaymentFailedEmail("cust_123", 1, undefined);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_EMAIL");
			}
		});
	});

	describe("sendEmail (generic)", () => {
		it("should send custom email successfully", async () => {
			const { sendEmail } = await import("../email.js");

			mockSend.mockResolvedValueOnce({ id: "email-123" });

			const result = await sendEmail({
				to: { email: "test@example.com", name: "Test User" },
				subject: "Test Subject",
				template: "<h1>Test Content</h1>",
				data: { customField: "value" },
			});

			expect(result.success).toBe(true);
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "SnapBack <noreply@snapback.dev>",
					to: "test@example.com",
					subject: "Test Subject",
					html: "<h1>Test Content</h1>",
				}),
			);
		});

		it("should throw error when not configured", async () => {
			delete process.env.RESEND_API_KEY;

			const { sendEmail } = await import("../email.js");

			const result = await sendEmail({
				to: { email: "test@example.com" },
				subject: "Test",
				template: "<p>Test</p>",
				data: {},
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("NOT_CONFIGURED");
			}
		});
	});

	describe("EmailError", () => {
		it("should create error with code and context", async () => {
			const { EmailError } = await import("../email.js");

			const error = new EmailError("Test error", "TEST_CODE", {
				customerId: "cust_123",
			});

			expect(error.name).toBe("EmailError");
			expect(error.message).toBe("Test error");
			expect(error.code).toBe("TEST_CODE");
			expect(error.context?.customerId).toBe("cust_123");
		});
	});

	describe("Environment handling", () => {
		it("should use default URLs when NEXT_PUBLIC_APP_URL not set", async () => {
			delete process.env.NEXT_PUBLIC_APP_URL;

			const { sendWelcomeEmail } = await import("../email.js");

			mockSend.mockResolvedValue({ id: "email-123" });

			await sendWelcomeEmail("cust_123", "solo", "test@example.com");

			const htmlContent = mockSend.mock.calls[0][0].html;
			expect(htmlContent).toContain("https://snapback.dev");
		});
	});
});
