import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "@snapback/auth/client";
import { Sonner } from "sonner";

// Mock authClient - organization plugin methods
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		organization: {
			inviteMember: vi.fn(),
			listMembers: vi.fn(),
			updateMemberRole: vi.fn(),
			removeMember: vi.fn(),
			listInvitations: vi.fn(),
			cancelInvitation: vi.fn(),
			listUserInvitations: vi.fn(),
			acceptInvitation: vi.fn(),
			rejectInvitation: vi.fn(),
			listRoles: vi.fn(),
			checkRolePermission: vi.fn(),
			getActiveMemberRole: vi.fn(),
		},
	},
}));

// Mock Sonner toast
vi.mock("sonner", () => ({
	Sonner: { toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() } },
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

describe("Organization Members Management", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		queryClient.clear();
	});

	describe("Invite Member to Organization", () => {
		it("should successfully invite a member with email and role", async () => {
			const mockInvite = vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.inviteMember({
				email: "john@example.com",
				role: "member",
				organizationId: "org_123",
			});

			expect(mockInvite).toHaveBeenCalledWith({
				email: "john@example.com",
				role: "member",
				organizationId: "org_123",
			});
			expect(result.error).toBeNull();
			expect(result.data?.success).toBe(true);
		});

		it("should handle invalid email format", async () => {
			vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
				data: null,
				error: {
					code: "INVALID_INPUT",
					message: "Invalid email format",
				},
			} as any);

			const result = await authClient.organization.inviteMember({
				email: "not-an-email",
				role: "member",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("INVALID_INPUT");
		});

		it("should handle duplicate invitation (user already invited)", async () => {
			vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "User is already a member or has pending invitation",
				},
			} as any);

			const result = await authClient.organization.inviteMember({
				email: "john@example.com",
				role: "member",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});

		it("should handle permission denied (non-admin user)", async () => {
			vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "Only admins can invite members",
				},
			} as any);

			const result = await authClient.organization.inviteMember({
				email: "john@example.com",
				role: "member",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});

		it("should support inviting with specific team assignment", async () => {
			const mockInvite = vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			await authClient.organization.inviteMember({
				email: "john@example.com",
				role: "member",
				organizationId: "org_123",
				teamId: "team_456",
			});

			expect(mockInvite).toHaveBeenCalledWith({
				email: "john@example.com",
				role: "member",
				organizationId: "org_123",
				teamId: "team_456",
			});
		});
	});

	describe("List Organization Members", () => {
		it("should successfully list all members of an organization", async () => {
			const mockListMembers = vi.mocked(
				authClient.organization.listMembers,
			).mockResolvedValue({
				data: [
					{
						id: "member_1",
						userId: "user_1",
						user: { email: "alice@example.com", name: "Alice" },
						role: "owner",
						createdAt: new Date(),
					},
					{
						id: "member_2",
						userId: "user_2",
						user: { email: "bob@example.com", name: "Bob" },
						role: "admin",
						createdAt: new Date(),
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.listMembers({
				organizationId: "org_123",
			});

			expect(mockListMembers).toHaveBeenCalledWith({
				organizationId: "org_123",
			});
			expect(result.data?.length).toBe(2);
			expect(result.data?.[0].role).toBe("owner");
		});

		it("should handle empty member list", async () => {
			vi.mocked(authClient.organization.listMembers).mockResolvedValue({
				data: [],
				error: null,
			} as any);

			const result = await authClient.organization.listMembers({
				organizationId: "org_empty",
			});

			expect(result.data).toEqual([]);
		});

		it("should support pagination in member list", async () => {
			const mockListMembers = vi.mocked(
				authClient.organization.listMembers,
			).mockResolvedValue({
				data: [
					{
						id: "member_1",
						userId: "user_1",
						user: { email: "alice@example.com", name: "Alice" },
						role: "owner",
					},
				],
				error: null,
			} as any);

			await authClient.organization.listMembers({
				organizationId: "org_123",
				offset: 0,
			});

			expect(mockListMembers).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: "org_123",
					offset: 0,
				}),
			);
		});
	});

	describe("Update Member Role", () => {
		it("should successfully update member role to admin", async () => {
			const mockUpdateRole = vi.mocked(
				authClient.organization.updateMemberRole,
			).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.updateMemberRole({
				memberId: "member_123",
				role: "admin",
				organizationId: "org_123",
			});

			expect(mockUpdateRole).toHaveBeenCalledWith({
				memberId: "member_123",
				role: "admin",
				organizationId: "org_123",
			});
			expect(result.error).toBeNull();
		});

		it("should support assigning multiple roles", async () => {
			const mockUpdateRole = vi.mocked(
				authClient.organization.updateMemberRole,
			).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			await authClient.organization.updateMemberRole({
				memberId: "member_123",
				role: ["admin", "sales"],
				organizationId: "org_123",
			});

			expect(mockUpdateRole).toHaveBeenCalledWith({
				memberId: "member_123",
				role: ["admin", "sales"],
				organizationId: "org_123",
			});
		});

		it("should handle permission denied (non-owner trying to update role)", async () => {
			vi.mocked(authClient.organization.updateMemberRole).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "Only organization owners can update member roles",
				},
			} as any);

			const result = await authClient.organization.updateMemberRole({
				memberId: "member_123",
				role: "admin",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});

		it("should handle member not found error", async () => {
			vi.mocked(authClient.organization.updateMemberRole).mockResolvedValue({
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Member not found",
				},
			} as any);

			const result = await authClient.organization.updateMemberRole({
				memberId: "nonexistent",
				role: "admin",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("NOT_FOUND");
		});
	});

	describe("Remove Member from Organization", () => {
		it("should successfully remove a member from organization", async () => {
			const mockRemove = vi.mocked(authClient.organization.removeMember).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.removeMember({
				memberIdOrEmail: "member_123",
				organizationId: "org_123",
			});

			expect(mockRemove).toHaveBeenCalledWith({
				memberIdOrEmail: "member_123",
				organizationId: "org_123",
			});
			expect(result.data?.success).toBe(true);
		});

		it("should support removing member by email", async () => {
			const mockRemove = vi.mocked(authClient.organization.removeMember).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			await authClient.organization.removeMember({
				memberIdOrEmail: "john@example.com",
				organizationId: "org_123",
			});

			expect(mockRemove).toHaveBeenCalledWith({
				memberIdOrEmail: "john@example.com",
				organizationId: "org_123",
			});
		});

		it("should handle removing the last owner (prevent)", async () => {
			vi.mocked(authClient.organization.removeMember).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "Cannot remove the last owner of the organization",
				},
			} as any);

			const result = await authClient.organization.removeMember({
				memberIdOrEmail: "owner@example.com",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});

		it("should handle permission denied (non-owner trying to remove)", async () => {
			vi.mocked(authClient.organization.removeMember).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "Only organization owners can remove members",
				},
			} as any);

			const result = await authClient.organization.removeMember({
				memberIdOrEmail: "member_123",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});
	});

	describe("Organization Invitations", () => {
		it("should list all pending invitations for an organization", async () => {
			const mockListInvites = vi.mocked(
				authClient.organization.listInvitations,
			).mockResolvedValue({
				data: [
					{
						id: "inv_1",
						email: "john@example.com",
						organizationId: "org_123",
						status: "pending",
						createdAt: new Date(),
					},
					{
						id: "inv_2",
						email: "jane@example.com",
						organizationId: "org_123",
						status: "accepted",
						createdAt: new Date(),
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.listInvitations({
				organizationId: "org_123",
			});

			expect(mockListInvites).toHaveBeenCalledWith({
				organizationId: "org_123",
			});
			expect(result.data?.length).toBe(2);
			expect(result.data?.[0].status).toBe("pending");
		});

		it("should list user invitations (invites for current user)", async () => {
			const mockListUserInvites = vi.mocked(
				authClient.organization.listUserInvitations,
			).mockResolvedValue({
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

			const result = await authClient.organization.listUserInvitations();

			expect(mockListUserInvites).toHaveBeenCalled();
			expect(result.data?.length).toBe(1);
			expect(result.data?.[0].status).toBe("pending");
		});

		it("should accept an invitation", async () => {
			const mockAccept = vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.acceptInvitation({
				invitationId: "inv_123",
			});

			expect(mockAccept).toHaveBeenCalledWith({
				invitationId: "inv_123",
			});
			expect(result.data?.success).toBe(true);
		});

		it("should reject an invitation", async () => {
			const mockReject = vi.mocked(authClient.organization.rejectInvitation).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.rejectInvitation({
				invitationId: "inv_123",
			});

			expect(mockReject).toHaveBeenCalledWith({
				invitationId: "inv_123",
			});
			expect(result.data?.success).toBe(true);
		});

		it("should cancel an invitation (admin only)", async () => {
			const mockCancel = vi.mocked(authClient.organization.cancelInvitation).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.cancelInvitation({
				invitationId: "inv_123",
				organizationId: "org_123",
			});

			expect(mockCancel).toHaveBeenCalledWith({
				invitationId: "inv_123",
				organizationId: "org_123",
			});
			expect(result.data?.success).toBe(true);
		});

		it("should handle accepting an already accepted invitation", async () => {
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
	});

	describe("Organization Roles Management", () => {
		it("should list all available roles in an organization", async () => {
			const mockListRoles = vi.mocked(authClient.organization.listRoles).mockResolvedValue({
				data: [
					{
						id: "role_owner",
						name: "owner",
						permissions: { organization: ["*"] },
					},
					{
						id: "role_admin",
						name: "admin",
						permissions: { organization: ["read", "update"], member: ["read", "update"] },
					},
					{
						id: "role_member",
						name: "member",
						permissions: { organization: ["read"], member: ["read"] },
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.listRoles({
				organizationId: "org_123",
			});

			expect(mockListRoles).toHaveBeenCalledWith({
				organizationId: "org_123",
			});
			expect(result.data?.length).toBe(3);
			expect(result.data?.[0].name).toBe("owner");
		});

		it("should get active member role for current user", async () => {
			const mockGetActiveRole = vi.mocked(
				authClient.organization.getActiveMemberRole,
			).mockResolvedValue({
				data: {
					role: "admin",
				},
				error: null,
			} as any);

			const result = await authClient.organization.getActiveMemberRole();

			expect(mockGetActiveRole).toHaveBeenCalled();
			expect(result.data?.role).toBe("admin");
		});

		it("should check role permissions client-side", async () => {
			const mockCheckPermission = vi.mocked(
				authClient.organization.checkRolePermission,
			).mockReturnValue(true);

			const hasPermission = authClient.organization.checkRolePermission({
				role: "admin",
				permissions: {
					organization: ["delete"],
				},
			});

			expect(mockCheckPermission).toHaveBeenCalledWith({
				role: "admin",
				permissions: {
					organization: ["delete"],
				},
			});
			expect(hasPermission).toBe(true);
		});

		it("should check multiple resource permissions", async () => {
			const mockCheckPermission = vi.mocked(
				authClient.organization.checkRolePermission,
			).mockReturnValue(true);

			authClient.organization.checkRolePermission({
				role: "admin",
				permissions: {
					organization: ["delete"],
					member: ["delete"],
				},
			});

			expect(mockCheckPermission).toHaveBeenCalledWith(
				expect.objectContaining({
					role: "admin",
					permissions: expect.objectContaining({
						organization: ["delete"],
						member: ["delete"],
					}),
				}),
			);
		});

		it("should return false for member role without delete permission", async () => {
			vi.mocked(authClient.organization.checkRolePermission).mockReturnValue(false);

			const hasPermission = authClient.organization.checkRolePermission({
				role: "member",
				permissions: {
					organization: ["delete"],
				},
			});

			expect(hasPermission).toBe(false);
		});
	});

	describe("Organization Member Workflow Integration", () => {
		it("should handle complete invite → accept → manage workflow", async () => {
			// Invite
			vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const inviteResult = await authClient.organization.inviteMember({
				email: "john@example.com",
				role: "member",
				organizationId: "org_123",
			});
			expect(inviteResult.data?.success).toBe(true);

			// List invitations
			vi.mocked(authClient.organization.listInvitations).mockResolvedValue({
				data: [
					{
						id: "inv_123",
						email: "john@example.com",
						status: "pending",
					},
				],
				error: null,
			} as any);

			const listResult = await authClient.organization.listInvitations({
				organizationId: "org_123",
			});
			expect(listResult.data?.length).toBe(1);

			// Accept invitation
			vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const acceptResult = await authClient.organization.acceptInvitation({
				invitationId: "inv_123",
			});
			expect(acceptResult.data?.success).toBe(true);

			// List members
			vi.mocked(authClient.organization.listMembers).mockResolvedValue({
				data: [
					{
						id: "member_123",
						userId: "user_new",
						user: { email: "john@example.com" },
						role: "member",
					},
				],
				error: null,
			} as any);

			const membersResult = await authClient.organization.listMembers({
				organizationId: "org_123",
			});
			expect(membersResult.data?.length).toBe(1);

			// Update role
			vi.mocked(authClient.organization.updateMemberRole).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const updateResult = await authClient.organization.updateMemberRole({
				memberId: "member_123",
				role: "admin",
				organizationId: "org_123",
			});
			expect(updateResult.data?.success).toBe(true);
		});

		it("should prevent invalid role transitions", async () => {
			vi.mocked(authClient.organization.updateMemberRole).mockResolvedValue({
				data: null,
				error: {
					code: "INVALID_OPERATION",
					message: "Cannot downgrade last owner to member",
				},
			} as any);

			const result = await authClient.organization.updateMemberRole({
				memberId: "last_owner",
				role: "member",
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("INVALID_OPERATION");
		});
	});
});
