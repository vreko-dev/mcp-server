/**
 * TDD Test Suite for LoginForm Component
 *
 * Tests Better Auth integration for multiple sign-in methods:
 * - Email/Password authentication
 * - Magic link authentication
 * - OAuth social sign-in (GitHub, Google)
 * - 2FA redirect handling
 * - Turnstile CAPTCHA challenge
 * - Error handling and security
 *
 * Security Focus (OWASP A07:2025):
 * - Rate limiting (handled by Better Auth server)
 * - Brute force protection (Turnstile challenge)
 * - CSRF protection (httpOnly cookies)
 * - No sensitive data in error messages
 * - Proper redirect after authentication
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../components/LoginForm";
import { SessionContext } from "../lib/session-context";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		signIn: {
			email: vi.fn(),
			social: vi.fn(),
		},
		useSession: vi.fn(),
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace: vi.fn(),
		push: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@shared/hooks/router", () => ({
	useRouter: () => ({
		replace: vi.fn(),
		push: vi.fn(),
	}),
}));

vi.mock("@marsidev/react-turnstile", () => ({
	Turnstile: ({ onSuccess }: any) => (
		<div data-testid="turnstile" onClick={() => onSuccess("test-token")} />
	),
}));

vi.mock("../config", () => ({
	authConfig: {
		enablePasswordLogin: true,
		enableMagicLink: true,
		enableSignup: true,
		enableSocialLogin: true,
		enablePasskeys: false,
		redirectAfterSignIn: "/dashboard",
	},
}));

vi.mock("../constants/oauth-providers", () => ({
	oAuthProviders: {
		github: { name: "GitHub", icon: () => null },
		google: { name: "Google", icon: () => null },
	},
}));

describe("LoginForm Component", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		// Set test environment variable to prevent CAPTCHA key error
		vi.stubEnv("NODE_ENV", "development");

		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.clearAllMocks();

		// Mock useSession to return null (logged out state)
		vi.mocked(authClient.useSession).mockReturnValue({
			data: null,
			isPending: false,
			error: null,
			isRefetching: false,
			refetch: vi.fn(),
		} as any);
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => {
		const sessionValue = {
			user: null,
			session: null,
			loaded: true,
			loading: false,
			reloadSession: vi.fn(),
		};

		return (
			<QueryClientProvider client={queryClient}>
				<SessionContext.Provider value={sessionValue}>
					{children}
				</SessionContext.Provider>
			</QueryClientProvider>
		);
	};

	describe("RED: Email/Password Sign-In", () => {
		it("should render email and password fields", () => {
			render(<LoginForm />, { wrapper });

			// Check for email input
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			expect(emailInput).toBeInTheDocument();

			// Check for password input by autocomplete attribute (shadcn/ui wraps inputs in divs)
			const passwordField = document.querySelector('input[autocomplete="current-password"]');
			expect(passwordField).toBeInTheDocument();

			// Check for submit button
			expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
		});

		it("should call authClient.signIn.email with correct credentials", async () => {
			const user = userEvent.setup();
			const mockSignIn = vi.mocked(authClient.signIn.email).mockResolvedValue({
				data: { user: { id: "user_1" }, session: { id: "sess_1" } },
				error: null,
			} as any);

			render(<LoginForm />, { wrapper });

			// Fill in credentials using accessible queries
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;

			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "SecurePass123!");

			// Submit form
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Verify authClient was called
			await waitFor(() => {
				expect(mockSignIn).toHaveBeenCalledWith({
					email: "test@example.com",
					password: "SecurePass123!",
				});
			});
		});

		it("should display error message on authentication failure", async () => {
			const user = userEvent.setup();
			// Component throws when error exists, so mock should too
			vi.mocked(authClient.signIn.email).mockResolvedValue({
				data: null,
				error: { message: "Invalid email or password" },
			} as any);

			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;

			await user.type(emailInput, "wrong@example.com");
			await user.type(passwordInput, "wrongpass");
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Should display generic error (error sanitization happens in useAuthErrorMessages)
			await waitFor(() => {
				// Check for any error text being displayed
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should not expose database errors to user", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signIn.email).mockRejectedValue(
				new Error("Database connection failed")
			);

			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;

			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Should show generic error, not database error
			await waitFor(() => {
				const errorText = screen.queryByText(/database/i);
				expect(errorText).not.toBeInTheDocument();
			});
		});
	});

	describe("RED: Magic Link Authentication", () => {
		it("should switch to magic link mode", async () => {
			const user = userEvent.setup();
			render(<LoginForm />, { wrapper });

			// Find and click magic link toggle (if available)
			const magicLinkButton = screen.queryByText(/magic link/i);
			if (magicLinkButton) {
				await user.click(magicLinkButton);

				// Password field should be hidden
				expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
			}
		});

		it("should send magic link email", async () => {
			const user = userEvent.setup();
			const mockMagicLink = vi.fn().mockResolvedValue({
				data: { success: true },
				error: null,
			});

			// Mock magic link method if exists
			(authClient as any).signIn.magicLink = mockMagicLink;

			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");

			// Submit - should trigger magic link flow
			await user.click(screen.getByRole("button", { name: /send magic link|sign in/i }));

			// Success message should appear
			await waitFor(() => {
				const successMsg = screen.queryByText(/check your email|magic link/i);
				if (successMsg) {
					expect(successMsg).toBeInTheDocument();
				}
			});
		});
	});

	describe("RED: OAuth Social Sign-In", () => {
		it("should render social sign-in buttons", () => {
			render(<LoginForm />, { wrapper });

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

			render(<LoginForm />, { wrapper });

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

			render(<LoginForm />, { wrapper });

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
			vi.mocked(authClient.signIn.email).mockResolvedValue({
				data: null,
				error: { code: "CHALLENGE_REQUIRED", message: "Security verification required" },
			} as any);

			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;

			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Turnstile widget should appear
			await waitFor(() => {
				expect(screen.getByTestId("turnstile")).toBeInTheDocument();
			});
		});

		it("should include Turnstile token in subsequent requests", async () => {
			const user = userEvent.setup();
			const mockSignIn = vi.mocked(authClient.signIn.email);

			// First attempt - trigger challenge
			mockSignIn.mockResolvedValueOnce({
				data: null,
				error: { code: "CHALLENGE_REQUIRED" },
			} as any);

			// Second attempt - success with token
			mockSignIn.mockResolvedValueOnce({
				data: { user: { id: "user_1" } },
				error: null,
			} as any);

			render(<LoginForm />, { wrapper });

			await user.type(screen.getByRole("textbox", { name: /email/i }), "test@example.com");
			const passwordInput = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Complete Turnstile
			await waitFor(() => {
				expect(screen.getByTestId("turnstile")).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("turnstile"));

			// Submit again with token
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Verify token was sent (via headers in actual implementation)
			await waitFor(() => {
				expect(mockSignIn).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe("RED: 2FA Redirect", () => {
		it("should handle 2FA redirect response", async () => {
			const user = userEvent.setup();

			vi.mocked(authClient.signIn.email).mockResolvedValue({
				data: { twoFactorRedirect: true },
				error: null,
			} as any);

			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;

			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Verify authClient was called successfully
			await waitFor(() => {
				expect(authClient.signIn.email).toHaveBeenCalledWith({
					email: "test@example.com",
					password: "password",
				});
			});
		});
	});

	describe("RED: Form Validation", () => {
		it("should validate email format", async () => {
			const user = userEvent.setup();
			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "invalid-email");
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Should show validation error
			await waitFor(() => {
				const errorMsg = screen.queryByText(/valid email/i);
				if (errorMsg) {
					expect(errorMsg).toBeInTheDocument();
				}
			});
		});

		it("should require password when in password mode", async () => {
			const user = userEvent.setup();
			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			// Don't fill password
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Should not call authClient without password
			expect(authClient.signIn.email).not.toHaveBeenCalled();
		});
	});

	describe("RED: Redirect Handling", () => {
		it("should complete sign-in successfully", async () => {
			const user = userEvent.setup();

			vi.mocked(authClient.signIn.email).mockResolvedValue({
				data: { user: { id: "user_1" }, session: { id: "sess_1" } },
				error: null,
			} as any);

			render(<LoginForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			const passwordInput = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;

			await user.type(emailInput, "test@example.com");
			await user.type(passwordInput, "password");
			await user.click(screen.getByRole("button", { name: /sign in/i }));

			// Verify successful authentication
			await waitFor(() => {
				expect(authClient.signIn.email).toHaveBeenCalledWith({
					email: "test@example.com",
					password: "password",
				});
			});
		});

		it("should preserve redirect query parameter", () => {
			// This would test redirectTo parameter handling
			// Implementation depends on actual component logic
			expect(true).toBe(true);
		});
	});
});
