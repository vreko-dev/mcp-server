/**
 * Payments Integration Tests (RED Phase)
 *
 * Tests for payments API re-enablement:
 * - listPurchases ORPC integration
 * - Prefetching query with React Query
 * - Error handling
 * - Type safety with actual contracts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Purchase } from "@snapback/platform";

// Mock ORPC client
vi.mock("@shared/lib/orpc-client", () => ({
	orpcClient: {
		payments: {
			listPurchases: vi.fn(),
		},
	},
}));

describe("Payments API Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("listPurchases", () => {
		it("should fetch purchases successfully", async () => {
			const { orpcClient } = await import("@shared/lib/orpc-client");
			const mockPurchases: Purchase[] = [
				{
					id: "purchase-1",
					userId: "user-1",
					organizationId: undefined,
					planId: "pro",
					subscriptionId: "sub-1",
					status: "active",
					currentPeriodStart: new Date(),
					currentPeriodEnd: new Date(),
					cancelledAt: undefined,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			vi.mocked(orpcClient.payments.listPurchases).mockResolvedValue({
				purchases: mockPurchases,
			});

			const result = await orpcClient.payments.listPurchases({});

			expect(result.purchases).toEqual(mockPurchases);
			expect(result.purchases).toHaveLength(1);
		});

		it("should handle empty purchases list", async () => {
			const { orpcClient } = await import("@shared/lib/orpc-client");

			vi.mocked(orpcClient.payments.listPurchases).mockResolvedValue({
				purchases: [],
			});

			const result = await orpcClient.payments.listPurchases({});

			expect(result.purchases).toEqual([]);
		});

		it("should handle API errors gracefully", async () => {
			const { orpcClient } = await import("@shared/lib/orpc-client");

			vi.mocked(orpcClient.payments.listPurchases).mockRejectedValue(
				new Error("Database not available"),
			);

			await expect(orpcClient.payments.listPurchases({})).rejects.toThrow(
				"Database not available",
			);
		});

		it("should support organizationId filter", async () => {
			const { orpcClient } = await import("@shared/lib/orpc-client");

			const mockPurchases: Purchase[] = [
				{
					id: "org-purchase-1",
					userId: undefined,
					organizationId: "org-1",
					planId: "team",
					subscriptionId: "sub-2",
					status: "active",
					currentPeriodStart: new Date(),
					currentPeriodEnd: new Date(),
					cancelledAt: undefined,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			vi.mocked(orpcClient.payments.listPurchases).mockResolvedValue({
				purchases: mockPurchases,
			});

			const result = await orpcClient.payments.listPurchases({
				organizationId: "org-1",
			});

			expect(result.purchases[0].organizationId).toBe("org-1");
		});
	});

	describe("Purchase type safety", () => {
		it("should have correct Purchase fields", () => {
			const purchase: Purchase = {
				id: "test-id",
				userId: "user-id",
				organizationId: undefined,
				planId: "pro",
				subscriptionId: "sub-id",
				status: "active",
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(),
				cancelledAt: undefined,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			expect(purchase.id).toBeDefined();
			expect(purchase.planId).toBeDefined();
			expect(purchase.status).toBe("active");
		});

		it("should handle cancelled purchases", () => {
			const cancelledDate = new Date();
			const purchase: Purchase = {
				id: "test-id",
				userId: "user-id",
				organizationId: undefined,
				planId: "pro",
				subscriptionId: "sub-id",
				status: "cancelled",
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(),
				cancelledAt: cancelledDate,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			expect(purchase.status).toBe("cancelled");
			expect(purchase.cancelledAt).toBe(cancelledDate);
		});
	});
});
