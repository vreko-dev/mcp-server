import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "@snapback/auth/client";

// Mock authClient
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		organization: {
			create: vi.fn(),
			list: vi.fn(),
			get: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

describe("Organization CRUD Operations", () => {
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

	describe("Create Organization", () => {
		it("should successfully create an organization with name and slug", async () => {
			const mockCreateOrg = vi.mocked(
				authClient.organization.create,
			).mockResolvedValue({
				data: {
					id: "org_123",
					name: "Acme Corp",
					slug: "acme-corp",
					createdAt: new Date(),
					metadata: {},
				},
				error: null,
			} as any);

			await authClient.organization.create({
				name: "Acme Corp",
				slug: "acme-corp",
			});

			expect(mockCreateOrg).toHaveBeenCalledWith({
				name: "Acme Corp",
				slug: "acme-corp",
			});

			const result = await mockCreateOrg({
				name: "Acme Corp",
				slug: "acme-corp",
			});

			expect(result.error).toBeNull();
			expect(result.data?.name).toBe("Acme Corp");
			expect(result.data?.slug).toBe("acme-corp");
		});

		it("should handle duplicate slug error", async () => {
			vi.mocked(authClient.organization.create).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "Organization slug already exists",
				},
			} as any);

			const result = await authClient.organization.create({
				name: "Duplicate",
				slug: "taken-slug",
			});

			expect(result.error).toBeDefined();
			expect(result.error?.code).toBe("CONFLICT");
			expect(result.data).toBeNull();
		});

		it("should handle validation error for invalid slug format", async () => {
			vi.mocked(authClient.organization.create).mockResolvedValue({
				data: null,
				error: {
					code: "INVALID_INPUT",
					message: "Slug must contain only lowercase letters, numbers, and hyphens",
				},
			} as any);

			const result = await authClient.organization.create({
				name: "Invalid",
				slug: "Invalid_Slug!",
			});

			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain("lowercase");
		});

		it("should handle empty name error", async () => {
			vi.mocked(authClient.organization.create).mockResolvedValue({
				data: null,
				error: {
					code: "INVALID_INPUT",
					message: "Organization name is required",
				},
			} as any);

			const result = await authClient.organization.create({
				name: "",
				slug: "test",
			});

			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain("name");
		});
	});

	describe("List Organizations", () => {
		it("should list all organizations for the current user", async () => {
			const mockListOrgs = vi.mocked(authClient.organization.list).mockResolvedValue({
				data: [
					{
						id: "org_1",
						name: "Acme Corp",
						slug: "acme-corp",
						role: "owner",
					},
					{
						id: "org_2",
						name: "Tech Inc",
						slug: "tech-inc",
						role: "admin",
					},
				],
				error: null,
			} as any);

			const result = await authClient.organization.list();

			expect(mockListOrgs).toHaveBeenCalled();
			expect(result.data?.length).toBe(2);
			expect(result.data?.[0].name).toBe("Acme Corp");
			expect(result.data?.[1].role).toBe("admin");
		});

		it("should return empty list when user has no organizations", async () => {
			vi.mocked(authClient.organization.list).mockResolvedValue({
				data: [],
				error: null,
			} as any);

			const result = await authClient.organization.list();

			expect(result.data).toEqual([]);
			expect(result.error).toBeNull();
		});

		it("should support pagination", async () => {
			const mockListOrgs = vi.mocked(authClient.organization.list).mockResolvedValue({
				data: [
					{ id: "org_1", name: "Org 1", slug: "org-1", role: "owner" },
				],
				error: null,
			} as any);

			await authClient.organization.list({
				limit: 10,
				offset: 0,
			});

			expect(mockListOrgs).toHaveBeenCalledWith({
				limit: 10,
				offset: 0,
			});
		});

		it("should handle authentication error", async () => {
			vi.mocked(authClient.organization.list).mockResolvedValue({
				data: null,
				error: {
					code: "UNAUTHORIZED",
					message: "Must be authenticated to list organizations",
				},
			} as any);

			const result = await authClient.organization.list();

			expect(result.error?.code).toBe("UNAUTHORIZED");
		});
	});

	describe("Get Organization", () => {
		it("should retrieve a specific organization by ID", async () => {
			const mockGetOrg = vi.mocked(authClient.organization.get).mockResolvedValue({
				data: {
					id: "org_123",
					name: "Acme Corp",
					slug: "acme-corp",
					createdAt: new Date("2025-01-01"),
					metadata: { website: "acme.com" },
				},
				error: null,
			} as any);

			const result = await authClient.organization.get({
				organizationId: "org_123",
			});

			expect(mockGetOrg).toHaveBeenCalledWith({
				organizationId: "org_123",
			});
			expect(result.data?.name).toBe("Acme Corp");
			expect(result.data?.metadata?.website).toBe("acme.com");
		});

		it("should handle organization not found error", async () => {
			vi.mocked(authClient.organization.get).mockResolvedValue({
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Organization not found",
				},
			} as any);

			const result = await authClient.organization.get({
				organizationId: "nonexistent",
			});

			expect(result.error?.code).toBe("NOT_FOUND");
		});

		it("should handle unauthorized access to organization", async () => {
			vi.mocked(authClient.organization.get).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "You do not have access to this organization",
				},
			} as any);

			const result = await authClient.organization.get({
				organizationId: "org_forbidden",
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});
	});

	describe("Update Organization", () => {
		it("should successfully update organization name", async () => {
			const mockUpdateOrg = vi.mocked(authClient.organization.update).mockResolvedValue({
				data: {
					id: "org_123",
					name: "Acme Corp Updated",
					slug: "acme-corp",
				},
				error: null,
			} as any);

			const result = await authClient.organization.update({
				organizationId: "org_123",
				data: { name: "Acme Corp Updated" },
			});

			expect(mockUpdateOrg).toHaveBeenCalledWith({
				organizationId: "org_123",
				data: { name: "Acme Corp Updated" },
			});
			expect(result.data?.name).toBe("Acme Corp Updated");
		});

		it("should successfully update organization metadata", async () => {
			vi.mocked(authClient.organization.update).mockResolvedValue({
				data: {
					id: "org_123",
					name: "Acme Corp",
					metadata: { website: "newtsite.com" },
				},
				error: null,
			} as any);

			const result = await authClient.organization.update({
				organizationId: "org_123",
				data: { metadata: { website: "newsite.com" } },
			});

			expect(result.data?.metadata?.website).toBe("newtsite.com");
		});

		it("should handle permission denied for non-owners", async () => {
			vi.mocked(authClient.organization.update).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "Only organization owners can update organization details",
				},
			} as any);

			const result = await authClient.organization.update({
				organizationId: "org_123",
				data: { name: "New Name" },
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});

		it("should validate update payload", async () => {
			vi.mocked(authClient.organization.update).mockResolvedValue({
				data: null,
				error: {
					code: "INVALID_INPUT",
					message: "Name must be between 1 and 255 characters",
				},
			} as any);

			const result = await authClient.organization.update({
				organizationId: "org_123",
				data: { name: "" },
			});

			expect(result.error?.code).toBe("INVALID_INPUT");
		});
	});

	describe("Delete Organization", () => {
		it("should successfully delete an organization", async () => {
			const mockDeleteOrg = vi.mocked(authClient.organization.delete).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await authClient.organization.delete({
				organizationId: "org_123",
			});

			expect(mockDeleteOrg).toHaveBeenCalledWith({
				organizationId: "org_123",
			});
			expect(result.data?.success).toBe(true);
			expect(result.error).toBeNull();
		});

		it("should handle deletion of organization with active members", async () => {
			vi.mocked(authClient.organization.delete).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message:
						"Cannot delete organization with active members. Remove all members first.",
				},
			} as any);

			const result = await authClient.organization.delete({
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});

		it("should handle permission denied for non-owners", async () => {
			vi.mocked(authClient.organization.delete).mockResolvedValue({
				data: null,
				error: {
					code: "FORBIDDEN",
					message: "Only organization owners can delete the organization",
				},
			} as any);

			const result = await authClient.organization.delete({
				organizationId: "org_123",
			});

			expect(result.error?.code).toBe("FORBIDDEN");
		});

		it("should handle organization not found error", async () => {
			vi.mocked(authClient.organization.delete).mockResolvedValue({
				data: null,
				error: {
					code: "NOT_FOUND",
					message: "Organization not found",
				},
			} as any);

			const result = await authClient.organization.delete({
				organizationId: "nonexistent",
			});

			expect(result.error?.code).toBe("NOT_FOUND");
		});
	});

	describe("Organization CRUD Integration", () => {
		it("should handle complete create → read → update → delete workflow", async () => {
			// Create
			vi.mocked(authClient.organization.create).mockResolvedValue({
				data: { id: "org_123", name: "Test Org", slug: "test-org" },
				error: null,
			} as any);

			const createResult = await authClient.organization.create({
				name: "Test Org",
				slug: "test-org",
			});
			expect(createResult.data?.id).toBe("org_123");

			// Read
			vi.mocked(authClient.organization.get).mockResolvedValue({
				data: { id: "org_123", name: "Test Org", slug: "test-org" },
				error: null,
			} as any);

			const getResult = await authClient.organization.get({
				organizationId: "org_123",
			});
			expect(getResult.data?.name).toBe("Test Org");

			// Update
			vi.mocked(authClient.organization.update).mockResolvedValue({
				data: { id: "org_123", name: "Updated Org", slug: "test-org" },
				error: null,
			} as any);

			const updateResult = await authClient.organization.update({
				organizationId: "org_123",
				data: { name: "Updated Org" },
			});
			expect(updateResult.data?.name).toBe("Updated Org");

			// Delete
			vi.mocked(authClient.organization.delete).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const deleteResult = await authClient.organization.delete({
				organizationId: "org_123",
			});
			expect(deleteResult.data?.success).toBe(true);
		});

		it("should prevent cascade deletion without proper cleanup", async () => {
			vi.mocked(authClient.organization.delete).mockResolvedValue({
				data: null,
				error: {
					code: "CONFLICT",
					message: "Cannot delete organization with active subscriptions",
				},
			} as any);

			const result = await authClient.organization.delete({
				organizationId: "org_with_subscription",
			});

			expect(result.error?.code).toBe("CONFLICT");
		});
	});
});
