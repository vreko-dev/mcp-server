import { db, snapbackSchema } from "@snapback/platform";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Snapshot API Integration Tests
 *
 * Tests the POST /api/v1/snapshot endpoint
 * Usage tracking, quota enforcement, and trial progression
 */

describe("POST /api/v1/snapshot", () => {
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

	describe("Snapshot Creation", () => {
		it("should create snapshot with API key authentication", async () => {
			// Setup: Create trial and API key
			const deviceFingerprint = `test_device_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			// Test: Create snapshot
			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Test Snapshot",
					files: [{ path: "/test/file.ts", content: "test content" }],
					metadata: { branch: "main", commit: "abc123" },
				}),
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toMatchObject({
				createdAt: expect.any(String),
				quotaRemaining: {
					snapshots: 49, // 50 - 1
					apiCalls: 9999, // 10000 - 1,
				},
			});
		});

		it("should increment usage counters", async () => {
			if (!db) {
				throw new Error("Database not available");
			}

			// Setup trial
			const deviceFingerprint = `test_device_usage_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey, trialId } = await trialResponse.json();

			// Create snapshot
			await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Usage Test",
					files: [{ path: "/test.ts", content: "test" }],
				}),
			});

			// Verify usage incremented in database
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(snapbackSchema.deviceTrials.id, trialId),
			});

			expect(trial?.snapshotsUsed).toBe(1);
			expect(trial?.apiCallsUsed).toBe(1);
		});

		it("should store snapshot data correctly", async () => {
			if (!db) {
				throw new Error("Database not available");
			}

			const deviceFingerprint = `test_device_storage_${Date.now()}`;
			const trialResponse = await fetch(
				"http://localhost:3000/api/v1/device-trial",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceFingerprint }),
				},
			);

			const { apiKey } = await trialResponse.json();

			const snapshotData = {
				name: "Storage Test Snapshot",
				files: [
					{ path: "/src/index.ts", content: "console.log('test');" },
					{
						path: "/src/utils.ts",
						content: "export const util = () => {}",
					},
				],
				metadata: {
					branch: "feature/test",
					commit: "abc123def456",
					message: "Test snapshot",
				},
			};

			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(snapshotData),
			});

			const { snapshotId } = await response.json();

			// Verify snapshot stored correctly (will need to query snapshots table)
			expect(snapshotId).toBeDefined();
		});
	});

	describe("Quota Enforcement", () => {
		it("should reject snapshot creation when snapshot limit reached", async () => {
			if (!db) {
				throw new Error("Database not available");
			}

			const deviceFingerprint = `test_device_limit_${Date.now()}`;

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

			// Manually set usage to limit
			if (!db) {
				throw new Error("Database not available");
			}
			await db
				.update(snapbackSchema.deviceTrials)
				.set({ snapshotsUsed: 50 })
				.where(eq(snapbackSchema.deviceTrials.id, trialId));

			// Attempt to create snapshot
			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Limit Test",
					files: [{ path: "/test.ts", content: "test" }],
				}),
			});

			expect(response.status).toBe(402); // Payment Required
			const data = await response.json();
			expect(data.error).toBe("Snapshot limit reached");

			// Verify usage unchanged
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(snapbackSchema.deviceTrials.id, trialId),
			});

			expect(trial?.snapshotsUsed).toBe(50);
		});

		it("should reject snapshot creation when API call limit reached", async () => {
			if (!db) {
				throw new Error("Database not available");
			}

			const deviceFingerprint = `test_device_api_limit_${Date.now()}`;

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

			// Manually set API call usage to limit
			if (!db) {
				throw new Error("Database not available");
			}
			await db
				.update(snapbackSchema.deviceTrials)
				.set({ apiCallsUsed: 10000 })
				.where(eq(snapbackSchema.deviceTrials.id, trialId));

			// Attempt to create snapshot
			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "API Limit Test",
					files: [{ path: "/test.ts", content: "test" }],
				}),
			});

			expect(response.status).toBe(402); // Payment Required
			const data = await response.json();
			expect(data.error).toBe("API call limit reached");

			// Verify usage unchanged
			if (!db) {
				throw new Error("Database not available");
			}
			const trial = await db.query.snapbackSchema.deviceTrials.findFirst({
				where: eq(snapbackSchema.deviceTrials.id, trialId),
			});

			expect(trial?.apiCallsUsed).toBe(10000);
		});
	});

	describe("Validation", () => {
		it("should reject requests without name", async () => {
			const deviceFingerprint = `test_device_no_name_${Date.now()}`;

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

			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					// Missing name
					files: [{ path: "/test.ts", content: "test" }],
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("name");
		});

		it("should reject requests without files", async () => {
			const deviceFingerprint = `test_device_no_files_${Date.now()}`;

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

			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Test Snapshot",
					// Missing files
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("files");
		});

		it("should reject requests with empty files array", async () => {
			const deviceFingerprint = `test_device_empty_files_${Date.now()}`;

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

			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Test Snapshot",
					files: [], // Empty array
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
			expect(data.details).toContain("files");
		});

		it("should reject requests with files missing path or content", async () => {
			const deviceFingerprint = `test_device_invalid_files_${Date.now()}`;

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

			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Test Snapshot",
					files: [
						{
							// Missing path and content
						},
					],
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Validation error");
		});
	});

	describe("Response Format", () => {
		it("should return all required fields with correct types", async () => {
			const deviceFingerprint = `test_device_response_${Date.now()}`;

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

			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Response Format Test",
					files: [{ path: "/test.ts", content: "test content" }],
					metadata: {
						branch: "main",
						commit: "abc123",
					},
				}),
			});

			const data = await response.json();

			// Verify all required fields present
			expect(data).toHaveProperty("snapshotId");
			expect(data).toHaveProperty("createdAt");
			expect(data).toHaveProperty("quotaRemaining");
			expect(data).toHaveProperty("usageIncremented");

			// Verify data types
			expect(typeof data.snapshotId).toBe("string");
			expect(typeof data.createdAt).toBe("string");
			expect(typeof data.usageIncremented).toBe("boolean");
			expect(data.quotaRemaining).toMatchObject({
				snapshots: expect.any(Number),
				apiCalls: expect.any(Number),
			});
		});

		it("should not expose sensitive internal fields", async () => {
			const deviceFingerprint = `test_device_sensitive_${Date.now()}`;

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

			const response = await fetch("http://localhost:3000/api/v1/snapshot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					name: "Sensitive Test",
					files: [{ path: "/test.ts", content: "test" }],
				}),
			});

			const data = await response.json();

			// Should NOT include internal database IDs or trial data
			expect(data).not.toHaveProperty("trialId");
			expect(data).not.toHaveProperty("apiKeyId");
			expect(data).not.toHaveProperty("userId");
		});
	});
});
