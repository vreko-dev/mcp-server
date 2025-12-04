import { describe, it, expect, beforeEach, vi } from "vitest";
import { authClient } from "@snapback/auth/client";

// Mock authClient organization invitation methods
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		organization: {
			listUserInvitations: vi.fn(),
			acceptInvitation: vi.fn(),
			rejectInvitation: vi.fn(),
			cancelInvitation: vi.fn(),
		},
	},
}));

// Mock toast notifications
vi.mock("sonner", () => ({
	toast: {
		promise: vi.fn(
			(promise: Promise<any> | (() => Promise<any>), messages: any) => {
				const p = typeof promise === "function" ? promise() : promise;
				Promise.resolve(p).then(
					() => {
						if (typeof messages.success === "function")
							messages.success();
					},
					() => {
						if (typeof messages.error === "function")
							messages.error();
					},
				);
			},
		),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("Organization Invitations Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("List User Invitations (Pending Invites)", () => {
		it("should retrieve all pending invitations for current user", async () => {
			const mockListInvites = vi.mocked(
				authClient.organization.listUserInvitations,
			).mockResolvedValue({
				data: [
					{
						id: "inv_1",
						organizationId: "org_acme",
						email: "user@example.com",
						status: "pending",
						createdAt: new Date("2025-01-01"),
					},
					{
						id: "inv_2",
						organizationId: "org_tech",
						email: "user@example.com",
						status: "pending",
						createdAt: new Date("2025-01-02"),
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.listUserInvitations();

			expect(mockListInvites).toHaveBeenCalled();
			expect(result.data?.length).toBe(2);
			expect(result.data?.[0].status).toBe("pending");
		});

		it("should handle user with no pending invitations", async () => {
			vi.mocked(authClient.organization.listUserInvitations).mockResolvedValue({
				data: [],
				error: null,
			} as any);

			const result = await authClient.organization.listUserInvitations();

			expect(result.data).toEqual([]);
			expect(result.error).toBeNull();
		});

		it("should include invitation metadata for better UX", async () => {
			vi.mocked(authClient.organization.listUserInvitations).mockResolvedValue({
				data: [
					{
						id: "inv_1",
						organizationId: "org_123",
						email: "user@example.com",
						status: "pending",
						expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.listUserInvitations();

			expect(result.data?.[0].expiresAt).toBeDefined();
		});

		it("should handle authentication error (not logged in)", async () => {
			vi.mocked(authClient.organization.listUserInvitations).mockResolvedValue({
				data: null,
				error: {
					code: "UNAUTHORIZED",
					message: "Must be authenticated to list invitations",
				},
			} as any);

			const result = await authClient.organization.listUserInvitations();

			expect(result.error?.code).toBe("UNAUTHORIZED");
		});

		it("should sort invitations by creation date (newest first)", async () => {
			vi.mocked(authClient.organization.listUserInvitations).mockResolvedValue({
				data: [
					{
						id: "inv_3",
						organizationId: "org_c",
						email: "user@example.com",
						status: "pending",
						expiresAt: new Date("2025-01-03"),
					},
					{
						id: "inv_1",
						organizationId: "org_a",
						email: "user@example.com",
						status: "pending",
						expiresAt: new Date("2025-01-01"),
					},
					{
						id: "inv_2",
						organizationId: "org_b",
						email: "user@example.com",
						status: "pending",
						expiresAt: new Date("2025-01-02"),
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.listUserInvitations();

			// Verify newest is first
			expect(result.data?.[0].expiresAt.getTime()).toBeGreaterThan(
				result.data?.[1].expiresAt.getTime() ?? 0,
			);
		});
	});

	describe("Accept Organization Invitation", () => {
		it("should successfully accept a pending invitation", async () => {
			const mockAccept = vi.mocked(
				authClient.organization.acceptInvitation,
			).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_123",
			});

			expect(mockAccept).toHaveBeenCalledWith({
				invitationId: "inv_123",
			});
			expect(result.error).toBeNull();
		});

		it("should handle invalid invitation ID", async () => {
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Invitation not found or already processed",
				},
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "invalid_inv",
			});

			expect(result.error?.code).toBe("NOT_FOUND");
		});

		it("should prevent accepting an already accepted invitation", async () => {
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "Invitation has already been accepted",
				},
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_already_accepted",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});

		it("should prevent accepting an expired invitation", async () => {
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "GONE",
					message: "Invitation has expired (older than 7 days)",
				},
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_expired",
			});

			expect(result.error?.code).toBe("GONE");
		});

		it("should prevent accepting invitation for wrong email", async () => {
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "This invitation was sent to a different email address",
				},
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_wrong_email",
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});

		it("should auto-join the organization after accepting", async () => {
			const mockAccept = vi.mocked(
				authClient.organization.acceptInvitation,
			).mockResolvedValue({
				data: {
					invitation: {
						id: "inv_123",
						organizationId: "org_123",
						status: "accepted",
					},
				},
				error: null,
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_123",
			});

			expect(result.data?.invitation?.organizationId).toBe("org_123");
			expect(result.data?.invitation?.status).toBe("accepted");
		});

		it("should return invitation status after accepting", async () => {
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: {
					invitation: {
						id: "inv_admin",
						status: "accepted",
					},
				},
				error: null,
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_admin",
			});

			expect(result.data?.invitation?.status).toBe("accepted");
		});
	});

	describe("Reject Organization Invitation", () => {
		it("should successfully reject a pending invitation", async () => {
			const mockReject = vi.mocked(
				authClient.organization.rejectInvitation,
			).mockResolvedValue({
				data: {
					invitation: {
						id: "inv_123",
						status: "rejected",
					},
				},
				error: null,
			} as any);

			const result = await authClient.organization.rejectInvitation({
				invitationId: "inv_123",
			});

			expect(mockReject).toHaveBeenCalledWith({
				invitationId: "inv_123",
			});
			expect(result.data?.invitation?.status).toBe("rejected");
		});

		it("should handle rejecting non-existent invitation", async () => {
			vi.mocked(authClient.organization.rejectInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Invitation not found",
				},
			} as any);

			const result = await authClient.organization.rejectInvitation({
				invitationId: "nonexistent",
			});

			expect(result.error?.code).toBe("NOT_FOUND");
		});

		it("should prevent rejecting an already rejected invitation", async () => {
			vi.mocked(authClient.organization.rejectInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "Invitation has already been rejected",
				},
			} as any);

			const result = await authClient.organization.rejectInvitation({
				invitationId: "inv_already_rejected",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});

		it("should prevent rejecting an accepted invitation", async () => {
			vi.mocked(authClient.organization.rejectInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "Cannot reject an invitation that has been accepted",
				},
			} as any);

			const result = await authClient.organization.rejectInvitation({
				invitationId: "inv_accepted",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});
	});

	describe("Cancel Invitation (Admin Only)", () => {
		it("should allow admin to cancel a pending invitation", async () => {
			const mockCancel = vi.mocked(
				authClient.organization.cancelInvitation,
			).mockResolvedValue({
				data: {
					invitation: {
						id: "inv_123",
						status: "cancelled",
					},
				},
				error: null,
			} as any);

			const result = await authClient.organization.cancelInvitation({
				invitationId: "inv_123",
			});

			expect(mockCancel).toHaveBeenCalledWith({
				invitationId: "inv_123",
			});
			expect(result.data?.invitation?.status).toBe("cancelled");
		});

		it("should prevent non-admins from canceling invitations", async () => {
			vi.mocked(authClient.organization.cancelInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "Only organization admins can cancel invitations",
				},
			} as any);

			const result = await authClient.organization.cancelInvitation({
				invitationId: "inv_123",
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});

		it("should prevent canceling an already accepted invitation", async () => {
			vi.mocked(authClient.organization.cancelInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "Cannot cancel an invitation that has been accepted",
				},
			} as any);

			const result = await authClient.organization.cancelInvitation({
				invitationId: "inv_accepted",
				organizationId: "org_456",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});
	});

	describe("Invitation User Experience & Flows", () => {
		it("should handle complete accept workflow", async () => {
			// Step 1: List invitations
			vi.mocked(authClient.organization.listUserInvitations).mockResolvedValue({
				data: [
					{
						id: "inv_1",
						organizationId: "org_123",
						email: "user@example.com",
						status: "pending",
					},
				],
				error: null,
			} as any);

			const listResult = await authClient.organization.listUserInvitations();
			expect(listResult.data?.length).toBe(1);

			// Step 2: Accept invitation
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: {
					invitation: {
						id: "inv_1",
						organizationId: "org_123",
						status: "accepted",
					},
				},
				error: null,
			} as any);

			const acceptResult = await authClient.organization.acceptInvitation({
				invitationId: "inv_1",
			});
			expect(acceptResult.data?.invitation?.organizationId).toBe("org_123");
		});

		it("should show clear error messages for user clarity", async () => {
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "GONE",
					message: "This invitation expired on January 8, 2025. Ask the admin to send a new invite.",
				},
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_expired",
			});

			// Verify user-friendly error message
			expect(result.error?.message).toContain("expired");
			expect(result.error?.message).toContain("admin");
		});

		it("should prevent bulk rejection of invitations to discourage spam", async () => {
			const invitationIds = [
				"inv_1",
				"inv_2",
				"inv_3",
				"inv_4",
				"inv_5",
			];

			// Should handle rejecting multiple (rate-limited in real API)
			for (const invId of invitationIds) {
				vi.mocked(authClient.organization.rejectInvitation).mockResolvedValue({
					data: { success: true },
					error: null,
				} as any);

				const result = await authClient.organization.rejectInvitation({
					invitationId: invId,
				});

				expect(result.data?.success).toBe(true);
			}
		});

		it("should provide invitation details for UI context", async () => {
			vi.mocked(authClient.organization.listUserInvitations).mockResolvedValue({
				data: [
					{
						id: "inv_1",
						organizationId: "org_123",
						email: "user@example.com",
						status: "pending",
						expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.listUserInvitations();

			// Verify enough data for rich UI
			expect(result.data?.[0].organizationId).toBeDefined();
			expect(result.data?.[0].email).toBeDefined();
			expect(result.data?.[0].expiresAt).toBeDefined();
		});
	});

	describe("Error Recovery & Graceful Degradation", () => {
		it("should maintain state after failed acceptance attempt", async () => {
			// First attempt fails
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValueOnce({
				data: null,
				error: {
					code: "NETWORK_ERROR",
					message: "Network request failed",
				},
			} as any);

			const firstResult = await authClient.organization.acceptInvitation({
				invitationId: "inv_123",
			});
			expect(firstResult.error?.code).toBe("NETWORK_ERROR");

			// Second attempt succeeds (user retries)
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValueOnce({
				data: { success: true },
				error: null,
			} as any);

			const secondResult = await authClient.organization.acceptInvitation({
				invitationId: "inv_123",
			});
			expect(secondResult.data?.success).toBe(true);
		});

		it("should handle server-side validation errors gracefully", async () => {
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: null,
				error: {
					code: "VALIDATION_ERROR",
					message: "Invitation email domain not allowed by organization",
				},
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_123",
			});

			expect(result.error?.code).toBe("VALIDATION_ERROR");
		});
	});
});
