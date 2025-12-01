import * as crypto from "node:crypto";

/**
 * User fixtures for authentication testing
 * Provides realistic test users with various states and security scenarios
 */

export const validUsers = {
	standard: {
		email: "user@example.com",
		password: "ValidPassword123!",
		name: "Standard User",
		emailVerified: true,
	},
	unverified: {
		email: "unverified@example.com",
		password: "ValidPassword123!",
		name: "Unverified User",
		emailVerified: false,
	},
	admin: {
		email: "admin@example.com",
		password: "AdminPassword123!",
		name: "Admin User",
		emailVerified: true,
		role: "admin",
	},
	twoFactorEnabled: {
		email: "2fa@example.com",
		password: "ValidPassword123!",
		name: "Two Factor User",
		emailVerified: true,
		twoFactorEnabled: true,
		twoFactorSecret: "JBSWY3DPEHPK3PXP",
	},
	passkeyUser: {
		email: "passkey@example.com",
		password: "ValidPassword123!",
		name: "Passkey User",
		emailVerified: true,
		hasPasskey: true,
	},
};

export const securityTestUsers = {
	sqlInjection: {
		email: "admin'--@example.com",
		password: "' OR '1'='1",
		name: "'; DROP TABLE users; --",
	},
	xssAttack: {
		email: "xss@example.com",
		password: "ValidPassword123!",
		name: '<script>alert("xss")</script>',
	},
	longInput: {
		email: "long@example.com",
		password: "a".repeat(10000),
		name: "b".repeat(10000),
	},
	specialChars: {
		email: "special@example.com",
		password: "P@$$w0rd!#%&*()[]{}",
		name: "User™©®",
	},
	unicode: {
		email: "unicode@example.com",
		password: "密码Password123!",
		name: "用户名 User",
	},
};

export const invalidUsers = {
	invalidEmail: {
		email: "not-an-email",
		password: "ValidPassword123!",
		name: "Invalid Email User",
	},
	weakPassword: {
		email: "weak@example.com",
		password: "123",
		name: "Weak Password User",
	},
	emptyFields: {
		email: "",
		password: "",
		name: "",
	},
	missingEmail: {
		password: "ValidPassword123!",
		name: "No Email User",
	},
	missingPassword: {
		email: "nopass@example.com",
		name: "No Password User",
	},
};

export const organizationUsers = {
	owner: {
		email: "owner@example.com",
		password: "ValidPassword123!",
		name: "Organization Owner",
		emailVerified: true,
		organizationRole: "owner",
	},
	adminMember: {
		email: "orgadmin@example.com",
		password: "ValidPassword123!",
		name: "Organization Admin",
		emailVerified: true,
		organizationRole: "admin",
	},
	regularMember: {
		email: "member@example.com",
		password: "ValidPassword123!",
		name: "Organization Member",
		emailVerified: true,
		organizationRole: "member",
	},
	invitedUser: {
		email: "invited@example.com",
		password: "ValidPassword123!",
		name: "Invited User",
		emailVerified: false,
		hasInvitation: true,
	},
};

export const sessionTestUsers = {
	activeSession: {
		email: "active@example.com",
		password: "ValidPassword123!",
		name: "Active Session User",
		emailVerified: true,
		sessionToken: crypto.randomBytes(32).toString("base64url"),
		sessionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
	},
	expiredSession: {
		email: "expired@example.com",
		password: "ValidPassword123!",
		name: "Expired Session User",
		emailVerified: true,
		sessionToken: crypto.randomBytes(32).toString("base64url"),
		sessionExpiry: new Date(Date.now() - 1000),
	},
	multipleDevices: {
		email: "multi@example.com",
		password: "ValidPassword123!",
		name: "Multiple Devices User",
		emailVerified: true,
		sessions: [
			{
				token: crypto.randomBytes(32).toString("base64url"),
				device: "Chrome Desktop",
				ip: "192.168.1.1",
			},
			{
				token: crypto.randomBytes(32).toString("base64url"),
				device: "Safari Mobile",
				ip: "192.168.1.2",
			},
		],
	},
};

export const apiKeyUsers = {
	withApiKey: {
		email: "apiuser@example.com",
		password: "ValidPassword123!",
		name: "API User",
		emailVerified: true,
		apiKeys: [
			{
				key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
				name: "Production Key",
				permissions: ["read", "write"],
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			},
		],
	},
	multipleApiKeys: {
		email: "multiapi@example.com",
		password: "ValidPassword123!",
		name: "Multi API User",
		emailVerified: true,
		apiKeys: [
			{
				key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
				name: "Read Only",
				permissions: ["read"],
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			},
			{
				key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
				name: "Admin",
				permissions: ["read", "write", "admin"],
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			},
		],
	},
	expiredApiKey: {
		email: "expiredapi@example.com",
		password: "ValidPassword123!",
		name: "Expired API User",
		emailVerified: true,
		apiKeys: [
			{
				key: `sk_test_${crypto.randomBytes(32).toString("hex")}`,
				name: "Expired Key",
				permissions: ["read"],
				expiresAt: new Date(Date.now() - 1000),
			},
		],
	},
};

export const passwordResetUsers = {
	validReset: {
		email: "reset@example.com",
		password: "OldPassword123!",
		name: "Reset User",
		emailVerified: true,
		resetToken: crypto.randomBytes(32).toString("base64url"),
		resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
	},
	expiredResetToken: {
		email: "expiredreset@example.com",
		password: "OldPassword123!",
		name: "Expired Reset User",
		emailVerified: true,
		resetToken: crypto.randomBytes(32).toString("base64url"),
		resetTokenExpiry: new Date(Date.now() - 1000),
	},
};

// Helper to create random user
export const createRandomUser = (overrides?: Partial<any>) => ({
	email: `user-${crypto.randomBytes(4).toString("hex")}@example.com`,
	password: `Pass${crypto.randomBytes(8).toString("hex")}!123`,
	name: `Test User ${crypto.randomBytes(4).toString("hex")}`,
	emailVerified: false,
	...overrides,
});

// Helper to get user by type
export const getUserByType = (type: string) => {
	const allUsers = {
		...validUsers,
		...securityTestUsers,
		...invalidUsers,
		...organizationUsers,
		...sessionTestUsers,
		...apiKeyUsers,
		...passwordResetUsers,
	};

	return allUsers[type as keyof typeof allUsers];
};
