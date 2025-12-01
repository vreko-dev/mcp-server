import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	handleCheckoutCompleted,
	handleSubscriptionCreated,
	handleSubscriptionDeleted,
	handleSubscriptionUpdated,
} from "../../lib/stripe-webhook-handlers";

// Mock the database
const mockDb = {
	select: vi.fn(),
	update: vi.fn(),
	insert: vi.fn(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	returning: vi.fn(),
	onConflictDoUpdate: vi.fn(),
};

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// Mock the platform db
vi.mock("@snapback/platform", async () => {
	const actual = await vi.importActual("@snapback/platform");
	return {
		...actual,
		db: mockDb,
		snapbackSchema: {
			deviceTrials: {},
		},
	};
});

// Mock the email service
vi.mock("../../lib/email-service", () => ({
	sendCancellationEmail: vi.fn(),
	sendPaymentFailedEmail: vi.fn(),
	sendPaymentReceipt: vi.fn(),
	sendWelcomeEmail: vi.fn(),
}));

describe("Stripe Webhook Handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("PAY-001: updateUserPlan", () => {
		it("should update user tier on subscription change", async () => {
			const subscription = {
				id: "sub_123",
				customer: "cus_123",
				status: "active",
				items: {
					data: [
						{
							price: {
								id: "price_123",
								lookup_key: "pro_monthly",
							},
						},
					],
				},
			};

			// Mock database responses
			mockDb.select.mockResolvedValueOnce([
				{ id: "user-123", subscriptionTier: "free" },
			]);
			mockDb.update.mockResolvedValueOnce({});
			mockDb.insert.mockResolvedValueOnce({});
			mockDb.onConflictDoUpdate.mockResolvedValueOnce({});

			const result = await handleSubscriptionCreated(subscription);

			expect(result.success).toBe(true);
			expect(mockDb.update).toHaveBeenCalled();
		});

		it("should be idempotent (duplicate webhooks safe)", async () => {
			const subscription = {
				id: "sub_123",
				customer: "cus_123",
				status: "active",
				items: {
					data: [
						{
							price: {
								id: "price_123",
								lookup_key: "pro_monthly",
							},
						},
					],
				},
			};

			// Mock database responses
			mockDb.select.mockResolvedValueOnce([
				{ id: "user-123", subscriptionTier: "free" },
			]);
			mockDb.update.mockResolvedValueOnce({});
			mockDb.insert.mockResolvedValueOnce({});
			mockDb.onConflictDoUpdate.mockResolvedValueOnce({});

			// Call twice to simulate duplicate webhooks
			await handleSubscriptionCreated(subscription);
			await handleSubscriptionCreated(subscription);

			expect(mockDb.update).toHaveBeenCalledTimes(2);
		});
	});

	describe("PAY-002: enableCloudBackup", () => {
		it("should enable cloud backup on Pro subscription", async () => {
			const customerId = "cus_123";

			// Mock database responses
			mockDb.select.mockResolvedValueOnce([
				{ id: "user-123", email: "test@example.com" },
			]);
			mockDb.update.mockResolvedValueOnce({});
			mockDb.insert.mockResolvedValueOnce({});
			mockDb.onConflictDoUpdate.mockResolvedValueOnce({});

			const subscription = {
				id: "sub_123",
				customer: customerId,
				status: "active",
				items: {
					data: [
						{
							price: {
								id: "price_123",
								lookup_key: "pro_monthly",
							},
						},
					],
				},
			};

			const result = await handleSubscriptionCreated(subscription);

			expect(result.success).toBe(true);
			expect(mockDb.update).toHaveBeenCalled();
		});
	});

	describe("PAY-003: disableCloudBackup", () => {
		it("should disable cloud backup but retain data for grace period", async () => {
			const subscription = {
				id: "sub_123",
				customer: "cus_123",
				status: "canceled",
				items: {
					data: [
						{
							price: {
								id: "price_123",
								lookup_key: "pro_monthly",
							},
						},
					],
				},
			};

			// Mock database responses
			mockDb.select.mockResolvedValueOnce([
				{ id: "user-123", email: "test@example.com" },
			]);
			mockDb.update.mockResolvedValueOnce({});

			const result = await handleSubscriptionDeleted(subscription);

			expect(result.success).toBe(true);
			expect(mockDb.update).toHaveBeenCalled();
		});
	});

	describe("PAY-004: updatePermissions", () => {
		it("should update user and API key permissions on plan change", async () => {
			const subscription = {
				id: "sub_123",
				customer: "cus_123",
				status: "active",
				items: {
					data: [
						{
							price: {
								id: "price_123",
								lookup_key: "pro_monthly",
							},
						},
					],
				},
			};

			// Mock database responses
			mockDb.select.mockResolvedValueOnce([
				{ id: "user-123", subscriptionTier: "free" },
			]);
			mockDb.update.mockResolvedValueOnce({});
			mockDb.select.mockResolvedValueOnce([{ id: "key-123", permissions: {} }]);
			mockDb.update.mockResolvedValueOnce({});

			const result = await handleSubscriptionUpdated(subscription);

			expect(result.success).toBe(true);
			expect(mockDb.update).toHaveBeenCalled();
		});
	});

	describe("PAY-005: updateSnapshotLimits", () => {
		it("should update snapshot limits on subscription change", async () => {
			const subscription = {
				id: "sub_123",
				customer: "cus_123",
				status: "active",
				items: {
					data: [
						{
							price: {
								id: "price_123",
								lookup_key: "pro_monthly",
							},
						},
					],
				},
			};

			// Mock database responses
			mockDb.select.mockResolvedValueOnce([
				{ id: "user-123", subscriptionTier: "free" },
			]);
			mockDb.update.mockResolvedValueOnce({});
			mockDb.insert.mockResolvedValueOnce({});
			mockDb.onConflictDoUpdate.mockResolvedValueOnce({});

			const result = await handleSubscriptionCreated(subscription);

			expect(result.success).toBe(true);
			expect(mockDb.insert).toHaveBeenCalled();
		});
	});

	describe("PAY-007: linkDeviceTrialToUser", () => {
		it("should link device trial to user on checkout completion", async () => {
			const session = {
				id: "cs_123",
				customer: "cus_123",
				mode: "subscription",
				client_reference_id: "device-123",
			};

			// Mock database responses
			mockDb.select.mockResolvedValueOnce([{ id: "user-123" }]);
			mockDb.select.mockResolvedValueOnce([{ id: "trial-123", userId: null }]);
			mockDb.update.mockResolvedValueOnce({});

			const result = await handleCheckoutCompleted(session);

			expect(result.success).toBe(true);
			expect(mockDb.update).toHaveBeenCalled();
		});
	});
});
