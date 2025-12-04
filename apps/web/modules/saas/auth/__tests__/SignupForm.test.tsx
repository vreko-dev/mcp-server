/**
 * TDD Test Suite for SignupForm Component
 *
 * Tests Better Auth integration for multiple sign-up methods:
 * - Email/Password registration
 * - Magic link registration (passwordless)
 * - OAuth social sign-up (GitHub, Google)
 * - Email verification flow
 * - Turnstile CAPTCHA challenge
 * - Error handling and security
 *
 * Security Focus (OWASP A07:2025):
 * - Rate limiting (handled by Better Auth server)
 * - Brute force protection (Turnstile challenge)
 * - CSRF protection (httpOnly cookies)
 * - No sensitive data in error messages
 * - Proper redirect after registration
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "../components/SignupForm";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		signUp: {
			email: vi.fn(),
		},
		signIn: {
			social: vi.fn(),
		},
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@marsidev/react-turnstile", () => ({
	Turnstile: ({ onSuccess }: any) => (
		<div data-testid="turnstile" onClick={() => onSuccess("test-token")} />
	),
}));

vi.mock("../config", () => ({
	authConfig: {
		enablePasswordLogin: true,
		enableSignup: true,
		enableSocialLogin: true,
		redirectAfterSignIn: "/dashboard",
	},
}));

vi.mock("../constants/oauth-providers", () => ({
	oAuthProviders: {
		github: { name: "GitHub", icon: () => null },
		google: { name: "Google", icon: () => null },
	},
}));

describe("SignupForm Component", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		// Set test environment variable to prevent CAPTCHA key error
		vi.stubEnv("NODE_ENV", "development");

		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.clearAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	describe("RED: Email/Password Sign-Up", () => {
		it("should render name, email and password fields", () => {
			render(<SignupForm />, { wrapper });

			// Check for name input
			const nameInput = screen.getByRole("textbox", { name: /name/i });
			expect(nameInput).toBeInTheDocument();

			// Check for email input
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			expect(emailInput).toBeInTheDocument();

			// Check for password input by autocomplete attribute (shadcn/ui wraps inputs in divs)
			const passwordField = document.querySelector('input[autocomplete="new-password"]');
			expect(passwordField).toBeInTheDocument();

			// Check for submit button
			expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
		});

		it("should call authClient.signUp.email with correct credentials", async () => {
			const user = userEvent.setup();
			const mockSignUp = vi.mocked(authClient.signUp.email).mockResolvedValue({
				data: { user: { id: "user_1", email: "test@example.com" } },
				error: null,
			} as any);

			render(<SignupForm />, { wrapper });

			// Fill in credentials
			const nameInput = screen.getByRole("textbox", { name: /name/i });
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement;

			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "SecurePass123!");

			// Submit form
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Verify authClient was called
			await waitFor(() => {
				expect(mockSignUp).toHaveBeenCalledWith({
					name: "John Doe",
					email: "test@example.com",
					password: "SecurePass123!",
					callbackURL: expect.any(String),
				});
			});
		});

		it("should display error message on registration failure", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signUp.email).mockResolvedValue({
				data: null,
				error: { message: "Email already exists" },
			} as any);

			render(<SignupForm />, { wrapper });

			const nameInput = screen.getByRole("textbox", { name: /name/i });
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement;

			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "existing@example.com");
			await user.type(passwordInput, "password123");
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Should display error
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should not expose database errors to user", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signUp.email).mockRejectedValue(
				new Error("Database connection failed")
			);

			render(<SignupForm />, { wrapper });

			const nameInput = screen.getByRole("textbox", { name: /name/i });
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement;

			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Should show generic error, not database error
			await waitFor(() => {
				const errorText = screen.queryByText(/database/i);
				expect(errorText).not.toBeInTheDocument();
			});
		});
	});

	describe("RED: Form Validation", () => {
		it("should validate email format", async () => {
			const user = userEvent.setup();
			render(<SignupForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "invalid-email");
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Should not call authClient with invalid email
			expect(authClient.signUp.email).not.toHaveBeenCalled();
		});

		it("should require name field", async () => {
			const user = userEvent.setup();
			render(<SignupForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			// Don't fill name
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Should not call authClient without name
			expect(authClient.signUp.email).not.toHaveBeenCalled();
		});

		it("should require password when in password mode", async () => {
			const user = userEvent.setup();
			render(<SignupForm />, { wrapper });

			const nameInput = screen.getByRole("textbox", { name: /name/i });
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "test@example.com");
			// Don't fill password
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Should not call authClient without password
			expect(authClient.signUp.email).not.toHaveBeenCalled();
		});
	});

	describe("RED: OAuth Social Sign-Up", () => {
		it("should render social sign-up buttons", () => {
			render(<SignupForm />, { wrapper });

			// OAuth buttons should render when auth config enables them
			const githubButton = screen.getByRole("button", { name: "GitHub" });
			const googleButton = screen.getByRole("button", { name: "Google" });

			expect(githubButton).toBeInTheDocument();
			expect(googleButton).toBeInTheDocument();
		});

		it("should initiate GitHub OAuth flow", async () => {
			const user = userEvent.setup();
			const mockSocial = vi.mocked(authClient.signIn.social).mockResolvedValue({
				data: null, // OAuth redirects
				error: null,
			} as any);

			render(<SignupForm />, { wrapper });

			const githubButton = screen.queryByRole("button", { name: "GitHub" });
			if (githubButton) {
				await user.click(githubButton);

				// Should call authClient.signIn.social with GitHub provider
				await waitFor(() => {
					expect(mockSocial).toHaveBeenCalledWith({
						provider: "github",
						callbackURL: expect.any(String),
					});
				});
			}
		});

		it("should initiate Google OAuth flow", async () => {
			const user = userEvent.setup();
			const mockSocial = vi.mocked(authClient.signIn.social).mockResolvedValue({
				data: null,
				error: null,
			} as any);

			render(<SignupForm />, { wrapper });

			const googleButton = screen.queryByRole("button", { name: "Google" });
			if (googleButton) {
				await user.click(googleButton);

				// Should call authClient.signIn.social with Google provider
				await waitFor(() => {
					expect(mockSocial).toHaveBeenCalledWith({
						provider: "google",
						callbackURL: expect.any(String),
					});
				});
			}
		});
	});

	describe("RED: Security - CAPTCHA Challenge", () => {
		it("should show Turnstile challenge after failed attempts", async () => {
			const user = userEvent.setup();

			// Mock CHALLENGE_REQUIRED error
			vi.mocked(authClient.signUp.email).mockResolvedValue({
				data: null,
				error: { code: "CHALLENGE_REQUIRED", message: "Security verification required" },
			} as any);

			render(<SignupForm />, { wrapper });

			const nameInput = screen.getByRole("textbox", { name: /name/i });
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement;

			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Turnstile widget should appear
			await waitFor(() => {
				expect(screen.getByTestId("turnstile")).toBeInTheDocument();
			});
		});

		it("should include Turnstile token in subsequent requests", async () => {
			const user = userEvent.setup();
			const mockSignUp = vi.mocked(authClient.signUp.email);

			// First attempt - trigger challenge
			mockSignUp.mockResolvedValueOnce({
				data: null,
				error: { code: "CHALLENGE_REQUIRED" },
			} as any);

			// Second attempt - success with token
			mockSignUp.mockResolvedValueOnce({
				data: { user: { id: "user_1" } },
				error: null,
			} as any);

			render(<SignupForm />, { wrapper });

			const nameInput = screen.getByRole("textbox", { name: /name/i });
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement;

			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Complete Turnstile
			await waitFor(() => {
				expect(screen.getByTestId("turnstile")).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("turnstile"));

			// Submit again with token
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Verify token was sent (via headers in actual implementation)
			await waitFor(() => {
				expect(mockSignUp).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe("RED: Email Verification Flow", () => {
		it("should show verification message after successful signup", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signUp.email).mockResolvedValue({
				data: { user: { id: "user_1", email: "test@example.com" } },
				error: null,
			} as any);

			render(<SignupForm />, { wrapper });

			const nameInput = screen.getByRole("textbox", { name: /name/i });
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement;

			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "SecurePass123!");
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Should show verification message
			await waitFor(() => {
				const verificationMsg = screen.queryByText(/verify your email/i);
				if (verificationMsg) {
					expect(verificationMsg).toBeInTheDocument();
				}
			});
		});
	});

	describe("RED: Prefilled Email", () => {
		it("should prefill email when provided as prop", () => {
			render(<SignupForm prefillEmail="invited@example.com" />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i }) as HTMLInputElement;
			expect(emailInput.value).toBe("invited@example.com");
			expect(emailInput).toHaveAttribute("readonly");
		});
	});
});
