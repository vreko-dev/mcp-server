import { db, snapbackSchema } from "@snapback/platform";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Device Trial API Integration Tests
 *
 * Tests the POST /api/v1/device-trial endpoint
 * Progressive authentication: device → email → payment
 */

describe("POST /api/v1/device-trial", () => {
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
	});

	describe("Trial Creation", () => {
		it("should create new device trial with API key", async () => {
			const deviceFingerprint = `test_device_${Date.now()}`;

			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toMatchObject({
				apiKey: expect.stringMatching(/^snap_[a-zA-Z0-9_-]{32}$/),
				apiKeyPreview: expect.stringMatching(/^snap_[a-zA-Z0-9_-]{6}\.\.\.$/),
				snapshotLimit: 50,
				apiCallLimit: 10000,
				snapshotsUsed: 0,
				apiCallsUsed: 0,
				trialStage: "anonymous",
			});

			// Verify trial created in database
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(
					snapbackSchema.deviceTrials.deviceFingerprint,
					deviceFingerprint,
				),
			});

			expect(trial).toBeDefined();
			expect(trial?.snapshotLimit).toBe(50);
			expect(trial?.apiCallLimit).toBe(10000);
			expect(trial?.userId).toBeNull(); // Anonymous trial
		});

		it("should associate API key with trial", async () => {
			const deviceFingerprint = `test_device_apikey_${Date.now()}`;

			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const data = await response.json();
			expect(data.apiKey).toBeDefined();

			// Verify API key exists and is associated with trial
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(
					snapbackSchema.deviceTrials.deviceFingerprint,
					deviceFingerprint,
				),
			});

			const key = await db.query.apiKeys.findFirst({
				where: eq(snapbackSchema.deviceTrials.apiKeyId, trial?.apiKeyId || ""),
			});

			expect(key).toBeDefined();
			expect(key?.keyPreview).toMatch(/^snap_/);
		});

		it("should set correct usage limits", async () => {
			const deviceFingerprint = `test_device_limits_${Date.now()}`;

			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const data = await response.json();

			expect(data.snapshotLimit).toBe(50);
			expect(data.apiCallLimit).toBe(10000);
			expect(data.snapshotsUsed).toBe(0);
			expect(data.apiCallsUsed).toBe(0);
		});
	});

	describe("Duplicate Device Handling", () => {
		it("should return existing trial for duplicate device", async () => {
			const deviceFingerprint = `test_device_duplicate_${Date.now()}`;

			// First request: create trial
			const response1 = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const data1 = await response1.json();

			// Second request: should return existing trial
			const response2 = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			expect(response2.status).toBe(200); // 200 OK, not 201 Created
			const data2 = await response2.json();

			// Should return same trial
			expect(data2.trialId).toBe(data1.trialId);
			expect(data2.apiKey).toBe(data1.apiKey);

			// Verify only one trial exists
			if (!db) {
				throw new Error("Database not available");
			}
			const trials = await db
				.select()
				.from(snapbackSchema.deviceTrials)
				.where(
					eq(snapbackSchema.deviceTrials.deviceFingerprint, deviceFingerprint),
				);

			expect(trials).toHaveLength(1);
		});

		it("should increment install count on reinstall", async () => {
			const deviceFingerprint = `test_device_install_count_${Date.now()}`;

			// First install
			await fetch("http://localhost:3000/api/v1/device-trial", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceFingerprint }),
			});

			// Second install (reinstall)
			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const data = await response.json();
			expect(data.installCount).toBe(2);

			// Verify in database
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(
					snapbackSchema.deviceTrials.deviceFingerprint,
					deviceFingerprint,
				),
			});

			expect(trial?.installCount).toBe(2);
		});
	});

	describe("Abuse Prevention", () => {
		it("should block device after 3 reinstalls", async () => {
			const deviceFingerprint = `test_device_blocked_${Date.now()}`;

			// Create trial with 3 installs
			if (!db) {
				throw new Error("Database not available");
			}
			await db.insert(snapbackSchema.deviceTrials).values({
				deviceFingerprint,
				apiKeyId: "test_key_id",
				installCount: 3,
				createdAt: new Date(),
			});

			// Attempt 4th install
			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			expect(response.status).toBe(429); // Too Many Requests
			const data = await response.json();

			expect(data).toMatchObject({
				blockedUntil: expect.any(String),
			});

			// Verify device is blocked in database
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(
					snapbackSchema.deviceTrials.deviceFingerprint,
					deviceFingerprint,
				),
			});

			expect(trial?.blockedUntil).toBeDefined();
			expect(trial?.blockedUntil?.getTime()).toBeGreaterThan(Date.now());
		});

		it("should reject requests for already blocked devices", async () => {
			const deviceFingerprint = `test_device_already_blocked_${Date.now()}`;
			const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

			// Create pre-blocked trial
			if (!db) {
				throw new Error("Database not available");
			}
			await db.insert(snapbackSchema.deviceTrials).values({
				deviceFingerprint,
				apiKeyId: "test_key_id",
				installCount: 3,
				blockedUntil,
			});

			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			expect(response.status).toBe(403); // Forbidden
			const data = await response.json();

			expect(data.error).toBe("Device blocked");
			expect(new Date(data.blockedUntil).getTime()).toBeGreaterThan(Date.now());
		});

		it("should allow requests for devices with expired blocks", async () => {
			const deviceFingerprint = `test_device_expired_block_${Date.now()}`;
			const expiredBlock = new Date(Date.now() - 1000); // 1 second ago

			// Create trial with expired block
			if (!db) {
				throw new Error("Database not available");
			}
			await db.insert(snapbackSchema.deviceTrials).values({
				deviceFingerprint,
				apiKeyId: "test_key_id",
				installCount: 3,
				blockedUntil: expiredBlock,
			});

			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			expect(response.status).toBe(200); // Should succeed
			const data = await response.json();

			expect(data.trialId).toBeDefined();
			expect(data.apiKey).toBeDefined();
		});
	});

	describe("Validation", () => {
		it("should reject requests without deviceFingerprint", async () => {
			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();

			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("deviceFingerprint");
		});

		it("should reject requests with too short deviceFingerprint", async () => {
			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint: "too-short" }),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();

			expect(data.error).toBe("Validation error");
		});

		it("should reject requests with empty deviceFingerprint", async () => {
			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint: "" }),
				},
			);

			expect(response.status).toBe(400);
		});
	});

	describe("Response Format", () => {
		it("should return all required fields with correct types", async () => {
			const deviceFingerprint = `test_device_response_${Date.now()}`;

			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const data = await response.json();

			// Verify all required fields present
			expect(data).toHaveProperty("trialId");
			expect(data).toHaveProperty("apiKey");
			expect(data).toHaveProperty("apiKeyPreview");
			expect(data).toHaveProperty("snapshotLimit");
			expect(data).toHaveProperty("apiCallLimit");
			expect(data).toHaveProperty("snapshotsUsed");
			expect(data).toHaveProperty("apiCallsUsed");
			expect(data).toHaveProperty("trialStage");
			expect(data).toHaveProperty("createdAt");

			// Verify data types
			expect(typeof data.trialId).toBe("string");
			expect(typeof data.apiKey).toBe("string");
			expect(typeof data.snapshotLimit).toBe("number");
			expect(typeof data.apiCallLimit).toBe("number");
			expect(data.trialStage).toBe("anonymous");
		});

		it("should not expose sensitive internal fields", async () => {
			const deviceFingerprint = `test_device_sensitive_${Date.now()}`;

			const response = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const data = await response.json();

			// Should NOT include internal IDs or hashed keys
			expect(data).not.toHaveProperty("apiKeyId");
			expect(data).not.toHaveProperty("hashedKey");
			expect(data).not.toHaveProperty("userId"); // Null for anonymous, shouldn't be in response
		});
	});
});
