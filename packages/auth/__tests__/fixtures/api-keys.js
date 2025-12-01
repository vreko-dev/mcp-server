import * as crypto from "node:crypto";
/**
 * API Key fixtures for testing API key authentication and security
 */
export const validApiKeys = {
	standard: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Standard API Key",
		permissions: ["read", "write"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
		lastUsedAt: null,
		revokedAt: null,
	},
	readOnly: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Read Only Key",
		permissions: ["read"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: null,
		revokedAt: null,
	},
	admin: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Admin API Key",
		permissions: ["read", "write", "admin", "delete"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: null,
		revokedAt: null,
	},
	production: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_live_${crypto.randomBytes(32).toString("hex")}`,
		name: "Production Key",
		permissions: ["read", "write"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: new Date(),
		revokedAt: null,
		isProduction: true,
	},
};
export const invalidApiKeys = {
	expired: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Expired Key",
		permissions: ["read", "write"],
		createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
		expiresAt: new Date(Date.now() - 1000), // Already expired
		lastUsedAt: null,
		revokedAt: null,
	},
	revoked: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Revoked Key",
		permissions: ["read", "write"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: null,
		revokedAt: new Date(),
	},
	malformed: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: "invalid-key-format",
		name: "Malformed Key",
		permissions: ["read"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: null,
		revokedAt: null,
	},
	noPermissions: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "No Permissions Key",
		permissions: [],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: null,
		revokedAt: null,
	},
};
export const securityTestApiKeys = {
	leakedKey: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Potentially Leaked Key",
		permissions: ["read", "write"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: new Date(),
		revokedAt: null,
		suspiciousActivity: [
			{
				timestamp: new Date(),
				ipAddress: "192.168.1.1",
				action: "read",
			},
			{
				timestamp: new Date(),
				ipAddress: "103.21.244.0", // Different country
				action: "write",
			},
		],
	},
	rateLimitedKey: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Rate Limited Key",
		permissions: ["read", "write"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: new Date(),
		revokedAt: null,
		rateLimit: {
			maxRequests: 100,
			windowMs: 60000, // 1 minute
			currentCount: 95,
		},
	},
	privilegeEscalation: {
		standardKey: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
			name: "Standard Key",
			permissions: ["read"],
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			lastUsedAt: null,
			revokedAt: null,
		},
		attemptedAdminKey: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
			name: "Attempted Admin Escalation",
			permissions: ["admin"], // Should be rejected
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			lastUsedAt: null,
			revokedAt: null,
		},
	},
};
export const organizationApiKeys = {
	organizationKey: {
		id: crypto.randomUUID(),
		organizationId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Organization API Key",
		permissions: ["read", "write"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: null,
		revokedAt: null,
		scope: "organization",
	},
	userInOrgKey: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		organizationId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "User in Organization Key",
		permissions: ["read", "write"],
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		lastUsedAt: null,
		revokedAt: null,
		scope: "user",
	},
};
export const rotationApiKeys = {
	needsRotation: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
		name: "Old Key",
		permissions: ["read", "write"],
		createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year old
		expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expiring soon
		lastUsedAt: new Date(),
		revokedAt: null,
		rotationRecommended: true,
	},
	rotated: {
		old: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
			name: "Old Rotated Key",
			permissions: ["read", "write"],
			createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
			expiresAt: new Date(Date.now() - 1000),
			lastUsedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
			revokedAt: new Date(Date.now() - 1),
			rotatedTo: crypto.randomUUID(), // Points to new key
		},
		new: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
			name: "New Rotated Key",
			permissions: ["read", "write"],
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			lastUsedAt: null,
			revokedAt: null,
			rotatedFrom: crypto.randomUUID(), // Points to old key
		},
	},
};
// Helper to create API key with specific properties
export const createApiKey = (overrides) =>
	Object.assign(
		{
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
			name: `API Key ${crypto.randomBytes(4).toString("hex")}`,
			permissions: ["read", "write"],
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			lastUsedAt: null,
			revokedAt: null,
		},
		overrides,
	);
// Helper to create production API key
export const createProductionApiKey = (overrides) =>
	Object.assign(
		{
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			key: `sk_live_${crypto.randomBytes(32).toString("hex")}`,
			name: `Production Key ${crypto.randomBytes(4).toString("hex")}`,
			permissions: ["read", "write"],
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			lastUsedAt: null,
			revokedAt: null,
			isProduction: true,
		},
		overrides,
	);
// Helper to create API key for specific user
export const createApiKeyForUser = (userId, permissions = ["read"]) => ({
	id: crypto.randomUUID(),
	userId,
	key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
	name: `User Key ${crypto.randomBytes(4).toString("hex")}`,
	permissions,
	createdAt: new Date(),
	expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
	lastUsedAt: null,
	revokedAt: null,
});
