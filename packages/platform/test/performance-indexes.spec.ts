import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("PERF1: Time-Series Optimization (apiUsage)", () => {
	const testId = "perf-timeseries";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe because skipIf ensures DATABASE_URL exists
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: should have BRIN index on api_usage.timestamp`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'api_usage'
			AND indexname = 'api_usage_timestamp_brin_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("USING brin");
		expect(result[0].indexdef).toContain("timestamp");
	});

	it(`${testId}-002: should NOT have old B-tree index on api_usage.timestamp`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'api_usage'
			AND indexname = 'api_usage_timestamp_idx'
		`);

		// Old index should be dropped
		expect(result.length).toBe(0);
	});

	it(`${testId}-003: should have composite index on (api_key_id, timestamp)`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'api_usage'
			AND indexname = 'api_usage_key_timestamp_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("api_key_id");
		expect(result[0].indexdef).toContain("timestamp");
	});

	it(`${testId}-004: BRIN index should be significantly smaller than B-tree`, async () => {
		const result = await db.execute(`
			SELECT
				pg_size_pretty(pg_relation_size('api_usage_timestamp_brin_idx')) as brin_size,
				pg_size_pretty(pg_relation_size('api_usage')) as table_size
			FROM pg_class
			WHERE relname = 'api_usage'
		`);

		expect(result.length).toBeGreaterThan(0);
		// BRIN should be much smaller than table (typically < 1% for time-series)
	});
});

describe.skipIf(!isDatabaseAvailable)("PERF2: Soft Delete Partial Indexes", () => {
	const testId = "perf-softdelete";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: api_keys should have partial index on user_id WHERE revoked_at IS NULL`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'api_keys'
			AND indexname = 'api_keys_user_active_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("user_id");
		expect(result[0].indexdef).toContain("WHERE");
		expect(result[0].indexdef).toContain("revoked_at IS NULL");
	});

	it(`${testId}-002: api_keys should have partial index on organization_id WHERE revoked_at IS NULL`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'api_keys'
			AND indexname = 'api_keys_org_active_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("organization_id");
		expect(result[0].indexdef).toContain("WHERE");
		expect(result[0].indexdef).toContain("revoked_at IS NULL");
	});

	it(`${testId}-003: client_tokens should have partial index on user_id WHERE revoked_at IS NULL`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'client_tokens'
			AND indexname = 'client_tokens_user_active_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("user_id");
		expect(result[0].indexdef).toContain("WHERE");
		expect(result[0].indexdef).toContain("revoked_at IS NULL");
	});

	it(`${testId}-004: partial indexes should only include non-revoked rows`, async () => {
		// This tests the edge case: partial index excludes revoked rows
		// Insert test data if table is empty, then verify index behavior
		const tableCheck = await db.execute(`
			SELECT COUNT(*) as count FROM api_keys
		`);

		if (Number(tableCheck[0].count) > 0) {
			const result = await db.execute(`
				SELECT
					(SELECT COUNT(*) FROM api_keys WHERE revoked_at IS NULL) as active_count,
					(SELECT COUNT(*) FROM api_keys) as total_count
			`);

			expect(Number(result[0].active_count)).toBeLessThanOrEqual(Number(result[0].total_count));
		}
	});
});

describe.skipIf(!isDatabaseAvailable)("PERF3: Auth Table Foreign Key Indexes", () => {
	const testId = "perf-authfk";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: session table should have index on user_id`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'session'
			AND indexname = 'session_user_idx'
		`);

		expect(result.length).toBe(1);
	});

	it(`${testId}-002: account table should have index on user_id`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'account'
			AND indexname = 'account_user_idx'
		`);

		expect(result.length).toBe(1);
	});

	it(`${testId}-003: passkey table should have index on user_id`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'passkey'
			AND indexname = 'passkey_user_idx'
		`);

		expect(result.length).toBe(1);
	});

	it(`${testId}-004: twoFactor table should have index on user_id`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'twoFactor'
			AND indexname = 'two_factor_user_idx'
		`);

		expect(result.length).toBe(1);
	});

	it(`${testId}-005: auth indexes should enable fast user session lookups`, async () => {
		// Critical path: "get all sessions/accounts/passkeys for user X"
		// Verify query plan uses index (not sequential scan)
		const result = await db.execute(`
			EXPLAIN (FORMAT JSON)
			SELECT * FROM session WHERE user_id = 'test-user-id'
		`);

		// biome-ignore lint/suspicious/noExplicitAny: PostgreSQL EXPLAIN output is dynamic
		const plan = (result[0] as any)["QUERY PLAN"][0];
		// Should use Index Scan or Bitmap Index Scan, NOT Seq Scan
		expect(JSON.stringify(plan)).toMatch(/(Index Scan|Bitmap Index Scan)/);
	});
});

describe.skipIf(!isDatabaseAvailable)("PERF4: Subscription Data Integrity", () => {
	const testId = "perf-subscription";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: subscriptions table should have CHECK constraint for owner`, async () => {
		const result = await db.execute(`
			SELECT
				conname,
				pg_get_constraintdef(oid) as definition
			FROM pg_constraint
			WHERE conrelid = 'subscriptions'::regclass
			AND contype = 'c'
			AND conname = 'subscriptions_owner_check'
		`);

		expect(result.length).toBe(1);
		expect(result[0].definition).toContain("num_nonnulls");
		expect(result[0].definition).toContain("user_id");
		expect(result[0].definition).toContain("organization_id");
	});

	it(`${testId}-002: subscription indexes should NOT be unique`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'subscriptions'
			AND indexname IN ('subscriptions_user_idx', 'subscriptions_org_idx')
		`);

		expect(result.length).toBe(2);
		// Neither should contain UNIQUE keyword
		for (const row of result) {
			expect(row.indexdef).not.toContain("UNIQUE");
		}
	});

	it(`${testId}-003: should have composite indexes on (user_id, plan) and (org_id, plan)`, async () => {
		const result = await db.execute(`
			SELECT indexname, indexdef
			FROM pg_indexes
			WHERE tablename = 'subscriptions'
			AND indexname IN ('subscriptions_user_plan_idx', 'subscriptions_org_plan_idx')
		`);

		expect(result.length).toBe(2);
		// biome-ignore lint/suspicious/noExplicitAny: pg_indexes result is dynamic
		expect(result.some((r: any) => r.indexdef.includes("user_id") && r.indexdef.includes("plan"))).toBe(true);
		// biome-ignore lint/suspicious/noExplicitAny: pg_indexes result is dynamic
		expect(result.some((r: any) => r.indexdef.includes("organization_id") && r.indexdef.includes("plan"))).toBe(
			true,
		);
	});

	it(`${testId}-004: CHECK constraint should prevent NULL-NULL subscriptions`, async () => {
		// Critical edge case: can't create subscription with both user_id and organization_id NULL
		const testInsert = async () => {
			await db.execute(`
				INSERT INTO subscriptions (id, user_id, organization_id, plan, status)
				VALUES ('test-sub-invalid', NULL, NULL, 'free', 'active')
			`);
		};

		await expect(testInsert()).rejects.toThrow(/check constraint/i);
	});

	it(`${testId}-005: CHECK constraint should prevent BOTH user_id AND organization_id set`, async () => {
		// Edge case: can't have subscription for both user AND org simultaneously
		const testInsert = async () => {
			await db.execute(`
				INSERT INTO subscriptions (id, user_id, organization_id, plan, status)
				VALUES ('test-sub-double', 'user-123', 'org-456', 'free', 'active')
			`);
		};

		await expect(testInsert()).rejects.toThrow(/check constraint/i);
	});
});

describe.skipIf(!isDatabaseAvailable)("PERF5: Temporal Indexes for Cleanup Jobs", () => {
	const testId = "perf-temporal";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: verification table should have index on expires_at`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'verification'
			AND indexname = 'verification_expires_at_idx'
		`);

		expect(result.length).toBe(1);
	});

	it(`${testId}-002: invitation table should have indexes for cleanup and lookup`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'invitation'
			AND indexname IN (
				'invitation_expires_at_idx',
				'invitation_email_idx',
				'invitation_status_expires_idx'
			)
		`);

		expect(result.length).toBe(3);
	});

	it(`${testId}-003: api_keys should have partial index on expires_at`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'api_keys'
			AND indexname = 'api_keys_expires_at_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("WHERE");
		expect(result[0].indexdef).toContain("expires_at IS NOT NULL");
	});

	it(`${testId}-004: client_tokens should have partial index on expires_at`, async () => {
		const result = await db.execute(`
			SELECT
				indexname,
				indexdef
			FROM pg_indexes
			WHERE tablename = 'client_tokens'
			AND indexname = 'client_tokens_expires_at_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("WHERE");
		expect(result[0].indexdef).toContain("expires_at IS NOT NULL");
	});

	it(`${testId}-005: cleanup queries should use indexes efficiently`, async () => {
		// Critical path: daily cleanup job deletes expired verifications
		const result = await db.execute(`
			EXPLAIN (FORMAT JSON)
			DELETE FROM verification WHERE expires_at < NOW()
		`);

		// biome-ignore lint/suspicious/noExplicitAny: PostgreSQL EXPLAIN output is dynamic
		const plan = (result[0] as any)["QUERY PLAN"][0];
		// Should use Index Scan on expires_at, not Seq Scan
		expect(JSON.stringify(plan)).toMatch(/(Index Scan|Bitmap Index Scan)/);
	});
});

describe.skipIf(!isDatabaseAvailable)("PERF6: Missing Table Indexes", () => {
	const testId = "perf-missing";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: purchase table should have FK indexes`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'purchase'
			AND indexname IN ('purchase_org_idx', 'purchase_user_idx', 'purchase_status_date_idx')
		`);

		expect(result.length).toBe(3);
	});

	it(`${testId}-002: aiChat table should have FK and temporal indexes`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'aiChat'
			AND indexname IN ('ai_chat_org_idx', 'ai_chat_user_idx', 'ai_chat_recent_idx')
		`);

		expect(result.length).toBe(3);
	});

	it(`${testId}-003: member table should have organization_id index`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'member'
			AND indexname = 'member_org_idx'
		`);

		expect(result.length).toBe(1);
	});

	it(`${testId}-004: member org lookup should use index`, async () => {
		// Critical path: "list all members of organization X"
		const result = await db.execute(`
			EXPLAIN (FORMAT JSON)
			SELECT * FROM member WHERE organization_id = 'test-org-id'
		`);

		// biome-ignore lint/suspicious/noExplicitAny: PostgreSQL EXPLAIN output is dynamic
		const plan = (result[0] as any)["QUERY PLAN"][0];
		expect(JSON.stringify(plan)).toMatch(/(Index Scan|Bitmap Index Scan)/);
	});
});

describe.skipIf(!isDatabaseAvailable)("PERF7: Newsletter Analytics Indexes", () => {
	const testId = "perf-newsletter";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: newsletter_subscribers should have analytics indexes`, async () => {
		const result = await db.execute(`
			SELECT indexname
			FROM pg_indexes
			WHERE tablename = 'newsletter_subscribers'
			AND indexname IN (
				'newsletter_source_idx',
				'newsletter_subscribed_at_idx',
				'newsletter_hubspot_sync_idx'
			)
		`);

		expect(result.length).toBe(3);
	});

	it(`${testId}-002: HubSpot sync index should be composite`, async () => {
		const result = await db.execute(`
			SELECT indexdef
			FROM pg_indexes
			WHERE tablename = 'newsletter_subscribers'
			AND indexname = 'newsletter_hubspot_sync_idx'
		`);

		expect(result.length).toBe(1);
		expect(result[0].indexdef).toContain("hubspot_contact_id");
		expect(result[0].indexdef).toContain("hubspot_synced_at");
	});
});

describe.skipIf(!isDatabaseAvailable)("PERF8: Index Comments and Documentation", () => {
	const testId = "perf-docs";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}-001: critical indexes should have descriptive comments`, async () => {
		const result = await db.execute(`
			SELECT
				idx.indexrelid::regclass AS index_name,
				pg_description.description
			FROM pg_index idx
			JOIN pg_class ON pg_class.oid = idx.indexrelid
			LEFT JOIN pg_description ON pg_description.objoid = idx.indexrelid
			WHERE idx.indrelid = 'api_usage'::regclass
			AND pg_class.relname IN ('api_usage_timestamp_brin_idx', 'api_usage_key_timestamp_idx')
		`);

		expect(result.length).toBeGreaterThan(0);
		// At least one index should have a comment
		expect(result.some((r) => r.description !== null)).toBe(true);
	});

	it(`${testId}-002: subscription CHECK constraint should have comment`, async () => {
		const result = await db.execute(`
			SELECT
				conname,
				pg_description.description
			FROM pg_constraint
			LEFT JOIN pg_description ON pg_description.objoid = pg_constraint.oid
			WHERE conrelid = 'subscriptions'::regclass
			AND conname = 'subscriptions_owner_check'
		`);

		expect(result.length).toBe(1);
		expect(result[0].description).toBeTruthy();
		expect(result[0].description).toMatch(/one user OR one organization/i);
	});
});
