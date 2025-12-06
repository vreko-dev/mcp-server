/**
 * Test Data Factories - IP-Safe Test Data Generation
 *
 * Auto-generates realistic test data using @faker-js/faker.
 * All data is IP-safe and suitable for OSS packages.
 *
 * Following 2025 Test Data Fabric pattern for relational data generation.
 *
 * @example
 * ```typescript
 * import { createTestUser, createTestSnapshot } from "@snapback/testing/fixtures/factories";
 *
 * const user = createTestUser({ tier: "pro" });
 * const snapshot = createTestSnapshot({ userId: user.id });
 * ```
 */

import { faker } from "@faker-js/faker";

/**
 * Create a test user with generic, IP-safe data
 *
 * @param overrides - Override specific fields
 * @returns Test user object
 *
 * @example
 * ```typescript
 * // Default test user
 * const user = createTestUser();
 *
 * // Pro tier user
 * const proUser = createTestUser({ tier: "pro" });
 *
 * // Specific email
 * const user = createTestUser({ email: "test@example.com" });
 * ```
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
	const id = overrides.id ?? `user_${faker.string.alphanumeric(12)}`;

	return {
		id,
		email: overrides.email ?? `test-${faker.string.alphanumeric(8)}@example.com`,
		name: overrides.name ?? faker.person.fullName(),
		tier: overrides.tier ?? "free",
		createdAt: overrides.createdAt ?? new Date(),
		updatedAt: overrides.updatedAt ?? new Date(),
	};
}

/**
 * Create a test API key with generic, IP-safe data
 *
 * @param overrides - Override specific fields
 * @returns Test API key object
 *
 * @example
 * ```typescript
 * const apiKey = createTestApiKey({ userId: "user_123" });
 * const testKey = createTestApiKey({ mode: "test" });
 * ```
 */
export function createTestApiKey(overrides: Partial<TestApiKey> = {}): TestApiKey {
	const mode = overrides.mode ?? "live";
	const prefix = mode === "test" ? "sk_test_" : "sk_live_";

	return {
		id: overrides.id ?? `key_${faker.string.alphanumeric(12)}`,
		userId: overrides.userId ?? `user_${faker.string.alphanumeric(12)}`,
		key: overrides.key ?? `${prefix}${faker.string.alphanumeric(32)}`,
		keyPreview: overrides.keyPreview ?? prefix,
		name: overrides.name ?? "Test API Key",
		mode,
		createdAt: overrides.createdAt ?? new Date(),
		expiresAt: overrides.expiresAt ?? null,
		permissions: overrides.permissions ?? {},
	};
}

/**
 * Create a test snapshot with generic, IP-safe data
 *
 * @param overrides - Override specific fields
 * @returns Test snapshot object
 *
 * @example
 * ```typescript
 * const snapshot = createTestSnapshot();
 * const snapshot = createTestSnapshot({
 *   filePath: "/test/file.ts",
 *   content: "const x = 1;"
 * });
 * ```
 */
export function createTestSnapshot(overrides: Partial<TestSnapshot> = {}): TestSnapshot {
	const filePath = overrides.filePath ?? `/test/${faker.system.fileName()}`;
	const content = overrides.content ?? `// Test file\nconst x = ${faker.number.int()};`;

	return {
		id: overrides.id ?? `snap_${faker.string.alphanumeric(12)}`,
		userId: overrides.userId ?? `user_${faker.string.alphanumeric(12)}`,
		filePath,
		content,
		hash: overrides.hash ?? faker.string.alphanumeric(64),
		timestamp: overrides.timestamp ?? Date.now(),
		metadata: overrides.metadata ?? {},
	};
}

/**
 * Create a test organization with generic, IP-safe data
 *
 * @param overrides - Override specific fields
 * @returns Test organization object
 *
 * @example
 * ```typescript
 * const org = createTestOrganization({ name: "Test Org" });
 * ```
 */
export function createTestOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
	return {
		id: overrides.id ?? `org_${faker.string.alphanumeric(12)}`,
		name: overrides.name ?? `Test Organization ${faker.number.int({ min: 100, max: 999 })}`,
		slug: overrides.slug ?? `test-org-${faker.number.int({ min: 100, max: 999 })}`,
		plan: overrides.plan ?? "team",
		createdAt: overrides.createdAt ?? new Date(),
		members: overrides.members ?? [],
	};
}

/**
 * Create test risk analysis result with generic, IP-safe data
 *
 * NO proprietary scoring algorithms exposed
 *
 * @param overrides - Override specific fields
 * @returns Test risk analysis result
 *
 * @example
 * ```typescript
 * const result = createTestRiskAnalysis({ riskLevel: "high" });
 * ```
 */
export function createTestRiskAnalysis(overrides: Partial<TestRiskAnalysis> = {}): TestRiskAnalysis {
	return {
		id: overrides.id ?? `risk_${faker.string.alphanumeric(12)}`,
		snapshotId: overrides.snapshotId ?? `snap_${faker.string.alphanumeric(12)}`,
		riskLevel: overrides.riskLevel ?? "medium",
		score: overrides.score ?? faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
		factors: overrides.factors ?? ["test-factor-1", "test-factor-2"],
		timestamp: overrides.timestamp ?? Date.now(),
	};
}

// Type Definitions (IP-Safe, Generic)

export interface TestUser {
	id: string;
	email: string;
	name: string;
	tier: "free" | "pro" | "team" | "enterprise";
	createdAt: Date;
	updatedAt: Date;
}

export interface TestApiKey {
	id: string;
	userId: string;
	key: string;
	keyPreview: string;
	name: string;
	mode: "test" | "live";
	createdAt: Date;
	expiresAt: Date | null;
	permissions: Record<string, unknown>;
}

export interface TestSnapshot {
	id: string;
	userId: string;
	filePath: string;
	content: string;
	hash: string;
	timestamp: number;
	metadata: Record<string, unknown>;
}

export interface TestOrganization {
	id: string;
	name: string;
	slug: string;
	plan: string;
	createdAt: Date;
	members: string[];
}

export interface TestRiskAnalysis {
	id: string;
	snapshotId: string;
	riskLevel: "low" | "medium" | "high" | "critical";
	score: number;
	factors: string[];
	timestamp: number;
}

/**
 * Create multiple test entities of the same type
 *
 * @param count - Number of entities to create
 * @param factory - Factory function to use
 * @param overrides - Common overrides for all entities
 * @returns Array of test entities
 *
 * @example
 * ```typescript
 * const users = createMany(5, createTestUser, { tier: "pro" });
 * const snapshots = createMany(10, createTestSnapshot);
 * ```
 */
export function createMany<T>(count: number, factory: (overrides?: Partial<T>) => T, overrides: Partial<T> = {}): T[] {
	return Array.from({ length: count }, () => factory(overrides));
}
