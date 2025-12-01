import { auth } from "@snapback/auth";
import { createCheckoutLink } from "@snapback/integrations/stripe/provider/stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as CreateCheckoutPOST } from "../../../app/api/v1/billing/create-checkout/route.js";

// Mock auth
vi.mock("@snapback/auth", () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

// Mock Stripe
vi.mock("@snapback/integrations/stripe/provider/stripe", () => ({
	createCheckoutLink: vi.fn(),
}));

describe("POST /api/v1/billing/create-checkout", () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
	});

	it("should create a checkout session successfully", async () => {
		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({
			user: {
				id: "user123",
				email: "test@example.com",
			},
		});

		// Mock Stripe checkout link creation
		(createCheckoutLink as vi.Mock).mockResolvedValue(
			"https://checkout.stripe.com/test-session",
		);

		// Mock a NextRequest object
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "x-auth-context") {
						return JSON.stringify({
							type: "user",
							userId: "user123",
						});
					}
					if (header === "Authorization") {
						return "Bearer test-token";
					}
					return null;
				}),
			},
			json: vi.fn().mockResolvedValue({
				plan: "solo",
				successUrl: "https://example.com/success",
				cancelUrl: "https://example.com/cancel",
			}),
		};

		const response = await CreateCheckoutPOST(mockRequest as any);
		const responseBody = await response.json();

		expect(response.status).toBe(200);
		expect(responseBody.url).toBe("https://checkout.stripe.com/test-session");
		expect(createCheckoutLink).toHaveBeenCalled();
	});

	it("should return 400 for invalid plan", async () => {
		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({
			user: {
				id: "user123",
				email: "test@example.com",
			},
		});

		// Mock a NextRequest object with invalid plan
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "x-auth-context") {
						return JSON.stringify({
							type: "user",
							userId: "user123",
						});
					}
					if (header === "Authorization") {
						return "Bearer test-token";
					}
					return null;
				}),
			},
			json: vi.fn().mockResolvedValue({
				plan: "invalid-plan",
				successUrl: "https://example.com/success",
				cancelUrl: "https://example.com/cancel",
			}),
		};

		const response = await CreateCheckoutPOST(mockRequest as any);
		const responseBody = await response.json();

		expect(response.status).toBe(400);
		expect(responseBody.error).toContain("Invalid plan");
	});

	it("should pass correct URLs to createCheckoutLink", async () => {
		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({
			user: {
				id: "user123",
				email: "test@example.com",
			},
		});

		// Mock Stripe checkout link creation
		(createCheckoutLink as vi.Mock).mockResolvedValue(
			"https://checkout.stripe.com/test-session",
		);

		// Mock a NextRequest object
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "x-auth-context") {
						return JSON.stringify({
							type: "user",
							userId: "user123",
						});
					}
					if (header === "Authorization") {
						return "Bearer test-token";
					}
					return null;
				}),
			},
			json: vi.fn().mockResolvedValue({
				plan: "solo",
				successUrl: "https://example.com/success",
				cancelUrl: "https://example.com/cancel",
			}),
		};

		await CreateCheckoutPOST(mockRequest as any);

		// Verify that the URLs were passed to createCheckoutLink
		expect(createCheckoutLink).toHaveBeenCalledWith(
			expect.objectContaining({
				redirectUrl: "https://example.com/success",
			}),
		);
	});

	it("should handle Stripe API errors", async () => {
		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({
			user: {
				id: "user123",
				email: "test@example.com",
			},
		});

		// Mock Stripe checkout link creation to throw an error
		(createCheckoutLink as vi.Mock).mockRejectedValue(
			new Error("Stripe API error"),
		);

		// Mock a NextRequest object
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "x-auth-context") {
						return JSON.stringify({
							type: "user",
							userId: "user123",
						});
					}
					if (header === "Authorization") {
						return "Bearer test-token";
					}
					return null;
				}),
			},
			json: vi.fn().mockResolvedValue({
				plan: "solo",
				successUrl: "https://example.com/success",
				cancelUrl: "https://example.com/cancel",
			}),
		};

		const response = await CreateCheckoutPOST(mockRequest as any);
		const responseBody = await response.json();

		expect(response.status).toBe(500);
		expect(responseBody.error).toBe("Failed to create checkout session");
	});

	it("should log analytics event on successful checkout", async () => {
		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({
			user: {
				id: "user123",
				email: "test@example.com",
			},
		});

		// Mock Stripe checkout link creation
		(createCheckoutLink as vi.Mock).mockResolvedValue(
			"https://checkout.stripe.com/test-session",
		);

		// Mock a NextRequest object
		const mockRequest = {
			headers: {
				get: vi.fn().mockImplementation((header) => {
					if (header === "x-auth-context") {
						return JSON.stringify({
							type: "user",
							userId: "user123",
						});
					}
					if (header === "Authorization") {
						return "Bearer test-token";
					}
					return null;
				}),
			},
			json: vi.fn().mockResolvedValue({
				plan: "solo",
				successUrl: "https://example.com/success",
				cancelUrl: "https://example.com/cancel",
			}),
		};

		// Mock logger
		const mockLogger = {
			info: vi.fn(),
		};

		// Temporarily mock the logger module
		vi.doMock("@snapback/infrastructure", () => ({
			logger: mockLogger,
		}));

		await CreateCheckoutPOST(mockRequest as any);

		// Verify that the analytics event was logged
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Checkout session created",
			expect.objectContaining({
				userId: "user123",
				plan: "solo",
			}),
		);
	});
});
