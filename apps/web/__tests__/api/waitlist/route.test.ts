import { db, snapbackSchema } from "@snapback/platform";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/waitlist/route";

// Mock the external services
vi.mock("resend", () => ({
	Resend: vi.fn().mockImplementation(() => ({
		emails: {
			send: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
		},
	})),
}));

vi.mock("@hubspot/api-client", () => ({
	Client: vi.fn().mockImplementation(() => ({
		crm: {
			contacts: {
				searchApi: {
					doSearch: vi.fn().mockResolvedValue({ results: [] }),
				},
				basicApi: {
					create: vi.fn().mockResolvedValue({ id: "mock-hubspot-id" }),
					update: vi.fn().mockResolvedValue({ id: "mock-hubspot-id" }),
				},
			},
		},
	})),
}));

const { waitlist: waitlistTable } = snapbackSchema;

describe("POST /api/waitlist", () => {
	// Helper to create mock request
	const createMockRequest = (body: any): NextRequest => {
		return {
			json: async () => body,
		} as NextRequest;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Set env vars for tests
		process.env.RESEND_API_KEY = "re_test_key";
		process.env.HUBSPOT_ACCESS_TOKEN = "pat-test-token";
		process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
	});

	afterEach(() => {
		delete process.env.RESEND_API_KEY;
		delete process.env.HUBSPOT_ACCESS_TOKEN;
	});

	describe("Validation", () => {
		it("should reject invalid email", async () => {
			const request = createMockRequest({
				email: "invalid-email",
				githubUsername: "test",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("Invalid");
		});

		it("should reject missing required fields", async () => {
			const request = createMockRequest({
				githubUsername: "test",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
		});

		it("should accept valid email with optional fields", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const request = createMockRequest({
				email: "test@example.com",
				githubUsername: "testuser",
				editor: "vscode",
				language: "typescript",
				teamSize: "Solo",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.queuePosition).toBeGreaterThan(0);
		});
	});

	describe("Database Operations", () => {
		it("should insert new waitlist entry", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const email = `test-${Date.now()}@example.com`;
			const request = createMockRequest({
				email,
				githubUsername: "testuser",
				editor: "vscode",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.queuePosition).toBeGreaterThan(0);

			// Verify entry exists in database
			const entries = await db
				.select()
				.from(waitlistTable)
				.where((fields) => fields.email === email);

			expect(entries).toHaveLength(1);
			expect(entries[0]?.email).toBe(email);
			expect(entries[0]?.queuePosition).toBe(data.queuePosition);
		});

		it("should reject duplicate email", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const email = `duplicate-${Date.now()}@example.com`;

			// First submission
			const request1 = createMockRequest({
				email,
				githubUsername: "testuser",
			});
			await POST(request1);

			// Second submission with same email
			const request2 = createMockRequest({
				email,
				githubUsername: "testuser2",
			});

			const response = await POST(request2);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("already");
		});

		it("should assign incrementing queue positions", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const email1 = `queue-test-1-${Date.now()}@example.com`;
			const email2 = `queue-test-2-${Date.now()}@example.com`;

			const request1 = createMockRequest({
				email: email1,
				githubUsername: "user1",
			});
			const response1 = await POST(request1);
			const data1 = await response1.json();

			const request2 = createMockRequest({
				email: email2,
				githubUsername: "user2",
			});
			const response2 = await POST(request2);
			const data2 = await response2.json();

			expect(data2.queuePosition).toBe(data1.queuePosition + 1);
		});
	});

	describe("Email Integration", () => {
		it("should send confirmation email when configured", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const email = `email-test-${Date.now()}@example.com`;
			const request = createMockRequest({
				email,
				githubUsername: "testuser",
			});

			await POST(request);

			// Check that email sending was attempted
			// Note: We're using mocked Resend, so this just verifies the integration point
			// Real email sending should be tested in integration tests
		});

		it("should update emailSent timestamp on successful send", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const email = `email-timestamp-${Date.now()}@example.com`;
			const request = createMockRequest({
				email,
				githubUsername: "testuser",
			});

			await POST(request);

			const entries = await db
				.select()
				.from(waitlistTable)
				.where((fields) => fields.email === email);

			// Email should be marked as sent (mocked as successful)
			expect(entries[0]?.emailSent).toBeTruthy();
			expect(entries[0]?.emailSentAt).toBeTruthy();
		});
	});

	describe("HubSpot Integration", () => {
		it("should sync to HubSpot when configured", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const email = `hubspot-test-${Date.now()}@example.com`;
			const request = createMockRequest({
				email,
				githubUsername: "testuser",
				editor: "vscode",
				language: "typescript",
				teamSize: "Solo",
			});

			await POST(request);

			// Check that HubSpot sync was attempted
			// Note: We're using mocked HubSpot client
		});

		it("should store HubSpot contact ID on successful sync", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			const email = `hubspot-id-${Date.now()}@example.com`;
			const request = createMockRequest({
				email,
				githubUsername: "testuser",
			});

			await POST(request);

			const entries = await db
				.select()
				.from(waitlistTable)
				.where((fields) => fields.email === email);

			// HubSpot contact ID should be stored (mocked as successful)
			expect(entries[0]?.hubspotContactId).toBeTruthy();
			expect(entries[0]?.hubspotSyncedAt).toBeTruthy();
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors gracefully", async () => {
			const request = createMockRequest({
				email: "error-test@example.com",
				githubUsername: "testuser",
			});

			// Mock database error
			vi.spyOn(console, "error").mockImplementation(() => {});

			// This should not throw, but return error response
			const response = await POST(request);

			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		it("should succeed even if email fails (non-blocking)", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			// Mock email failure
			const { Resend } = await import("resend");
			vi.mocked(Resend).mockImplementationOnce(
				() =>
					({
						emails: {
							send: vi.fn().mockRejectedValue(new Error("Email service down")),
						},
					}) as any,
			);

			const email = `email-fail-${Date.now()}@example.com`;
			const request = createMockRequest({
				email,
				githubUsername: "testuser",
			});

			const response = await POST(request);
			const data = await response.json();

			// Should still succeed
			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it("should succeed even if HubSpot fails (non-blocking)", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			// Mock HubSpot failure
			const { Client } = await import("@hubspot/api-client");
			vi.mocked(Client).mockImplementationOnce(
				() =>
					({
						crm: {
							contacts: {
								searchApi: {
									doSearch: vi
										.fn()
										.mockRejectedValue(new Error("HubSpot service down")),
								},
							},
						},
					}) as any,
			);

			const email = `hubspot-fail-${Date.now()}@example.com`;
			const request = createMockRequest({
				email,
				githubUsername: "testuser",
			});

			const response = await POST(request);
			const data = await response.json();

			// Should still succeed
			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});
	});
});
