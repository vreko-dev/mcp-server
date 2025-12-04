/**
 * TDD Test Suite for PasskeysBlock Component
 *
 * Tests Better Auth integration for passkey management:
 * - List user's passkeys
 * - Add new passkey (WebAuthn)
 * - Delete existing passkey
 * - Loading states
 * - Error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { authClient } from "@snapback/auth/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PasskeysBlock } from "../components/PasskeysBlock";

// Mock dependencies
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		passkey: {
			addPasskey: vi.fn(),
			deletePasskey: vi.fn(),
		},
	},
}));

vi.mock("@saas/auth/lib/api", () => ({
	useUserPasskeysQuery: () => ({
		data: [
			{
				id: "passkey_1",
				name: "Laptop",
				deviceType: "macOS",
				createdAt: new Date("2024-01-01"),
			},
			{
				id: "passkey_2",
				name: "Phone",
				deviceType: "iOS",
				createdAt: new Date("2024-01-15"),
			},
		],
		isPending: false,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		promise: vi.fn((promise, messages) => {
			// Handle async functions or Promises
			const p = typeof promise === 'function' ? promise() : promise;
			Promise.resolve(p).then(
				() => {
					if (typeof messages.success === 'function') messages.success();
				},
				() => {
					if (typeof messages.error === 'function') messages.error();
				}
			);
		}),
	},
}));

describe("PasskeysBlock Component", () => {
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

	describe("RED: Rendering", () => {
		it("should render passkeys block", () => {
			render(<PasskeysBlock />, { wrapper });

			expect(screen.getByText("Passkeys")).toBeInTheDocument();
			expect(
				screen.getByText(/manage passkeys for passwordless authentication/i)
			).toBeInTheDocument();
		});

		it("should list user's passkeys", () => {
			render(<PasskeysBlock />, { wrapper });

			expect(screen.getByText(/macOS Laptop/)).toBeInTheDocument();
			expect(screen.getByText(/iOS Phone/)).toBeInTheDocument();
		});

		it("should show add button", () => {
			render(<PasskeysBlock />, { wrapper });

			expect(screen.getByRole("button", { name: /add passkey/i })).toBeInTheDocument();
		});

		it("should show delete button for each passkey", () => {
			render(<PasskeysBlock />, { wrapper });

			const deleteButtons = screen.getAllByRole("button", { name: "" }).filter(
				(btn) => btn.querySelector("[class*='trash']")
			);

			expect(deleteButtons.length).toBe(2); // One for each passkey
		});

		it("should show loading state", () => {
			vi.mocked(require("@saas/auth/lib/api").useUserPasskeysQuery).mockReturnValue({
				data: undefined,
				isPending: true,
			});

			render(<PasskeysBlock />, { wrapper });

			// Should show skeleton loaders
			const skeletons = document.querySelectorAll(".animate-pulse");
			expect(skeletons.length).toBeGreaterThan(0);
		});
	});

	describe("RED: Add Passkey", () => {
		it("should call authClient.passkey.addPasskey when add button clicked", async () => {
			const user = userEvent.setup();
			const mockAdd = vi.mocked(authClient.passkey.addPasskey).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<PasskeysBlock />, { wrapper });

			const addButton = screen.getByRole("button", { name: /add passkey/i });
			await user.click(addButton);

			// Should call addPasskey
			await waitFor(() => {
				expect(mockAdd).toHaveBeenCalled();
			});
		});

		it("should show success message after adding passkey", async () => {
			const user = userEvent.setup();
			const { toast } = require("sonner");

			vi.mocked(authClient.passkey.addPasskey).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<PasskeysBlock />, { wrapper });

			const addButton = screen.getByRole("button", { name: /add passkey/i });
			await user.click(addButton);

			// Should show success
			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("Passkey added successfully");
			});
		});
	});

	describe("RED: Delete Passkey", () => {
		it("should call authClient.passkey.deletePasskey when delete clicked", async () => {
			const user = userEvent.setup();
			const mockDelete = vi.mocked(authClient.passkey.deletePasskey).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<PasskeysBlock />, { wrapper });

			// Find first delete button
			const deleteButtons = screen.getAllByRole("button");
			const firstDeleteButton = deleteButtons.find((btn) =>
				btn.querySelector("[class*='trash']")
			);

			if (firstDeleteButton) {
				await user.click(firstDeleteButton);

				// Should call deletePasskey
				await waitFor(() => {
					expect(mockDelete).toHaveBeenCalledWith({
						id: "passkey_1",
					});
				});
			}
		});

		it("should show success message after deleting passkey", async () => {
			const user = userEvent.setup();
			const { toast } = require("sonner");

			vi.mocked(authClient.passkey.deletePasskey).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			render(<PasskeysBlock />, { wrapper });

			const deleteButtons = screen.getAllByRole("button");
			const firstDeleteButton = deleteButtons.find((btn) =>
				btn.querySelector("[class*='trash']")
			);

			if (firstDeleteButton) {
				await user.click(firstDeleteButton);

				// Should show success
				await waitFor(() => {
					expect(toast.success).toHaveBeenCalledWith(
						"Passkey deleted successfully"
					);
				});
			}
		});

		it("should handle delete error", async () => {
			const user = userEvent.setup();
			const { toast } = require("sonner");

			vi.mocked(authClient.passkey.deletePasskey).mockRejectedValue(
				new Error("Delete failed")
			);

			render(<PasskeysBlock />, { wrapper });

			const deleteButtons = screen.getAllByRole("button");
			const firstDeleteButton = deleteButtons.find((btn) =>
				btn.querySelector("[class*='trash']")
			);

			if (firstDeleteButton) {
				await user.click(firstDeleteButton);

				// Should show error
				await waitFor(() => {
					expect(toast.error).toHaveBeenCalledWith("Failed to delete passkey");
				});
			}
		});
	});
});
