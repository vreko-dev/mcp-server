import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

import { KeysDb } from "../src/db/adapters/KeysDb";
import * as schema from "../src/db/schema/snapback/index";

describe.skipIf(!isDatabaseAvailable)("AD3: KeysDb implementation", () => {
	const testId1 = "keysad-001";
	const testId2 = "keysad-002";

	let client: ReturnType<typeof postgres>;
	let db: any;
	let keysDb: KeysDb;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe because skipIf ensures DATABASE_URL exists
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client, { schema });
		keysDb = new KeysDb(db);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId1}: should rotate key and return new key`, async () => {
		// Create an initial key
		const userId = "user-001";
		const keyName = "Test Key";
		const permissions = ["read", "write"];

		const originalKeyId = await keysDb.createKey(userId, keyName, permissions);

		// Verify the original key exists and is valid
		const originalKey = await keysDb.getKey(originalKeyId);
		expect(originalKey).not.toBeNull();
		expect(originalKey?.id).toBe(originalKeyId);
		expect(originalKey?.userId).toBe(userId);
		expect(originalKey?.name).toBe(keyName);
		expect(originalKey?.permissions).toEqual(permissions);
		expect(originalKey?.revoked).toBe(false);

		// Rotate the key
		const newKeyId = await keysDb.rotateKey(originalKeyId);

		// Verify the new key exists
		const newKey = await keysDb.getKey(newKeyId);
		expect(newKey).not.toBeNull();
		expect(newKey?.id).toBe(newKeyId);
		expect(newKey?.userId).toBe(userId);
		expect(newKey?.name).toBe(keyName);
		expect(newKey?.permissions).toEqual(permissions);
		expect(newKey?.revoked).toBe(false);

		// Verify the original key is now revoked
		const revokedOriginalKey = await keysDb.getKey(originalKeyId);
		expect(revokedOriginalKey).not.toBeNull();
		expect(revokedOriginalKey?.revoked).toBe(true);

		// Verify the new key is different from the original
		expect(newKeyId).not.toBe(originalKeyId);
	});

	it(`${testId2}: should revoke key and block usage; record usage rows`, async () => {
		// Create a key
		const userId = "user-002";
		const keyId = await keysDb.createKey(userId);

		// Verify key is initially valid
		let isValid = await keysDb.isKeyValid(keyId);
		expect(isValid).toBe(true);

		// Record some usage
		await keysDb.recordUsage(keyId, "/api/test1");
		await keysDb.recordUsage(keyId, "/api/test1"); // Record twice for same endpoint
		await keysDb.recordUsage(keyId, "/api/test2");

		// Verify usage was recorded
		const usageResult = await client`
			SELECT api_key_id, endpoint, request_count
			FROM api_key_usage
			WHERE api_key_id = ${keyId}
			ORDER BY endpoint
		`;

		expect(usageResult).toHaveLength(2);
		expect(usageResult[0].endpoint).toBe("/api/test1");
		expect(usageResult[0].request_count).toBe(2);
		expect(usageResult[1].endpoint).toBe("/api/test2");
		expect(usageResult[1].request_count).toBe(1);

		// Verify last used timestamp was updated
		const keyAfterUsage = await keysDb.getKey(keyId);
		expect(keyAfterUsage?.lastUsedAt).toBeDefined();

		// Revoke the key
		await keysDb.revokeKey(keyId);

		// Verify key is no longer valid
		isValid = await keysDb.isKeyValid(keyId);
		expect(isValid).toBe(false);
	});
});
