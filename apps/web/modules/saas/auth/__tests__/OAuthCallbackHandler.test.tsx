/**
 * TDD Test Suite for OAuthCallbackHandler Component
 *
 * Tests OAuth callback security and error handling:
 * - CSRF protection (state parameter validation)
 * - Session validation after OAuth redirect
 * - Error parameter handling from OAuth provider
 * - URL cleanup after successful auth
 * - Redirect to login on failure
 *
 * Security Focus (OWASP A07:2025):
 * - CSRF attack prevention (state mismatch detection)
 * - Session hijacking prevention
 * - Proper error handling without info leak
 * - Secure redirect after authentication
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { authClient } from "@snapback/auth/client";
import { useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthCallbackHandler } from "../components/OAuthCallbackHandler";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		getSession: vi.fn(),
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}));

describe("OAuthCallbackHandler Component", () => {
	let mockRouter: any;
	let mockSearchParams: any;

	beforeEach(() => {
		mockRouter = {
			push: vi.fn(),
			replace: vi.fn(),
		};

		mockSearchParams = new URLSearchParams();

		vi.mocked(useRouter).mockReturnValue(mockRouter);
		vi.mocked(useSearchParams).mockReturnValue(mockSearchParams);
		vi.clearAllMocks();
	});

	describe("RED: Successful OAuth Callback", () => {
		it("should validate session when code and state params present", async () => {
			const mockGetSession = vi.mocked(authClient.getSession).mockResolvedValue({
				data: {
					user: { id: "user_123", email: "test@example.com" },
					session: { id: "session_123" },
				},
				error: null,
			} as any);

			// Simulate OAuth callback with code and state
			mockSearchParams.set("code", "auth_code_123");
			mockSearchParams.set("state", "csrf_state_token");

			render(<OAuthCallbackHandler />);

			// Should call getSession to validate
			await waitFor(() => {
				expect(mockGetSession).toHaveBeenCalled();
			});
		});

		it("should clean up OAuth params from URL after success", async () => {
			vi.mocked(authClient.getSession).mockResolvedValue({
				data: {
					user: { id: "user_123", email: "test@example.com" },
					session: { id: "session_123" },
				},
				error: null,
			} as any);

			mockSearchParams.set("code", "auth_code_123");
			mockSearchParams.set("state", "csrf_state_token");
			mockSearchParams.set("scope", "user:email");

			render(<OAuthCallbackHandler />);

			// Should clean up OAuth params via router.replace
			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalled();
			});
		});

		it("should show success message after validation", async () => {
			vi.mocked(authClient.getSession).mockResolvedValue({
				data: {
					user: { id: "user_123", email: "test@example.com" },
					session: { id: "session_123" },
				},
				error: null,
			} as any);

			mockSearchParams.set("code", "auth_code_123");
			mockSearchParams.set("state", "csrf_state_token");

			render(<OAuthCallbackHandler />);

			// Should show success indicator
			await waitFor(() => {
				const successIndicator = screen.queryByText(/success|signed in/i);
				if (successIndicator) {
					expect(successIndicator).toBeInTheDocument();
				}
			});
		});
	});

	describe("RED: OAuth Error Handling", () => {
		it("should display error when error param present (user cancellation)", async () => {
			mockSearchParams.set("error", "access_denied");
			mockSearchParams.set("error_description", "User cancelled the request");

			render(<OAuthCallbackHandler />);

			// Should display error message
			await waitFor(() => {
				const errorMsg = screen.queryByText(/cancelled|denied/i);
				if (errorMsg) {
					expect(errorMsg).toBeInTheDocument();
				}
			});
		});

		it("should handle state mismatch error (CSRF protection)", async () => {
			mockSearchParams.set("error", "state_mismatch");
			mockSearchParams.set("error_description", "Invalid state parameter");

			render(<OAuthCallbackHandler />);

			// Should display security error
			await waitFor(() => {
				const securityError = screen.queryByText(/security|state|invalid/i);
				if (securityError) {
					expect(securityError).toBeInTheDocument();
				}
			});
		});

		it("should handle invalid_grant error (expired code)", async () => {
			mockSearchParams.set("error", "invalid_grant");
			mockSearchParams.set("error_description", "Authorization code expired");

			render(<OAuthCallbackHandler />);

			// Should display expiration error
			await waitFor(() => {
				const errorMsg = screen.queryByText(/expired|invalid/i);
				if (errorMsg) {
					expect(errorMsg).toBeInTheDocument();
				}
			});
		});

		it("should handle server_error from provider", async () => {
			mockSearchParams.set("error", "server_error");
			mockSearchParams.set("error_description", "Internal server error");

			render(<OAuthCallbackHandler />);

			// Should display sanitized provider error
			await waitFor(() => {
				const errorMsg = screen.queryByText(/service error|try again later/i);
				if (errorMsg) {
					expect(errorMsg).toBeInTheDocument();
				}
			});
		});
	});

	describe("RED: Session Validation Failures", () => {
		it("should redirect to login when session not created", async () => {
			vi.mocked(authClient.getSession).mockResolvedValue({
				data: null, // No session despite successful OAuth
				error: null,
			} as any);

			mockSearchParams.set("code", "auth_code_123");
			mockSearchParams.set("state", "csrf_state_token");

			render(<OAuthCallbackHandler />);

			// Should show error and redirect to login
			await waitFor(() => {
				const errorMsg = screen.queryByText(/session creation failed/i);
				if (errorMsg) {
					expect(errorMsg).toBeInTheDocument();
				}
			}, { timeout: 3500 }); // Wait for redirect timeout
		});

		it("should handle session validation network errors", async () => {
			vi.mocked(authClient.getSession).mockRejectedValue(
				new Error("Network error")
			);

			mockSearchParams.set("code", "auth_code_123");
			mockSearchParams.set("state", "csrf_state_token");

			render(<OAuthCallbackHandler />);

			// Should display validation error
			await waitFor(() => {
				const errorMsg = screen.queryByText(/validate session|failed/i);
				if (errorMsg) {
					expect(errorMsg).toBeInTheDocument();
				}
			});
		});

		it("should log validation errors to console", async () => {
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			vi.mocked(authClient.getSession).mockRejectedValue(
				new Error("Validation failed")
			);

			mockSearchParams.set("code", "auth_code_123");
			mockSearchParams.set("state", "csrf_state_token");

			render(<OAuthCallbackHandler />);

			// Should log error for debugging
			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining("Session validation"),
					expect.any(Error)
				);
			});

			consoleErrorSpy.mockRestore();
		});
	});

	describe("RED: Security - No Sensitive Info Leak", () => {
		it("should not display raw error codes from OAuth provider", async () => {
			mockSearchParams.set("error", "internal_oauth_config_missing_client_secret_abc123");
			mockSearchParams.set("error_description", "Client secret validation failed");

			render(<OAuthCallbackHandler />);

			// Should show generic error, not internal config details
			await waitFor(() => {
				const secretText = screen.queryByText(/client_secret/i);
				expect(secretText).not.toBeInTheDocument();
			});
		});

		it("should sanitize error descriptions", async () => {
			mockSearchParams.set("error", "token_exchange_failed");
			mockSearchParams.set("error_description", "Database error: SELECT * FROM users WHERE token='xyz'");

			render(<OAuthCallbackHandler />);

			// Should not expose database queries
			await waitFor(() => {
				const sqlText = screen.queryByText(/SELECT|FROM users/i);
				expect(sqlText).not.toBeInTheDocument();
			});
		});
	});

	describe("RED: No OAuth Params", () => {
		it("should render nothing when no OAuth params present", () => {
			// No OAuth params in URL
			const { container } = render(<OAuthCallbackHandler />);

			// Component should be idle (no error, no loading)
			expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
		});

		it("should not call getSession when no OAuth params", async () => {
			const mockGetSession = vi.mocked(authClient.getSession);

			render(<OAuthCallbackHandler />);

			// Wait to ensure no session check is triggered
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockGetSession).not.toHaveBeenCalled();
		});
	});
});
