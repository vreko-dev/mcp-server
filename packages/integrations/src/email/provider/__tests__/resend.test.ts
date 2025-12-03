import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { send } from "../resend.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

// Mock logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

import { logger } from "@snapback/infrastructure";

describe("Resend Email Provider", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = {
			...originalEnv,
			RESEND_API_KEY: "re_test_key_123",
			MAIL_FROM: "test@snapback.dev",
		};
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	describe("send", () => {
		it("should send email successfully with valid API key", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ id: "email_123" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await send({
				to: "user@example.com",
				subject: "Test Email",
				text: "Test content",
				html: "<p>Test content</p>",
			});

			// Verify fetch was called with correct params
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.resend.com/emails",
				expect.objectContaining({
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer re_test_key_123",
					},
					body: expect.stringContaining("user@example.com"),
				})
			);

			// Verify success logging
			expect(logger.info).toHaveBeenCalledWith(
				"📧 Resend: Sending email",
				expect.objectContaining({
					to: "user@example.com",
					subject: "Test Email",
				})
			);

			expect(logger.info).toHaveBeenCalledWith(
				"✅ Resend: Email sent successfully",
				expect.objectContaining({
					emailId: "email_123",
				})
			);
		});

		it("should use default MAIL_FROM if not set", async () => {
			delete process.env.MAIL_FROM;

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: "email_123" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await send({
				to: "user@example.com",
				subject: "Test",
				text: "Test",
				html: "<p>Test</p>",
			});

			const fetchCall = mockFetch.mock.calls[0][1];
			const body = JSON.parse(fetchCall?.body as string);
			expect(body.from).toBe("noreply@snapback.dev");
		});

		it("should throw error on API failure with 4xx status", async () => {
			const errorResponse = {
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: vi
					.fn()
					.mockResolvedValue({ error: "Invalid email address" }),
			};
			mockFetch.mockResolvedValueOnce(errorResponse);

			await expect(
				send({
					to: "invalid-email",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow("Could not send email");

			// Verify error logging
			expect(logger.error).toHaveBeenCalledWith(
				"❌ Resend: Email send failed",
				expect.objectContaining({
					status: 400,
					statusText: "Bad Request",
					error: { error: "Invalid email address" },
				})
			);
		});

		it("should throw error on API failure with 5xx status", async () => {
			const errorResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: vi.fn().mockResolvedValue({ error: "Server error" }),
			};
			mockFetch.mockResolvedValueOnce(errorResponse);

			await expect(
				send({
					to: "user@example.com",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow("Could not send email");

			expect(logger.error).toHaveBeenCalledWith(
				"❌ Resend: Email send failed",
				expect.objectContaining({
					status: 500,
				})
			);
		});

		it("should throw error on network failure", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

			await expect(
				send({
					to: "user@example.com",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow("Network timeout");
		});

		it("should handle unauthorized error (401)", async () => {
			const errorResponse = {
				ok: false,
				status: 401,
				statusText: "Unauthorized",
				json: vi.fn().mockResolvedValue({ error: "Invalid API key" }),
			};
			mockFetch.mockResolvedValueOnce(errorResponse);

			await expect(
				send({
					to: "user@example.com",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow("Could not send email");

			expect(logger.error).toHaveBeenCalledWith(
				"❌ Resend: Email send failed",
				expect.objectContaining({
					status: 401,
					error: { error: "Invalid API key" },
				})
			);
		});

		it("should handle rate limit error (429)", async () => {
			const errorResponse = {
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
				json: vi.fn().mockResolvedValue({ error: "Rate limit exceeded" }),
			};
			mockFetch.mockResolvedValueOnce(errorResponse);

			await expect(
				send({
					to: "user@example.com",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow("Could not send email");
		});

		it("should send email without HTML content (text-only)", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: "email_text_123" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await send({
				to: "user@example.com",
				subject: "Plain text email",
				text: "Plain text content",
			});

			const fetchCall = mockFetch.mock.calls[0][1];
			const body = JSON.parse(fetchCall?.body as string);
			expect(body.html).toBeUndefined();
		});

		it("should properly escape HTML content in request", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: "email_123" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			const htmlContent = `
				<div>
					<p>Hello "User"</p>
					<script>alert('XSS')</script>
				</div>
			`;

			await send({
				to: "user@example.com",
				subject: "HTML Email",
				text: "HTML Email",
				html: htmlContent,
			});

			const fetchCall = mockFetch.mock.calls[0][1];
			const body = JSON.parse(fetchCall?.body as string);
			expect(body.html).toBe(htmlContent);
		});
	});

	describe("Environment configuration", () => {
		it("should fail gracefully without RESEND_API_KEY", async () => {
			delete process.env.RESEND_API_KEY;

			const mockResponse = {
				ok: false,
				status: 401,
				statusText: "Unauthorized",
				json: vi.fn().mockResolvedValue({ error: "No API key" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await expect(
				send({
					to: "user@example.com",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow();

			// Verify Authorization header contains 'undefined'
			const fetchCall = mockFetch.mock.calls[0][1];
			expect(fetchCall?.headers?.Authorization).toBe("Bearer undefined");
		});
	});

	describe("Response parsing", () => {
		it("should handle malformed JSON response gracefully", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await expect(
				send({
					to: "user@example.com",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow("Invalid JSON");
		});

		it("should handle error response with malformed JSON", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await expect(
				send({
					to: "user@example.com",
					subject: "Test",
					text: "Test",
					html: "<p>Test</p>",
				})
			).rejects.toThrow("Invalid JSON");
		});
	});

	describe("Integration scenarios", () => {
		it("should send welcome email successfully", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: "welcome_email_123" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await send({
				to: "newuser@example.com",
				subject: "Welcome to SnapBack Solo!",
				text: "Welcome!",
				html: "<html><body><h1>Welcome!</h1></body></html>",
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.resend.com/emails",
				expect.objectContaining({
					method: "POST",
				})
			);

			expect(logger.info).toHaveBeenCalledWith(
				"✅ Resend: Email sent successfully",
				expect.objectContaining({
					emailId: "welcome_email_123",
				})
			);
		});

		it("should send payment receipt successfully", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: "receipt_email_123" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await send({
				to: "customer@example.com",
				subject: "Payment Receipt - SnapBack Solo",
				text: "Payment successful: $49.99",
				html: "<html><body><p>Payment successful: $49.99</p></body></html>",
			});

			expect(logger.info).toHaveBeenCalledWith(
				"✅ Resend: Email sent successfully",
				expect.objectContaining({
					to: "customer@example.com",
					emailId: "receipt_email_123",
				})
			);
		});
	});
});
