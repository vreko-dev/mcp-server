import { db, snapbackSchema } from "@snapback/platform";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Link Device API Integration Tests
 *
 * Tests the POST /api/v1/auth/link-device endpoint
 * Progressive authentication: device trial → email signup conversion
 */

describe("POST /api/v1/auth/link-device", () => {
	// Clean up test data
	beforeEach(async () => {
		if (!db) {
			throw new Error("Database not available");
		}
		await db.execute(
			sql`DELETE FROM device_trials WHERE device_fingerprint LIKE 'test_%'`,
		);
		await db.execute(
			sql`DELETE FROM api_keys WHERE key_preview LIKE 'snap_test%'`,
		);
		await db.execute(
			sql`DELETE FROM snapbackSchema.user WHERE email LIKE 'test_%'`,
		);
	});

	afterAll(async () => {
		// Final cleanup
		if (!db) {
			throw new Error("Database not available");
		}
		await db.execute(
			sql`DELETE FROM device_trials WHERE device_fingerprint LIKE 'test_%'`,
		);
		await db.execute(
			sql`DELETE FROM api_keys WHERE key_preview LIKE 'snap_test%'`,
		);
		await db.execute(
			sql`DELETE FROM snapbackSchema.user WHERE email LIKE 'test_%'`,
		);
	});

	describe("Trial Conversion", () => {
		it("should convert device trial to snapbackSchema.user account", async () => {
			// Setup: Create device trial
			const deviceFingerprint = `test_device_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey, trialId } = await trialResponse.json();

			// Test: Link device with email signup
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: `test_user_${Date.now()}@example.com`,
						password: "SecurePassword123!",
						name: "Test User",
					}),
				},
			);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toMatchObject({
				email: expect.stringContaining("test_user_"),
				upgradedLimits: {
					snapshots: 1000, // Upgraded from 50
					apiCalls: 10000, // Same as before,
				},
				trialConverted: true,
			});

			// Verify trial linked to snapbackSchema.user in database
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(snapbackSchema.deviceTrials.id, trialId),
			});

			expect(trial).toBeDefined();
			expect(trial?.userId).toBe(data.userId);
			expect(trial?.snapshotLimit).toBe(1000);
			expect(trial?.userId).toBeDefined();
		});

		it("should preserve existing usage when converting", async () => {
			// Setup: Create trial and use some quota
			const deviceFingerprint = `test_device_preserve_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey, trialId } = await trialResponse.json();

			// Simulate snapshot creation (usage: 5 snapshots, 100 API calls)
			if (!db) {
				throw new Error("Database not available");
			}
			await db
				.update(snapbackSchema.deviceTrials)
				.set({ snapshotsUsed: 5, apiCallsUsed: 100 })
				.where(eq(snapbackSchema.deviceTrials.id, trialId));

			// Convert trial to snapbackSchema.user
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: `test_preserve_${Date.now()}@example.com`,
						password: "SecurePassword123!",
					}),
				},
			);

			const data = await response.json();

			// Verify usage preserved
			expect(data.currentUsage).toMatchObject({
				snapshots: 5,
				apiCalls: 100,
			});

			// Verify in database
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(snapbackSchema.deviceTrials.id, trialId),
			});

			expect(trial?.snapshotsUsed).toBe(5);
			expect(trial?.apiCallsUsed).toBe(100);
			expect(trial?.snapshotLimit).toBe(1000); // Upgraded limit
		});

		it("should create new snapbackSchema.user when linking device", async () => {
			const deviceFingerprint = `test_device_new_user_${Date.now()}`;
			const email = `test_new_${Date.now()}@example.com`;

			// Create trial
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			// Link device with new snapbackSchema.user
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email,
						password: "SecurePassword123!",
						name: "New Test User",
					}),
				},
			);

			expect(response.status).toBe(200);

			// Verify snapbackSchema.user created in database
			if (!db) {
				throw new Error("Database not available");
			}
			const createdUser = await db.query.snapbackSchema.user.findFirst({
				where: eq(snapbackSchema.user.email, email),
			});

			expect(createdUser).toBeDefined();
			expect(createdUser?.name).toBe("New Test User");
			expect(createdUser?.emailVerified).toBe(false); // Not verified yet
		});

		it("should link to existing snapbackSchema.user when email already exists", async () => {
			const deviceFingerprint = `test_device_existing_${Date.now()}`;
			const email = `test_existing_${Date.now()}@example.com`;

			// Pre-create snapbackSchema.user account
			if (!db) {
				throw new Error("Database not available");
			}
			const [existingUser] = await db
				.insert(snapbackSchema.user)
				.values({
					id: `test_user_${Date.now()}`,
					email,
					name: "Existing User",
					emailVerified: true,
				})
				.returning();

			// Create trial
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey, trialId } = await trialResponse.json();

			// Link device to existing snapbackSchema.user (via password verification)
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email,
						password: "ExistingPassword123!", // Would verify against stored hash
					}),
				},
			);

			const data = await response.json();

			// Should link to existing snapbackSchema.user, not create new one
			expect(data.userId).toBe(existingUser.id);

			// Verify trial linked
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(snapbackSchema.deviceTrials.id, trialId),
			});

			expect(trial?.userId).toBe(existingUser.id);
		});
	});

	describe("Duplicate Prevention", () => {
		it("should prevent linking device to multiple accounts", async () => {
			const deviceFingerprint = `test_device_duplicate_${Date.now()}`;

			// Create trial and link to first snapbackSchema.user
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey, trialId } = await trialResponse.json();

			// Link to first snapbackSchema.user
			await fetch("http://localhost:3000/api/v1/auth/link-device", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					email: `test_first_${Date.now()}@example.com`,
					password: "Password123!",
				}),
			});

			// Attempt to link same device to second snapbackSchema.user
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: `test_second_${Date.now()}@example.com`,
						password: "Password123!",
					}),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();

			expect(data.error).toBe("Device already linked");
			expect(data.details).toContain("already associated with another account");
		});

		it("should allow re-linking same device to same snapbackSchema.user", async () => {
			const deviceFingerprint = `test_device_relink_${Date.now()}`;
			const email = `test_relink_${Date.now()}@example.com`;

			// Create trial and link
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			// First link
			await fetch("http://localhost:3000/api/v1/auth/link-device", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					email,
					password: "Password123!",
				}),
			});

			// Re-link same device to same snapbackSchema.user (idempotent)
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email,
						password: "Password123!",
					}),
				},
			);

			expect(response.status).toBe(200); // Should succeed
		});
	});

	describe("Authentication", () => {
		it("should reject requests without Authorization header", async () => {
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: "test@example.com",
						password: "Password123!",
					}),
				},
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe("Unauthorized");
		});

		it("should reject requests with invalid API key", async () => {
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer snap_invalid_key",
					},
					body: JSON.stringify({
						email: "test@example.com",
						password: "Password123!",
					}),
				},
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe("Invalid API key");
		});

		it("should reject requests with wrong password for existing snapbackSchema.user", async () => {
			const deviceFingerprint = `test_device_password_${Date.now()}`;
			const email = `test_password_${Date.now()}@example.com`;

			// Pre-create snapbackSchema.user with password
			if (!db) {
				throw new Error("Database not available");
			}
			await db.insert(snapbackSchema.user).values({
				id: `test_user_${Date.now()}`,
				email,
				name: "Password User",
				emailVerified: true,
			});

			// Create trial
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			// Attempt with wrong password
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email,
						password: "WrongPassword123!",
					}),
				},
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe("Invalid credentials");
		});
	});

	describe("Validation", () => {
		it("should reject invalid email addresses", async () => {
			const deviceFingerprint = `test_device_email_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: "not-an-email",
						password: "Password123!",
					}),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("email");
		});

		it("should reject weak passwords", async () => {
			const deviceFingerprint = `test_device_weak_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: `test_weak_${Date.now()}@example.com`,
						password: "weak", // Too short
					}),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("password");
			expect(data).toMatchObject({
				error: "Validation error",
			});
		});

		it("should reject requests without email", async () => {
			const deviceFingerprint = `test_device_no_email_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						password: "Password123!",
					}),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("email");
		});

		it("should reject requests without password", async () => {
			const deviceFingerprint = `test_device_no_password_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: `test_no_password_${Date.now()}@example.com`,
					}),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("password");
		});
	});

	describe("Email Verification", () => {
		it("should require email verification for new users", async () => {
			const deviceFingerprint = `test_device_verify_${Date.now()}`;
			const email = `test_verify_${Date.now()}@example.com`;

			// Create trial
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			// Link device with new snapbackSchema.user
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email,
						password: "Password123!",
					}),
				},
			);

			const data = await response.json();

			expect(data.emailVerificationRequired).toBe(true);
			expect(data.emailVerified).toBe(false);
		});

		it("should skip verification for already verified users", async () => {
			const deviceFingerprint = `test_device_skip_verify_${Date.now()}`;
			const email = `test_skip_verify_${Date.now()}@example.com`;

			// Pre-create verified snapbackSchema.user
			await db.insert(snapbackSchema.user).values({
				id: `test_user_${Date.now()}`,
				email,
				name: "Verified User",
				emailVerified: true,
			});

			// Create trial
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			// Link device
			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email,
						password: "Password123!",
					}),
				},
			);

			const data = await response.json();

			expect(data.emailVerificationRequired).toBe(false);
			expect(data.emailVerified).toBe(true); // No need to send
		});
	});

	describe("Response Format", () => {
		it("should return all required fields with correct types", async () => {
			const deviceFingerprint = `test_device_format_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: `test_format_${Date.now()}@example.com`,
						password: "Password123!",
						name: "Format Test",
					}),
				},
			);

			const data = await response.json();

			// Verify all required fields present
			expect(data).toHaveProperty("userId");
			expect(data).toHaveProperty("email");
			expect(data).toHaveProperty("upgradedLimits");
			expect(data).toHaveProperty("trialConverted");
			expect(data).toHaveProperty("currentUsage");

			// Verify data types
			expect(typeof data.userId).toBe("string");
			expect(typeof data.email).toBe("string");
			expect(typeof data.upgradedLimits.checkpoints).toBe("number");
			expect(typeof data.trialConverted).toBe("boolean");
		});

		it("should not expose sensitive internal fields", async () => {
			const deviceFingerprint = `test_device_sensitive_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			const response = await fetch(
				"http://localhost:3000/api/v1/auth/link-device",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						email: `test_sensitive_${Date.now()}@example.com`,
						password: "Password123!",
					}),
				},
			);

			const data = await response.json();

			// Should NOT include password hash, internal tokens, or raw API keys
			expect(data).not.toHaveProperty("password");
			expect(data).not.toHaveProperty("passwordHash");
			expect(data).not.toHaveProperty("apiKeyHash");
			expect(data).not.toHaveProperty("sessionToken");
		});
	});
});
