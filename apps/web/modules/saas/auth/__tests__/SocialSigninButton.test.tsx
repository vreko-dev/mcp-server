/**
 * TDD Test Suite for SocialSigninButton Component
 *
 * Tests Better Auth OAuth integration:
 * - GitHub OAuth flow initiation
 * - Google OAuth flow initiation
 * - Loading states during OAuth redirect
 * - Error handling (network, configuration, popup blocked)
 * - Security: CSRF protection via Better Auth state parameter
 *
 * Security Focus (OWASP A07:2025):
 * - CSRF protection (handled by Better Auth via state parameter)
 * - Secure redirect after OAuth
 * - No client secret exposure
 * - Proper error messaging (no sensitive info leak)
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialSigninButton } from "../components/SocialSigninButton";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		signIn: {
			social: vi.fn(),
		},
	},
}));

vi.mock("../constants/oauth-providers", () => ({
	oAuthProviders: {
		github: { name: "GitHub", icon: () => null },
		google: { name: "Google", icon: () => null },
	},
}));

describe("SocialSigninButton Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("RED: GitHub OAuth Flow", () => {
		it("should render GitHub button with correct text", () => {
			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			expect(button).toBeInTheDocument();
		});

		it("should call authClient.signIn.social with GitHub provider", async () => {
			const user = userEvent.setup();
			const mockSignIn = vi.mocked(authClient.signIn.social).mockResolvedValue({
				data: null, // OAuth redirects, no data returned
				error: null,
			} as any);

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			await user.click(button);

			// Verify Better Auth client was called with correct provider
			await waitFor(() => {
				expect(mockSignIn).toHaveBeenCalledWith({
					provider: "github",
					callbackURL: expect.any(String),
				});
			});
		});

		it("should show loading state during OAuth redirect", async () => {
			const user = userEvent.setup();

			// Mock slow redirect to test loading state
			vi.mocked(authClient.signIn.social).mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { data: null, error: null } as any;
			});

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			await user.click(button);

			// Button should be disabled during loading
			expect(button).toBeDisabled();
		});

		it("should handle network errors gracefully", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signIn.social).mockRejectedValue(
				new Error("Network error: Failed to fetch")
			);

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			await user.click(button);

			// Should display network error message
			await waitFor(() => {
				const errorMsg = screen.queryByText(/network error/i);
				expect(errorMsg).toBeInTheDocument();
			});

			// Button should be re-enabled after error
			expect(button).not.toBeDisabled();
		});

		it("should handle configuration errors", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signIn.social).mockRejectedValue(
				new Error("OAuth client configuration error")
			);

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			await user.click(button);

			// Should display configuration error
			await waitFor(() => {
				const errorMsg = screen.queryByText(/configuration error/i);
				expect(errorMsg).toBeInTheDocument();
			});
		});

		it("should handle popup blocked errors", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signIn.social).mockRejectedValue(
				new Error("Popup blocked by browser")
			);

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			await user.click(button);

			// Should display popup blocked message
			await waitFor(() => {
				const errorMsg = screen.queryByText(/popup blocked/i);
				expect(errorMsg).toBeInTheDocument();
			});
		});
	});

	describe("RED: Google OAuth Flow", () => {
		it("should render Google button with correct text", () => {
			render(<SocialSigninButton provider="google" />);

			const button = screen.getByRole("button", { name: /google/i });
			expect(button).toBeInTheDocument();
		});

		it("should call authClient.signIn.social with Google provider", async () => {
			const user = userEvent.setup();
			const mockSignIn = vi.mocked(authClient.signIn.social).mockResolvedValue({
				data: null,
				error: null,
			} as any);

			render(<SocialSigninButton provider="google" />);

			const button = screen.getByRole("button", { name: /google/i });
			await user.click(button);

			// Verify Better Auth client was called
			await waitFor(() => {
				expect(mockSignIn).toHaveBeenCalledWith({
					provider: "google",
					callbackURL: expect.any(String),
				});
			});
		});

		it("should show loading state during Google OAuth redirect", async () => {
			const user = userEvent.setup();

			vi.mocked(authClient.signIn.social).mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { data: null, error: null } as any;
			});

			render(<SocialSigninButton provider="google" />);

			const button = screen.getByRole("button", { name: /google/i });
			await user.click(button);

			// Button should be disabled during loading
			expect(button).toBeDisabled();
		});
	});

	describe("RED: Error Recovery", () => {
		it("should allow retry after error", async () => {
			const user = userEvent.setup();
			const mockSignIn = vi.mocked(authClient.signIn.social);

			// First attempt fails
			mockSignIn.mockRejectedValueOnce(new Error("Network error"));

			// Second attempt succeeds
			mockSignIn.mockResolvedValueOnce({
				data: null,
				error: null,
			} as any);

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });

			// First attempt
			await user.click(button);

			// Error should appear
			await waitFor(() => {
				expect(screen.queryByText(/network error/i)).toBeInTheDocument();
			});

			// Second attempt (retry)
			await user.click(button);

			// Error should be cleared and second attempt should succeed
			await waitFor(() => {
				expect(mockSignIn).toHaveBeenCalledTimes(2);
			});
		});

		it("should not expose sensitive error details", async () => {
			const user = userEvent.setup();
			vi.mocked(authClient.signIn.social).mockRejectedValue(
				new Error("Internal server error: database connection failed at pg://user:password@host")
			);

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			await user.click(button);

			// Should show generic error, not database credentials
			await waitFor(() => {
				const errorText = screen.queryByText(/database connection/i);
				const passwordText = screen.queryByText(/password/i);
				expect(errorText).not.toBeInTheDocument();
				expect(passwordText).not.toBeInTheDocument();
			});
		});
	});

	describe("RED: Accessibility", () => {
		it("should have proper button type (not submit)", () => {
			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			expect(button).toHaveAttribute("type", "button");
		});

		it("should be keyboard accessible", async () => {
			const mockSignIn = vi.mocked(authClient.signIn.social).mockResolvedValue({
				data: null,
				error: null,
			} as any);

			render(<SocialSigninButton provider="github" />);

			const button = screen.getByRole("button", { name: /github/i });
			button.focus();

			// Simulate Enter key press
			await userEvent.keyboard("{Enter}");

			// Should trigger OAuth flow
			await waitFor(() => {
				expect(mockSignIn).toHaveBeenCalled();
			});
		});
	});
});
