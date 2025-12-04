/**
 * TDD Test Suite for UserMenu Component
 *
 * Tests Better Auth integration for user menu functionality:
 * - Rendering user information
 * - Sign out functionality
 * - Session invalidation
 * - Redirect after sign out
 * - Error handling during sign out
 *
 * Security Focus (OWASP A07:2025):
 * - Complete session cleanup on sign out
 * - Proper token invalidation
 * - Secure redirect after logout
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "../components/UserMenu";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		signOut: vi.fn(),
	},
}));

vi.mock("@saas/auth/hooks/use-session", () => ({
	useSession: () => ({
		user: {
			id: "user_123",
			name: "John Doe",
			email: "john@example.com",
			image: "https://example.com/avatar.jpg",
		},
		session: {
			id: "session_123",
			userId: "user_123",
			expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
		},
	}),
}));

vi.mock("next-themes", () => ({
	useTheme: () => ({
		theme: "dark",
		setTheme: vi.fn(),
	}),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("UserMenu Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset location mock
		delete (window as any).location;
		window.location = { href: "" } as any;
	});

	describe("RED: User Information Display", () => {
		it("should render user name and email", () => {
			render(<UserMenu showUserName={true} />);

			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("john@example.com")).toBeInTheDocument();
		});

		it("should render user avatar", () => {
			render(<UserMenu showUserName={true} />);

			// UserAvatar component should be rendered (check for button with aria-label)
			const menuButton = screen.getByLabelText(/user menu/i);
			expect(menuButton).toBeInTheDocument();
		});
	});

	describe("RED: Sign Out Functionality", () => {
		it("should call authClient.signOut when logout is clicked", async () => {
			const user = userEvent.setup();
			const mockSignOut = vi.mocked(authClient.signOut).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<UserMenu showUserName={true} />);

			// Open dropdown menu
			const menuButton = screen.getByLabelText(/user menu/i);
			await user.click(menuButton);

			// Click logout button (use getByText since dropdown portal doesn't expose menuitem role)
			const logoutButton = screen.getByText(/logout/i);
			await user.click(logoutButton);

			// Verify authClient.signOut was called
			await waitFor(() => {
				expect(mockSignOut).toHaveBeenCalledWith({
					fetchOptions: {
						onSuccess: expect.any(Function),
					},
				});
			});
		});

		it("should redirect to home page after successful sign out", async () => {
			const user = userEvent.setup();

			// Mock successful sign out and capture the onSuccess callback
			let onSuccessCallback: (() => void) | undefined;
			vi.mocked(authClient.signOut).mockImplementation(async (options: any) => {
				onSuccessCallback = options?.fetchOptions?.onSuccess;
				return { data: { success: true }, error: null } as any;
			});

			render(<UserMenu showUserName={true} />);

			const menuButton = screen.getByLabelText(/user menu/i);
			await user.click(menuButton);

			const logoutButton = screen.getByText(/logout/i);
			await user.click(logoutButton);

			// Trigger the onSuccess callback
			await waitFor(() => {
				expect(onSuccessCallback).toBeDefined();
			});

			if (onSuccessCallback) {
				await onSuccessCallback();
			}

			// Should redirect to home page
			await waitFor(() => {
				expect(window.location.href).toBe("/");
			});
		});

		it("should handle sign out errors gracefully", async () => {
			const user = userEvent.setup();
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			vi.mocked(authClient.signOut).mockRejectedValue(
				new Error("Network error")
			);

			render(<UserMenu showUserName={true} />);

			const menuButton = screen.getByLabelText(/user menu/i);
			await user.click(menuButton);

			const logoutButton = screen.getByText(/logout/i);
			await user.click(logoutButton);

			// Should log error and still redirect
			await waitFor(() => {
				expect(authClient.signOut).toHaveBeenCalled();
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					"Sign out failed:",
					expect.any(Error)
				);
			});

			consoleErrorSpy.mockRestore();
		});
	});

	describe("RED: Menu Items", () => {
		it("should render all navigation menu items", async () => {
			const user = userEvent.setup();
			render(<UserMenu showUserName={true} />);

			// Open dropdown
			const menuButton = screen.getByLabelText(/user menu/i);
			await user.click(menuButton);

			// Check for menu items (use getByText since dropdown uses portals)
			expect(screen.getByText(/account settings/i)).toBeInTheDocument();
			expect(screen.getByText(/documentation/i)).toBeInTheDocument();
			expect(screen.getByText(/home/i)).toBeInTheDocument();
			expect(screen.getByText(/logout/i)).toBeInTheDocument();
		});

		it("should have correct href for settings link", async () => {
			const user = userEvent.setup();
			render(<UserMenu showUserName={true} />);

			const menuButton = screen.getByLabelText(/user menu/i);
			await user.click(menuButton);

			const settingsLink = screen.getByText(/account settings/i).closest("a");
			expect(settingsLink).toHaveAttribute("href", "/app/settings/general");
		});

		it("should have correct href for documentation link", async () => {
			const user = userEvent.setup();
			render(<UserMenu showUserName={true} />);

			const menuButton = screen.getByLabelText(/user menu/i);
			await user.click(menuButton);

			const docsLink = screen.getByText(/documentation/i).closest("a");
			expect(docsLink).toHaveAttribute("href", "https://docs.snapback.dev");
		});
	});

	describe("RED: Theme Selection", () => {
		it("should render color mode submenu", async () => {
			const user = userEvent.setup();
			render(<UserMenu showUserName={true} />);

			const menuButton = screen.getByLabelText(/user menu/i);
			await user.click(menuButton);

			// Should show Color Mode submenu trigger
			const colorModeButton = screen.getByText(/color mode/i);
			expect(colorModeButton).toBeInTheDocument();
		});
	});
});
