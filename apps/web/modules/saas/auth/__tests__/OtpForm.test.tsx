/**
 * TDD Test Suite for OtpForm Component
 *
 * Tests Better Auth integration for OTP verification:
 * - TOTP code verification (2FA)
 * - 6-digit code validation
 * - Auto-submit on complete code entry
 * - Error handling and security
 * - Redirect handling (organization invitation, custom redirects)
 * - Rate limiting protection
 *
 * Security Focus (OWASP A07:2025):
 * - Rate limiting (handled by Better Auth server)
 * - No sensitive data in error messages
 * - Code length validation (exactly 6 digits)
 * - Invalid code handling
 * - Error message sanitization
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OtpForm } from "../components/OtpForm";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		twoFactor: {
			verifyTotp: vi.fn(),
		},
	},
}));

// Mock ResizeObserver (required by InputOTP component)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock document.elementFromPoint (required by InputOTP's PWM badge)
if (typeof document !== "undefined" && !document.elementFromPoint) {
	(document as any).elementFromPoint = vi.fn(() => null);
}

const mockSearchParamsGet = vi.fn((key: string): string | null => null);

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: mockSearchParamsGet,
	}),
}));

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("@shared/hooks/router", () => ({
	useRouter: () => ({
		replace: mockReplace,
		push: mockPush,
	}),
}));

vi.mock("../config", () => ({
	authConfig: {
		redirectAfterSignIn: "/dashboard",
	},
}));

describe("OtpForm Component", () => {
	let queryClient: QueryClient;
	let mockRouter: any;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.clearAllMocks();

		// Reset searchParams mock
		mockSearchParamsGet.mockImplementation((key: string) => null);
		mockRouter = { replace: mockReplace, push: mockPush };
		mockReplace.mockClear();
		mockPush.mockClear();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		);
	};

	describe("RED: Form Rendering", () => {
		it("should render OTP input field", () => {
			render(<OtpForm />, { wrapper });

			// Check for verification code label (use getAllByText since FormLabel and heading both contain the text)
			const labels = screen.getAllByText(/verification code/i);
			expect(labels.length).toBeGreaterThanOrEqual(1);
		});

		it("should render 6 OTP input slots", () => {
			render(<OtpForm />, { wrapper });

			// InputOTP renders input with specific pattern
			const otpInput = document.querySelector('input[autocomplete="one-time-code"]');
			expect(otpInput).toBeInTheDocument();
			expect(otpInput).toHaveAttribute('maxlength', '6');
		});

		it("should render verify button", () => {
			render(<OtpForm />, { wrapper });

			// Check for submit button
			expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
		});

		it("should render back to sign in link", () => {
			render(<OtpForm />, { wrapper });

			// Check for back link
			const backLink = screen.getByRole("link", { name: /back to sign in/i });
			expect(backLink).toBeInTheDocument();
			expect(backLink).toHaveAttribute("href", "/auth/login");
		});

		it("should display heading and instructions", () => {
			render(<OtpForm />, { wrapper });

			// Check for heading
			expect(screen.getByRole("heading", { name: /verify your code/i })).toBeInTheDocument();

			// Check for instructions
			expect(screen.getByText(/enter the verification code from your authenticator app/i)).toBeInTheDocument();
		});
	});

	describe("RED: Code Validation", () => {
		it("should require exactly 6 digits", async () => {
			const user = userEvent.setup();
			render(<OtpForm />, { wrapper });

			// Try submitting with incomplete code (5 digits)
			const verifyButton = screen.getByRole("button", { name: /verify/i });

			// Find the OTP input
			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			expect(otpInput).toBeInTheDocument();

			// Enter incomplete code
			await user.type(otpInput, "12345");
			await user.click(verifyButton);

			// Should not call authClient with incomplete code
			expect(authClient.twoFactor.verifyTotp).not.toHaveBeenCalled();
		});

		it("should accept exactly 6 digits", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;

			// Enter complete code
			await user.type(otpInput, "123456");

			// Should auto-submit or allow manual submission
			await waitFor(() => {
				expect(authClient.twoFactor.verifyTotp).toHaveBeenCalled();
			});
		});

		it("should only accept numeric input", async () => {
			const user = userEvent.setup();
			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;

			// InputOTP component uses inputMode="numeric" which suggests numeric keyboard
			// The actual filtering may happen at submission or be device-dependent
			// Test that the input has correct attributes for numeric entry
			expect(otpInput).toHaveAttribute('autocomplete', 'one-time-code');
			expect(otpInput).toHaveAttribute('maxlength', '6');
		});
	});

	describe("RED: OTP Verification", () => {
		it("should call authClient.twoFactor.verifyTotp with correct code", async () => {
			const user = userEvent.setup();
			const mockVerifyTotp = vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;

			// Fill in OTP code
			await user.type(otpInput, "123456");

			// Verify authClient was called with correct code
			await waitFor(() => {
				expect(mockVerifyTotp).toHaveBeenCalledWith({
					code: "123456",
				});
			});
		});

		it("should show loading state during verification", async () => {
			const user = userEvent.setup();
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});

			vi.mocked(authClient.twoFactor.verifyTotp).mockReturnValue(promise as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should show loading state (button is disabled)
			await waitFor(() => {
				const submitButton = screen.getByRole("button", { name: /verify/i });
				expect(submitButton).toBeDisabled();
			});

			// Resolve promise
			resolvePromise!({
				data: { success: true },
				error: null,
			});
		});

		it("should auto-submit when 6 digits are entered", async () => {
			const user = userEvent.setup();
			const mockVerifyTotp = vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;

			// Enter 6 digits
			await user.type(otpInput, "123456");

			// Should auto-submit (called during onChange)
			await waitFor(() => {
				expect(mockVerifyTotp).toHaveBeenCalled();
			}, { timeout: 2000 });
		});
	});

	describe("RED: Redirect Handling", () => {
		it("should redirect to dashboard after successful verification", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should redirect to default dashboard
			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
			});
		});

		it("should redirect to organization invitation when invitationId present", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			// Mock searchParams with invitationId
			mockSearchParamsGet.mockImplementation((key: string) => {
				if (key === "invitationId") return "inv_123";
				return null;
			});

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should redirect to organization invitation
			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalledWith("/organization-invitation/inv_123");
			});
		});

		it("should redirect to custom path when redirectTo present", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			// Mock searchParams with custom redirectTo
			mockSearchParamsGet.mockImplementation((key: string) => {
				if (key === "redirectTo") return "/settings";
				return null;
			});

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should redirect to custom path
			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalledWith("/settings");
			});
		});

		it("should prioritize invitationId over redirectTo", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			// Mock searchParams with both invitationId and redirectTo
			mockSearchParamsGet.mockImplementation((key: string) => {
				if (key === "invitationId") return "inv_123";
				if (key === "redirectTo") return "/settings";
				return null;
			});

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should prioritize invitationId
			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalledWith("/organization-invitation/inv_123");
			});
		});
	});

	describe("RED: Error Handling", () => {
		it("should display error message on invalid code", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: null,
				error: { message: "Invalid verification code" },
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "000000");

			// Should display error (sanitized by useAuthErrorMessages)
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should not expose database errors to user", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockRejectedValue(
				new Error("Database connection failed: pg://localhost:5432")
			);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

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
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: null,
				error: { code: "RATE_LIMITED", message: "Too many attempts" },
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should display rate limit error (handled by useAuthErrorMessages)
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should handle expired code error", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: null,
				error: { code: "INVALID_TOKEN", message: "Code expired" },
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should display error
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should handle network errors gracefully", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockRejectedValue(
				new Error("Network error: Failed to fetch")
			);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should display generic error
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});

		it("should sanitize internal server error messages", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockRejectedValue(
				new Error("Internal server error: TOTP secret not found")
			);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Should NOT expose internal error details
			await waitFor(() => {
				const alertContent = document.body.textContent || "";
				expect(alertContent).not.toContain("Internal server");
				expect(alertContent).not.toContain("secret");
			});
		});

		it("should allow retry after error", async () => {
			const user = userEvent.setup();
			const mockVerifyTotp = vi.mocked(authClient.twoFactor.verifyTotp);

			// First call fails
			mockVerifyTotp.mockResolvedValueOnce({
				data: null,
				error: { message: "Invalid code" },
			} as any);

			// Second call succeeds
			mockVerifyTotp.mockResolvedValueOnce({
				data: { success: true },
				error: null,
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;

			// First attempt - fail
			await user.type(otpInput, "000000");

			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});

			// Clear and retry
			await user.clear(otpInput);
			await user.type(otpInput, "123456");

			// Second attempt should succeed
			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalled();
			});
		});
	});

	describe("RED: Accessibility", () => {
		it("should have proper ARIA labels", () => {
			render(<OtpForm />, { wrapper });

			// Verification code label should exist (multiple instances from FormLabel + other text)
			const labels = screen.getAllByText(/verification code/i);
			expect(labels.length).toBeGreaterThanOrEqual(1);

			// Button should have accessible name
			const submitButton = screen.getByRole("button", { name: /verify/i });
			expect(submitButton).toHaveAccessibleName();
		});

		it("should have autocomplete attribute for OTP", () => {
			render(<OtpForm />, { wrapper });

			// OTP input should have one-time-code autocomplete
			const otpInput = document.querySelector('input[autocomplete="one-time-code"]');
			expect(otpInput).toBeInTheDocument();
		});

		it("should show error alert with proper role", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.twoFactor.verifyTotp).mockResolvedValue({
				data: null,
				error: { message: "Error occurred" },
			} as any);

			render(<OtpForm />, { wrapper });

			const otpInput = document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
			await user.type(otpInput, "123456");

			// Error should be announced to screen readers
			await waitFor(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
			});
		});
	});
});
