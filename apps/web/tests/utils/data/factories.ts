import * as crypto from "node:crypto";

// User factory
export interface User {
	id: string;
	email: string;
	name: string;
	password: string;
	role: "admin" | "user" | "newUser";
	createdAt: Date;
}

export function createUser(overrides: Partial<User> = {}): User {
	const id = overrides.id || crypto.randomUUID();
	const timestamp = new Date();

	return {
		id,
		email: overrides.email || `test-${id.substring(0, 8)}@example.com`,
		name: overrides.name || `Test User ${id.substring(0, 4)}`,
		password: overrides.password || "Test123!@#",
		role: overrides.role || "user",
		createdAt: overrides.createdAt || timestamp,
	};
}

// API Key factory
export interface ApiKey {
	id: string;
	key: string;
	name: string;
	permissions: string[];
	createdAt: Date;
	expiresAt: Date;
}

export function createApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
	const id = overrides.id || crypto.randomUUID();
	const timestamp = new Date();

	return {
		id,
		key:
			overrides.key ||
			`sk_test_${crypto.randomBytes(32).toString("hex").substring(0, 32)}`,
		name: overrides.name || `Test API Key ${id.substring(0, 4)}`,
		permissions: overrides.permissions || ["read", "write"],
		createdAt: overrides.createdAt || timestamp,
		expiresAt:
			overrides.expiresAt ||
			new Date(timestamp.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
	};
}

// Organization factory
export interface Organization {
	id: string;
	name: string;
	slug: string;
	createdAt: Date;
}

export function createOrganization(
	overrides: Partial<Organization> = {},
): Organization {
	const id = overrides.id || crypto.randomUUID();
	const timestamp = new Date();

	return {
		id,
		name: overrides.name || `Test Organization ${id.substring(0, 4)}`,
		slug: overrides.slug || `test-org-${id.substring(0, 8)}`,
		createdAt: overrides.createdAt || timestamp,
	};
}

// Checkpoint factory
export interface Checkpoint {
	id: string;
	name: string;
	description: string;
	createdAt: Date;
	deviceId: string;
}

export function createCheckpoint(
	overrides: Partial<Checkpoint> = {},
): Checkpoint {
	const id = overrides.id || crypto.randomUUID();
	const timestamp = new Date();

	return {
		id,
		name: overrides.name || `Test Checkpoint ${id.substring(0, 4)}`,
		description: overrides.description || "Test checkpoint description",
		createdAt: overrides.createdAt || timestamp,
		deviceId: overrides.deviceId || crypto.randomUUID(),
	};
}

// Device factory
export interface Device {
	id: string;
	name: string;
	type: "desktop" | "laptop" | "server" | "mobile";
	createdAt: Date;
}

export function createDevice(overrides: Partial<Device> = {}): Device {
	const id = overrides.id || crypto.randomUUID();
	const timestamp = new Date();

	return {
		id,
		name: overrides.name || `Test Device ${id.substring(0, 4)}`,
		type: overrides.type || "desktop",
		createdAt: overrides.createdAt || timestamp,
	};
}
