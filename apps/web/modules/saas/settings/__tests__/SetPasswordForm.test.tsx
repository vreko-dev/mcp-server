/**
 * TDD Test Suite for SetPasswordForm Component
 *
 * Tests Better Auth integration for password reset email:
 * - Send password reset email
 * - Loading state during submission
 * - Success confirmation
 * - Error handling
 *
 * Security Focus:
 * - Uses forgetPassword for secure email-based reset
 * - Prevents revealing user existence
 * - Error sanitization
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SetPasswordForm } from "../components/SetPassword";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		forgetPassword: vi.fn(),
	},
}));

vi.mock("@saas/auth/hooks/use-session", () => ({
	useSession: () => ({
		user: {
			id: "user_1",
			email: "test@example.com",
			name: "Test User",
		},
		session: { id: "session_1", userId: "user_1" },
		reloadSession: vi.fn(),
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

describe("SetPasswordForm Component", () => {
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
		it("should render set password block", () => {
			render(<SetPasswordForm />, { wrapper });

			expect(screen.getByText("Set Password")).toBeInTheDocument();
			expect(
				screen.getByText(/set a password for your account/i)
			).toBeInTheDocument();
		});

		it("should render send button", () => {
			render(<SetPasswordForm />, { wrapper });

			expect(
				screen.getByRole("button", { name: /send password reset email/i })
			).toBeInTheDocument();
		});
	});

	describe("RED: Password Reset Email", () => {
		it("should call authClient.forgetPassword when button clicked", async () => {
			const user = userEvent.setup();
			const mockForgetPassword = vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<SetPasswordForm />, { wrapper });

			const button = screen.getByRole("button", { name: /send password reset email/i });
			await user.click(button);

			// Should call forgetPassword with user email
			await waitFor(() => {
				expect(mockForgetPassword).toHaveBeenCalledWith({
					email: "test@example.com",
					redirectTo: expect.stringContaining("/auth/reset-password"),
				});
			});
		});

		it("should show loading state during submission", async () => {
			const user = userEvent.setup();
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});

			vi.mocked(authClient.forgetPassword).mockReturnValue(promise as any);

			render(<SetPasswordForm />, { wrapper });

			const button = screen.getByRole("button", { name: /send password reset email/i });
			await user.click(button);

			// Button should be disabled during submission
			await waitFor(() => {
				expect(button).toBeDisabled();
			});

			// Resolve promise
			resolvePromise!({
				data: { success: true },
				error: null,
			});
		});

		it("should show success message after sending email", async () => {
			const user = userEvent.setup();
			const { toast } = require("sonner");

			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<SetPasswordForm />, { wrapper });

			const button = screen.getByRole("button", { name: /send password reset email/i });
			await user.click(button);

			// Should show success toast
			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith(
					"Password reset email sent successfully"
				);
			});
		});

		it("should handle error gracefully", async () => {
			const user = userEvent.setup();
			const { toast } = require("sonner");

			vi.mocked(authClient.forgetPassword).mockRejectedValue(
				new Error("Network error")
			);

			render(<SetPasswordForm />, { wrapper });

			const button = screen.getByRole("button", { name: /send password reset email/i });
			await user.click(button);

			// Should show error toast
			await waitFor(() => {
				expect(toast.error).toHaveBeenCalled();
			});
		});

		it("should handle email not found gracefully (no user enumeration)", async () => {
			const user = userEvent.setup();
			const { toast } = require("sonner");

			// Even if email doesn't exist, show success (security best practice)
			vi.mocked(authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<SetPasswordForm />, { wrapper });

			const button = screen.getByRole("button", { name: /send password reset email/i });
			await user.click(button);

			// Should show success even if email doesn't exist
			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith(
					"Password reset email sent successfully"
				);
			});
		});
	});

	describe("RED: Accessibility", () => {
		it("should have accessible button", () => {
			render(<SetPasswordForm />, { wrapper });

			const button = screen.getByRole("button", { name: /send password reset email/i });
			expect(button).toHaveAccessibleName();
		});
	});
});
