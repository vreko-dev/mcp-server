/**
 * TDD Auth Queries Tests
 * Testing database query layer with minimal, focused test cases
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../client";
import {
	checkOrgMembership,
	getApiKeyByPrefix,
	getUserById,
	getUserOrgIds,
	getUserPermissions,
	getUserPlan,
	revokeApiKey,
	updateApiKeyLastUsed,
} from "../auth";

// Mock db module
vi.mock("../../client", () => ({
	db: {
		select: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
}));

describe("Auth Queries", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================
	// getUserById
	// ============================================================
	describe("getUserById", () => {
		it("should return user when found", async () => {
			const mockUser = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "user",
			};

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockUser]),
					}),
				}),
			} as any);

			const result = await getUserById("user-123");

			expect(result).toEqual(mockUser);
			expect(db?.select).toHaveBeenCalled();
		});

		it("should return null when user not found", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const result = await getUserById("nonexistent");

			expect(result).toBeNull();
		});

		it("should handle database errors gracefully", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue(new Error("DB error")),
				}),
			} as any);

			const result = await getUserById("user-123");

			expect(result).toBeNull();
		});
	});

	// ============================================================
	// getApiKeyByPrefix
	// ============================================================
	describe("getApiKeyByPrefix", () => {
		it("should return active API key", async () => {
			const mockKey = {
				id: "key-123",
				keyPreview: "sk_live",
				userId: "user-123",
				revokedAt: null,
				expiresAt: new Date(Date.now() + 1000000),
			};

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockKey]),
					}),
				}),
			} as any);

			const result = await getApiKeyByPrefix("sk_live");

			expect(result).toEqual(mockKey);
		});

		it("should return null for revoked key", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const result = await getApiKeyByPrefix("sk_revoked");

			expect(result).toBeNull();
		});

		it("should return null for expired key", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const result = await getApiKeyByPrefix("sk_expired");

			expect(result).toBeNull();
		});
	});

	// ============================================================
	// getUserPlan
	// ============================================================
	describe("getUserPlan", () => {
		it("should return plan for active subscription", async () => {
			const mockSub = { plan: "pro", status: "active" };

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSub]),
					}),
				}),
			} as any);

			const result = await getUserPlan("user-123");

			expect(result).toBe("pro");
		});

		it("should return free for no subscription", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const result = await getUserPlan("user-123");

			expect(result).toBe("free");
		});

		it("should return plan for trial subscription", async () => {
			const mockSub = { plan: "team", status: "trialing" };

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSub]),
					}),
				}),
			} as any);

			const result = await getUserPlan("user-123");

			expect(result).toBe("team");
		});

		it("should return free on error", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue(new Error("DB error")),
				}),
			} as any);

			const result = await getUserPlan("user-123");

			expect(result).toBe("free");
		});
	});

	// ============================================================
	// getUserPermissions
	// ============================================================
	describe("getUserPermissions", () => {
		it("should return admin permissions for admin user", async () => {
			const mockUser = { id: "user-123", role: "admin" };

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockUser]),
					}),
				}),
			} as any);

			const result = await getUserPermissions("user-123");

			expect(result).toContain("admin:read");
			expect(result).toContain("admin:write");
		});

		it("should return user permissions for regular user", async () => {
			const mockUser = { id: "user-123", role: "user" };

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockUser]),
					}),
				}),
			} as any);

			const result = await getUserPermissions("user-123");

			expect(result).toContain("snapshot:create");
		});

		it("should include plan-based permissions", async () => {
			const mockUser = { id: "user-123", role: "user" };
			const mockSub = { plan: "enterprise", status: "active" };

			let selectCallCount = 0;
			vi.mocked(db?.select).mockImplementation(() => {
				selectCallCount++;
				if (selectCallCount === 1) {
					// First call: getUserById
					return {
						from: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue([mockUser]),
							}),
						}),
					} as any;
				}
				// Second call: getUserPlan
				return {
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([mockSub]),
						}),
					}),
				} as any;
			});

			const result = await getUserPermissions("user-123");

			expect(result).toContain("sso:enabled");
			expect(result).toContain("audit:enabled");
		});

		it("should return empty for nonexistent user", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const result = await getUserPermissions("nonexistent");

			expect(result).toEqual([]);
		});
	});

	// ============================================================
	// getUserOrgIds
	// ============================================================
	describe("getUserOrgIds", () => {
		it("should return org IDs for user", async () => {
			const mockMemberships = [{ orgId: "org-1" }, { orgId: "org-2" }];

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(mockMemberships),
				}),
			} as any);

			const result = await getUserOrgIds("user-123");

			expect(result).toEqual(["org-1", "org-2"]);
		});

		it("should return empty array for user with no orgs", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			} as any);

			const result = await getUserOrgIds("user-123");

			expect(result).toEqual([]);
		});
	});

	// ============================================================
	// checkOrgMembership
	// ============================================================
	describe("checkOrgMembership", () => {
		it("should return membership when user is member", async () => {
			const mockMembership = {
				userId: "user-123",
				organizationId: "org-1",
				role: "member",
			};

			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockMembership]),
					}),
				}),
			} as any);

			const result = await checkOrgMembership("user-123", "org-1");

			expect(result).toEqual(mockMembership);
		});

		it("should return null when user is not member", async () => {
			vi.mocked(db?.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const result = await checkOrgMembership("user-123", "org-999");

			expect(result).toBeNull();
		});
	});

	// ============================================================
	// updateApiKeyLastUsed
	// ============================================================
	describe("updateApiKeyLastUsed", () => {
		it("should update last used timestamp", async () => {
			const mockUpdate = {
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({ rowCount: 1 }),
				}),
			};

			vi.mocked(db?.update).mockReturnValue(mockUpdate as any);

			await updateApiKeyLastUsed("key-123");

			expect(db?.update).toHaveBeenCalled();
			expect(mockUpdate.set).toHaveBeenCalled();
		});

		it("should handle update errors gracefully", async () => {
			vi.mocked(db?.update).mockImplementation(() => {
				throw new Error("Update failed");
			});

			// Should not throw
			expect(async () => {
				await updateApiKeyLastUsed("key-123");
			}).not.toThrow();
		});
	});

	// ============================================================
	// revokeApiKey
	// ============================================================
	describe("revokeApiKey", () => {
		it("should revoke API key", async () => {
			const mockUpdate = {
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({ rowCount: 1 }),
				}),
			};

			vi.mocked(db?.update).mockReturnValue(mockUpdate as any);

			const result = await revokeApiKey("key-123");

			expect(result).toBe(true);
		});

		it("should return false on error", async () => {
			vi.mocked(db?.update).mockImplementation(() => {
				throw new Error("Revoke failed");
			});

			const result = await revokeApiKey("key-123");

			expect(result).toBe(false);
		});
	});
});
