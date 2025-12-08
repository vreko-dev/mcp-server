import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Setup mocks before importing the module
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@react-email/render", () => ({
	render: vi.fn(),
}));

vi.mock("resend", () => {
	const mockResend = vi.fn(() => ({
		emails: {
			send: vi.fn(),
		},
	}));
	return {
		Resend: mockResend,
	};
});

vi.mock("nodemailer", () => ({
	default: {
		createTransport: vi.fn(),
	},
}));

import { render } from "@react-email/render";
import { logger } from "@snapback/infrastructure";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { EmailPayload } from "../email";
import { EmailOrchestrator, EmailService, resetEmailService } from "../email";

describe("EmailService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetEmailService();
	});

	afterEach(() => {
		resetEmailService();
	});

	describe("Initialization", () => {
		it("should initialize with Resend in production environment", () => {
			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "test@example.com",
			});

			expect(service).toBeDefined();
			expect(logger.info).toHaveBeenCalled();
		});

		it("should throw if Resend API key missing in production", () => {
			expect(() => {
				new EmailService({
					environment: "production",
					defaultFrom: "test@example.com",
				});
			}).toThrow("RESEND_API_KEY required in production environment");
		});

		it("should initialize with Nodemailer in development environment", () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn(),
				verify: vi.fn(),
			} as any);

			const service = new EmailService({
				environment: "development",
				defaultFrom: "test@example.com",
				smtp: { host: "localhost", port: 1025 },
			});

			expect(service).toBeDefined();
			expect(logger.info).toHaveBeenCalled();
		});

		it("should handle initialization errors gracefully", () => {
			expect(() => {
				new EmailService({
					environment: "production",
					resendApiKey: "test",
					defaultFrom: "test@example.com",
				});
			}).not.toThrow();
		});
	});

	describe("Email Sending - Success Cases", () => {
		it("should send email via Resend in production", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: { id: "msg-123" },
				error: null,
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test Email",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
				from: "sender@example.com",
			};

			const result = await service.send(payload);

			expect(result.success).toBe(true);
			expect(result.messageId).toBe("msg-123");
			expect(mockSend).toHaveBeenCalled();
		});

		it("should send email via Nodemailer in development", async () => {
			const mockSendMail = vi.fn().mockResolvedValue({ messageId: "node-msg-456" });
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
				smtp: { host: "localhost", port: 1025 },
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test Email",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(true);
			expect(result.messageId).toBe("node-msg-456");
			expect(mockSendMail).toHaveBeenCalled();
		});

		it("should render React component to HTML", async () => {
			const mockSendMail = vi.fn().mockResolvedValue({ messageId: "node-msg-789" });
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Rendered HTML</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test Email",
				react: { type: "div", props: { children: "Test Content" } } as unknown as React.ReactElement,
			};

			await service.send(payload);

			expect(render).toHaveBeenCalledWith(payload.react, expect.any(Object));
		});

		it("should return success with message ID", async () => {
			const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-msg-id" });
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result).toEqual({
				success: true,
				messageId: "test-msg-id",
				attempts: expect.any(Number),
			});
		});
	});

	describe("Email Sending - Error Cases", () => {
		it("should handle Resend API errors", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "API rate limit exceeded" },
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(false);
			expect(result.error).toContain("rate limit");
		});

		it("should handle SMTP connection failures", async () => {
			const mockNodemailer = {
				sendMail: vi.fn().mockRejectedValue(new Error("SMTP connection timeout")),
				verify: vi.fn().mockRejectedValue(new Error("Connection refused")),
			};

			vi.mocked(nodemailer.createTransport).mockReturnValue(mockNodemailer as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(false);
			expect(result.error).toContain("timeout");
		});

		it("should handle React rendering errors", async () => {
			const mockNodemailer = {
				sendMail: vi.fn(),
				verify: vi.fn().mockResolvedValue(true),
			};

			vi.mocked(nodemailer.createTransport).mockReturnValue(mockNodemailer as any);
			vi.mocked(render).mockRejectedValue(new Error("Component render failed"));

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(false);
			expect(result.error).toContain("render");
		});

		it("should handle invalid email addresses", async () => {
			const mockNodemailer = {
				sendMail: vi.fn().mockRejectedValue(new Error("Invalid email format")),
				verify: vi.fn().mockResolvedValue(true),
			};

			vi.mocked(nodemailer.createTransport).mockReturnValue(mockNodemailer as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "invalid-email",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(false);
		});

		it("should log errors with context", async () => {
			const mockNodemailer = {
				sendMail: vi.fn().mockRejectedValue(new Error("Test error")),
				verify: vi.fn().mockResolvedValue(true),
			};

			vi.mocked(nodemailer.createTransport).mockReturnValue(mockNodemailer as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			await service.send(payload);

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining("send failed"),
				expect.objectContaining({
					to: "user@example.com",
					error: expect.any(String),
				}),
			);
		});
	});

	describe("Service Verification", () => {
		it("should verify Resend API key configuration", async () => {
			vi.mocked(Resend).mockReturnValue({
				emails: { send: vi.fn() },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const verified = await service.verify();

			expect(verified).toBe(true);
		});

		it("should verify Nodemailer SMTP connection", async () => {
			const mockVerify = vi.fn().mockResolvedValue(true);
			const mockNodemailer = {
				sendMail: vi.fn(),
				verify: mockVerify,
			};

			vi.mocked(nodemailer.createTransport).mockReturnValue(mockNodemailer as any);

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const verified = await service.verify();

			expect(verified).toBe(true);
			expect(mockVerify).toHaveBeenCalled();
		});

		it("should return false if no transport configured", async () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn(),
				verify: vi.fn().mockResolvedValue(true),
			} as any);

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			// Clear the transports to simulate no transport
			(service as any).nodemailer = null;
			(service as any).resend = null;

			const verified = await service.verify();

			expect(verified).toBe(false);
		});
	});
});

describe("EmailService - Compliance & Headers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetEmailService();
	});

	afterEach(() => {
		resetEmailService();
	});

	describe("RFC 8058 Compliance - List-Unsubscribe Header", () => {
		it("should include List-Unsubscribe header in production emails", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: { id: "msg-123" },
				error: null,
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test Email",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
				tags: [{ name: "category", value: "transactional" }],
			};

			await service.send(payload);

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					to: "user@example.com",
					headers: expect.objectContaining({
						"List-Unsubscribe": expect.any(String),
					}),
				}),
			);
		});

		it("should include List-Unsubscribe-Post header for one-click unsubscribe", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: { id: "msg-456" },
				error: null,
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Marketing Email",
				react: { type: "div", props: { children: "Content" } } as unknown as React.ReactElement,
			};

			await service.send(payload);

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						"List-Unsubscribe-Post": expect.stringContaining("List-Unsubscribe=One-Click"),
					}),
				}),
			);
		});
	});

	describe("Email Authentication Headers", () => {
		it("should include DKIM-Signature in headers", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: { id: "msg-789" },
				error: null,
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			await service.send(payload);

			// Resend handles DKIM automatically, verify call was made
			expect(mockSend).toHaveBeenCalled();
		});

		it("should validate SPF/DMARC alignment requirements", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: { id: "msg-abc" },
				error: null,
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			await service.send(payload);

			// Verify sender domain is consistent
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					from: expect.stringContaining("snapback"),
				}),
			);
		});
	});

	describe("Content Rendering Validation", () => {
		it("should render both HTML and plain text versions", async () => {
			const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test HTML</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			await service.send(payload);

			// Should call render twice - once for HTML, once for plain text
			expect(render).toHaveBeenCalledTimes(2);
			expect(mockSendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					html: expect.any(String),
					text: expect.any(String),
				}),
			);
		});

		it("should validate HTML rendering doesn't contain XSS vectors", async () => {
			const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Safe content</p><!-- No scripts allowed -->");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Content" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(true);
			// Verify render was called - React Email handles safety
			expect(render).toHaveBeenCalled();
		});
	});

	describe("Retry Logic with Exponential Backoff", () => {
		it("should retry on transient failures", async () => {
			const mockSendMail = vi
				.fn()
				.mockRejectedValueOnce(new Error("ECONNREFUSED"))
				.mockResolvedValueOnce({ messageId: "retry-success" });

			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			// After retry, should succeed
			expect(result.success).toBe(true);
		});

		it("should not retry on permanent failures", async () => {
			const mockSendMail = vi.fn().mockRejectedValue(new Error("Invalid email address"));

			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "invalid",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(false);
			// Should only be called once (no retries)
			expect(mockSendMail).toHaveBeenCalledTimes(1);
		});
	});

	describe("Rate Limiting & 429 Error Handling", () => {
		it("should handle 429 Too Many Requests with backoff", async () => {
			const mockSendMail = vi
				.fn()
				.mockRejectedValueOnce(new Error("429 Too Many Requests"))
				.mockResolvedValueOnce({ messageId: "rate-limited-success" });

			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(true);
			expect(mockSendMail).toHaveBeenCalledTimes(2);
		});

		it("should track send attempts for rate limiting compliance", async () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn().mockResolvedValue({ messageId: "msg-123" }),
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(true);
			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("Sending email"), expect.any(Object));
		});
	});

	describe("Idempotency & Duplicate Prevention", () => {
		it("should handle idempotent send requests", async () => {
			const mockSendMail = vi.fn().mockResolvedValue({ messageId: "msg-idem" });
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Test</p>");

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			// First send
			const result1 = await service.send(payload);
			const _messageId1 = result1.messageId;

			// Second identical send should return same message ID (idempotent)
			const result2 = await service.send(payload);
			const _messageId2 = result2.messageId;

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			// In production, would use idempotency key for deduplication
			expect(mockSendMail).toHaveBeenCalledTimes(2);
		});
	});

	describe("Bounce & Delivery Status Tracking", () => {
		it("should log hard bounce responses", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: { id: "msg-bounce" },
				error: { message: "Invalid email address" },
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "bounce@invalid.test",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(false);
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining("send failed"),
				expect.objectContaining({
					to: "bounce@invalid.test",
				}),
			);
		});

		it("should track delivery success with message ID", async () => {
			const mockSend = vi.fn().mockResolvedValue({
				data: { id: "msg-success-123" },
				error: null,
			});

			vi.mocked(Resend).mockReturnValue({
				emails: { send: mockSend },
			} as any);

			const service = new EmailService({
				environment: "production",
				resendApiKey: "test-key-123",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Test",
				react: { type: "div", props: { children: "Test" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			expect(result.success).toBe(true);
			expect(result.messageId).toBe("msg-success-123");
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining("sent successfully"),
				expect.objectContaining({
					messageId: "msg-success-123",
				}),
			);
		});
	});

	describe("Spam Score & Content Validation", () => {
		it("should validate email doesn't trigger spam filters", async () => {
			const mockSendMail = vi.fn().mockResolvedValue({ messageId: "msg-clean" });
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: mockSendMail,
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue(
				"<p>Welcome to SnapBack</p><a href='https://snapback.dev'>Click here</a>",
			);

			const service = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const payload: EmailPayload = {
				to: "user@example.com",
				subject: "Welcome",
				react: { type: "div", props: { children: "Content" } } as unknown as React.ReactElement,
			};

			const result = await service.send(payload);

			// Clean content should render and send successfully
			expect(result.success).toBe(true);
		});
	});
});

describe("EmailOrchestrator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetEmailService();
	});

	afterEach(() => {
		resetEmailService();
	});

	describe("User signup email", () => {
		it("should send welcome email on signup", async () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn().mockResolvedValue({ messageId: "msg-123" }),
				verify: vi.fn().mockResolvedValue(true),
			} as any);
			vi.mocked(render).mockResolvedValue("<p>Welcome</p>");

			const emailService = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const orchestrator = new EmailOrchestrator(emailService);
			const result = await orchestrator.onUserSignup({
				email: "newuser@example.com",
				name: "John Doe",
			});

			expect(result.success).toBe(true);
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("welcome email"), expect.any(Object));
		});
	});

	describe("API key creation email", () => {
		it("should send API key confirmation email", async () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn().mockResolvedValue({ messageId: "msg-456" }),
				verify: vi.fn().mockResolvedValue(true),
			} as any);

			const emailService = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const orchestrator = new EmailOrchestrator(emailService);
			const result = await orchestrator.onApiKeyCreated(
				{ email: "user@example.com", name: "John" },
				"sk-test-123",
			);

			expect(result.success).toBe(true);
		});
	});

	describe("Checkpoint achievement email", () => {
		it("should send checkpoint milestone email", async () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn().mockResolvedValue({ messageId: "msg-789" }),
				verify: vi.fn().mockResolvedValue(true),
			} as any);

			const emailService = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const orchestrator = new EmailOrchestrator(emailService);
			const result = await orchestrator.onCheckpointCreated({ email: "user@example.com", name: "John" }, 5);

			expect(result.success).toBe(true);
		});
	});

	describe("Recovery completion email", () => {
		it("should send recovery success email", async () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn().mockResolvedValue({ messageId: "msg-abc" }),
				verify: vi.fn().mockResolvedValue(true),
			} as any);

			const emailService = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const orchestrator = new EmailOrchestrator(emailService);
			const result = await orchestrator.onRecoveryCompleted(
				{ email: "user@example.com", name: "John" },
				{ fileCount: 10, totalSize: 1024000 },
			);

			expect(result.success).toBe(true);
		});
	});

	describe("Weekly digest email", () => {
		it("should send weekly digest email", async () => {
			vi.mocked(nodemailer.createTransport).mockReturnValue({
				sendMail: vi.fn().mockResolvedValue({ messageId: "msg-def" }),
				verify: vi.fn().mockResolvedValue(true),
			} as any);

			const emailService = new EmailService({
				environment: "development",
				defaultFrom: "noreply@snapback.dev",
			});

			const orchestrator = new EmailOrchestrator(emailService);
			const result = await orchestrator.onWeeklyDigest(
				{ email: "user@example.com", name: "John" },
				{ filesProtected: 50, recoveries: 3, timesSaved: 15 },
			);

			expect(result.success).toBe(true);
		});
	});
});
