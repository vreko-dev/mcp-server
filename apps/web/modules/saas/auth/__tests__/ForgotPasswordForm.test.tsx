/**
 * TDD Test Suite for ForgotPasswordForm Component
 *
 * Tests Better Auth integration for password reset flow:
 * - Email submission validation
 * - Forgot password email request
 * - Success state confirmation
 * - Error handling and security
 * - Rate limiting protection
 * - Email validation
 * - Error message sanitization
 *
 * Security Focus (OWASP A07:2025):
 * - No user enumeration (always show success for security)
 * - Rate limiting (handled by Better Auth server)
 * - No sensitive data in error messages
 * - Email validation against invalid formats
 * - Generic error messages to prevent info leak
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		forgetPassword: vi.fn(),
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace: vi.fn(),
		push: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
}));

describe("ForgotPasswordForm Component", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.clearAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		);
	};

	describe("RED: Form Rendering", () => {
		it("should render email input field", () => {
			render(<ForgotPasswordForm />, { wrapper });

			// Check for email input
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			expect(emailInput).toBeInTheDocument();
		});

		it("should render reset password button", () => {
			render(<ForgotPasswordForm />, { wrapper });

			// Check for submit button
			expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
		});

		it("should render back to sign in link", () => {
			render(<ForgotPasswordForm />, { wrapper });

			// Check for back link
			const backLink = screen.getByRole("link", { name: /back to sign in/i });
			expect(backLink).toBeInTheDocument();
			expect(backLink).toHaveAttribute("href", "/auth/login");
		});

		it("should display heading and instructions", () => {
			render(<ForgotPasswordForm />, { wrapper });

			// Check for heading
			expect(screen.getByRole("heading", { name: /forgot password\?/i })).toBeInTheDocument();

			// Check for instructions
			expect(screen.getByText(/we'll send you reset instructions/i)).toBeInTheDocument();
		});
	});

	describe("RED: Email Validation", () => {
		it("should require email field", async () => {
			const user = userEvent.setup();
			render(<ForgotPasswordForm />, { wrapper });

			// Submit without email
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should show validation error
			await waitFor(() => {
				expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
			});

			// Should not call authClient
			expect(authClient.forgetPassword).not.toHaveBeenCalled();
		});

		it("should validate email format", async () => {
			const user = userEvent.setup();
			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });

			// Enter invalid email
			await user.type(emailInput, "invalid-email");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should show validation error
			await waitFor(() => {
				expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
			});

			// Should not call authClient
			expect(authClient.forgetPassword).not.toHaveBeenCalled();
		});

		it("should accept valid email format", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });

			// Enter valid email
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should call authClient
			await waitFor(() => {
				expect(authClient.forgetPassword).toHaveBeenCalled();
			});
		});
	});

	describe("RED: Password Reset Request", () => {
		it("should call authClient.forgetPassword with correct email", async () => {
			const user = userEvent.setup();
			const mockForgetPassword = vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });

			// Fill in email
			await user.type(emailInput, "test@example.com");

			// Submit form
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Verify authClient was called with correct parameters
			await waitFor(() => {
				expect(mockForgetPassword).toHaveBeenCalledWith({
					email: "test@example.com",
					redirectTo: expect.stringContaining("/auth/reset-password"),
				});
			});
		});

		it("should include correct redirectTo URL", async () => {
			const user = userEvent.setup();
			const mockForgetPassword = vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Verify redirectTo includes reset-password path
			await waitFor(() => {
				const callArgs = mockForgetPassword.mock.calls[0][0];
				expect(callArgs.redirectTo).toMatch(/\/auth\/reset-password/);
			});
		});

		it("should show loading state during submission", async () => {
			const user = userEvent.setup();
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});

			vi.mocked(authClient.forgetPassword).mockReturnValue(promise as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");

			// Submit form
			const submitButton = screen.getByRole("button", { name: /reset password/i });
			await user.click(submitButton);

			// Should show loading state (button is disabled or shows loading indicator)
			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});

			// Resolve promise
			resolvePromise!({
				data: { success: true },
				error: null,
			});
		});
	});

	describe("RED: Success State", () => {
		it("should display success message after successful submission", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should display success message
			await waitFor(() => {
				expect(screen.getByText(/check your email/i)).toBeInTheDocument();
			});
		});

		it("should hide form after successful submission", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Form should be hidden
			await waitFor(() => {
				expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument();
			});

			// Success message should be visible
			expect(screen.getByText(/we've sent you a password reset link/i)).toBeInTheDocument();
		});

		it("should show success alert with mail icon", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should display success alert
			await waitFor(() => {
				const alert = screen.getByRole("alert");
				expect(alert).toBeInTheDocument();
			});
		});
	});

	describe("RED: Error Handling", () => {
		it("should display error message on network failure", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: null,
				error: { message: "Network error" },
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should display error (sanitized by useAuthErrorMessages)
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should not expose database errors to user", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockRejectedValue(
				new Error("Database connection failed: pg://localhost:5432")
			);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should NOT display database error
			await waitFor(() => {
				const alertContent = document.body.textContent || "";
				expect(alertContent).not.toContain("Database");
				expect(alertContent).not.toContain("pg://");
			});

			// Should display generic error
			const errorAlert = document.querySelector('[role="alert"]');
			expect(errorAlert).toBeInTheDocument();
		});

		it("should handle rate limiting error", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: null,
				error: { code: "RATE_LIMITED", message: "Too many requests" },
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should display rate limit error (handled by useAuthErrorMessages)
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should NOT reveal whether email exists (security best practice)", async () => {
			const user = userEvent.setup();
			// Even if user doesn't exist, Better Auth returns success to prevent user enumeration
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "nonexistent@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should still show success (no user enumeration)
			await waitFor(() => {
				expect(screen.getByText(/check your email/i)).toBeInTheDocument();
			});
		});

		it("should handle internal server error gracefully", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockRejectedValue(
				new Error("Internal server error")
			);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should display generic error
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();

				// Should NOT expose internal error details
				const alertContent = document.body.textContent || "";
				expect(alertContent).not.toContain("Internal server");
			});
		});

		it("should sanitize password-related error messages", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockRejectedValue(
				new Error("Password hashing failed: bcrypt error")
			);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Should NOT expose password implementation details
			await waitFor(() => {
				const alertContent = document.body.textContent || "";
				expect(alertContent).not.toContain("bcrypt");
				expect(alertContent).not.toContain("hashing");
			});
		});
	});

	describe("RED: Accessibility", () => {
		it("should have proper ARIA labels", () => {
			render(<ForgotPasswordForm />, { wrapper });

			// Email input should have accessible label
			const emailInput = screen.getByRole("textbox", { name: /email/i });
			expect(emailInput).toHaveAccessibleName();

			// Button should have accessible name
			const submitButton = screen.getByRole("button", { name: /reset password/i });
			expect(submitButton).toHaveAccessibleName();
		});

		it("should show error alert with proper role", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: null,
				error: { message: "Error occurred" },
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Error should be announced to screen readers
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should show success alert with proper role", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<ForgotPasswordForm />, { wrapper });

			const emailInput = screen.getByRole("textbox", { name: /email/i });
			await user.type(emailInput, "test@example.com");
			await user.click(screen.getByRole("button", { name: /reset password/i }));

			// Success should be announced to screen readers
			await waitFor(() => {
				const successAlert = screen.getByRole("alert");
				expect(successAlert).toBeInTheDocument();
			});
		});
	});
});
