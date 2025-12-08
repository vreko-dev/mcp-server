import * as crypto from "node:crypto";

/**
 * Session fixtures for testing session management and security
 */

export const validSessions = {
	active: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: crypto.randomBytes(32).toString("base64url"),
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
		createdAt: new Date(),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
	},
	freshSession: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: crypto.randomBytes(32).toString("base64url"),
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		createdAt: new Date(),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		isFresh: true,
	},
};

export const invalidSessions = {
	expired: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: crypto.randomBytes(32).toString("base64url"),
		expiresAt: new Date(Date.now() - 1000), // Already expired
		createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0",
	},
	invalidToken: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: "invalid-token",
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		createdAt: new Date(),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0",
	},
	malformedToken: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: "../../../etc/passwd",
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		createdAt: new Date(),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0",
	},
};

export const securityTestSessions = {
	suspiciousIpChange: {
		original: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.1",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			country: "US",
		},
		hijacked: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "103.21.244.0", // Different country
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			country: "CN",
		},
	},
	userAgentChange: {
		original: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.1",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
		},
		modified: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.1",
			userAgent: "curl/7.68.0", // Suspicious change
		},
	},
	sessionFixation: {
		attackerSession: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: "fixed-session-token",
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "10.0.0.1",
			userAgent: "AttackerBot/1.0",
		},
		victimSession: {
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: "fixed-session-token", // Same token - vulnerability
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.100",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
		},
	},
};

export const concurrentSessions = {
	multipleDevices: [
		{
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.1",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
			deviceName: "Desktop Chrome",
		},
		{
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.2",
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
			deviceName: "iPhone Safari",
		},
		{
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.3",
			userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)",
			deviceName: "iPad Safari",
		},
	],
	suspiciousConcurrent: [
		{
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			ipAddress: "192.168.1.1",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			country: "US",
		},
		{
			id: crypto.randomUUID(),
			userId: crypto.randomUUID(),
			token: crypto.randomBytes(32).toString("base64url"),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			createdAt: new Date(Date.now() - 100), // 100ms ago
			ipAddress: "103.21.244.0",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			country: "CN", // Impossible to be in two countries simultaneously
		},
	],
};

export const refreshTokenSessions = {
	withRefreshToken: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: crypto.randomBytes(32).toString("base64url"),
		refreshToken: crypto.randomBytes(32).toString("base64url"),
		expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
		refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
		createdAt: new Date(),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0",
	},
	expiredAccessValidRefresh: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: crypto.randomBytes(32).toString("base64url"),
		refreshToken: crypto.randomBytes(32).toString("base64url"),
		expiresAt: new Date(Date.now() - 1000), // Expired access token
		refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid refresh
		createdAt: new Date(),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0",
	},
	expiredBoth: {
		id: crypto.randomUUID(),
		userId: crypto.randomUUID(),
		token: crypto.randomBytes(32).toString("base64url"),
		refreshToken: crypto.randomBytes(32).toString("base64url"),
		expiresAt: new Date(Date.now() - 1000),
		refreshTokenExpiresAt: new Date(Date.now() - 1000), // Both expired
		createdAt: new Date(),
		ipAddress: "192.168.1.1",
		userAgent: "Mozilla/5.0",
	},
};

// Helper to create session with specific characteristics
export const createSessionWithAge = (ageInHours: number) => ({
	id: crypto.randomUUID(),
	userId: crypto.randomUUID(),
	token: crypto.randomBytes(32).toString("base64url"),
	expiresAt: new Date(Date.now() + (7 * 24 - ageInHours) * 60 * 60 * 1000),
	createdAt: new Date(Date.now() - ageInHours * 60 * 60 * 1000),
	ipAddress: "192.168.1.1",
	userAgent: "Mozilla/5.0",
});

// Helper to create session for specific user
export const createSessionForUser = (userId: string, overrides?: Partial<any>) => ({
	id: crypto.randomUUID(),
	userId,
	token: crypto.randomBytes(32).toString("base64url"),
	expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
	createdAt: new Date(),
	ipAddress: "192.168.1.1",
	userAgent: "Mozilla/5.0",
	...overrides,
});
