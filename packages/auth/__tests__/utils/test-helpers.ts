import * as crypto from "node:crypto";

/**
 * Security-focused test utilities and helpers
 */

// Token generation utilities
export const generateSecureToken = (length = 32): string => {
	return crypto.randomBytes(length).toString("base64url");
};

export const generateInsecureToken = (): string => {
	// Intentionally weak for testing security validation
	return Math.random().toString(36).substring(7);
};

export const generateApiKey = (): string => {
	const prefix = "sk_test_";
	const key = crypto.randomBytes(32).toString("hex");
	return `${prefix}${key}`;
};

// Password utilities
export const generateStrongPassword = (): string => {
	return `Test${crypto.randomBytes(8).toString("hex")}!123`;
};

export const generateWeakPassword = (): string => {
	return "pass12"; // 6 characters - weak password
};

export const generateCommonPassword = (): string => {
	const common = ["password", "123456", "qwerty", "admin", "letmein"];
	return common[Math.floor(Math.random() * common.length)];
};

// Session utilities
export const createMockSession = (overrides?: Partial<any>) => ({
	id: crypto.randomUUID(),
	userId: crypto.randomUUID(),
	token: generateSecureToken(),
	expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
	createdAt: new Date(),
	...overrides,
});

export const createExpiredSession = () => ({
	...createMockSession(),
	expiresAt: new Date(Date.now() - 1000), // Already expired
});

// User utilities
export const createMockUser = (overrides?: Partial<any>) => ({
	id: crypto.randomUUID(),
	email: `test-${crypto.randomBytes(4).toString("hex")}@example.com`,
	name: "Test User",
	emailVerified: false,
	createdAt: new Date(),
	...overrides,
});

// Attack simulation utilities
export const createSqlInjectionPayloads = (): string[] => [
	"' OR '1'='1",
	"'; DROP TABLE users; --",
	"' UNION SELECT * FROM users --",
	"admin'--",
	"' OR 1=1--",
];

export const createXssPayloads = (): string[] => [
	'<script>alert("xss")</script>',
	'<img src=x onerror=alert("xss")>',
	'javascript:alert("xss")',
	'<svg onload=alert("xss")>',
	'"><script>alert(String.fromCharCode(88,83,83))</script>',
];

export const createCsrfAttackRequest = (validToken: string) => ({
	validRequest: {
		headers: { "x-csrf-token": validToken },
		body: { action: "delete" },
	},
	invalidRequest: {
		headers: {}, // Missing CSRF token
		body: { action: "delete" },
	},
	wrongTokenRequest: {
		headers: { "x-csrf-token": "wrong-token" },
		body: { action: "delete" },
	},
});

// Rate limiting utilities
export const simulateRateLimitAttack = async (
	action: () => Promise<any>,
	attempts = 100,
): Promise<{ success: number; failed: number; errors: any[] }> => {
	const results = {
		success: 0,
		failed: 0,
		errors: [] as any[],
	};

	const promises = Array(attempts)
		.fill(null)
		.map(() =>
			action()
				.then(() => results.success++)
				.catch((error) => {
					results.failed++;
					results.errors.push(error);
				}),
		);

	await Promise.all(promises);
	return results;
};

// Timing attack utilities
export const measureTimingDifference = async (
	operation1: () => Promise<any>,
	operation2: () => Promise<any>,
	iterations = 100,
): Promise<{ diff: number; op1Avg: number; op2Avg: number }> => {
	const times1: number[] = [];
	const times2: number[] = [];

	for (let i = 0; i < iterations; i++) {
		const start1 = performance.now();
		await operation1();
		times1.push(performance.now() - start1);

		const start2 = performance.now();
		await operation2();
		times2.push(performance.now() - start2);
	}

	const avg1 = times1.reduce((a, b) => a + b, 0) / times1.length;
	const avg2 = times2.reduce((a, b) => a + b, 0) / times2.length;

	return {
		diff: Math.abs(avg1 - avg2),
		op1Avg: avg1,
		op2Avg: avg2,
	};
};

// JWT utilities
export const createMalformedJwt = (): string[] => [
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid", // Invalid payload - only 2 parts
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.", // Missing signature - empty part
	"eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.", // None algorithm - empty part
];

// Organization testing utilities
export const createMockOrganization = (overrides?: Partial<any>) => ({
	id: crypto.randomUUID(),
	name: `Test Org ${crypto.randomBytes(4).toString("hex")}`,
	slug: `test-org-${crypto.randomBytes(4).toString("hex")}`,
	createdAt: new Date(),
	...overrides,
});

export const createMockMember = (
	userId: string,
	organizationId: string,
	role = "member",
) => ({
	id: crypto.randomUUID(),
	userId,
	organizationId,
	role,
	createdAt: new Date(),
});

// Privilege escalation test scenarios
export const createPrivilegeEscalationScenarios = () => ({
	memberToOwner: {
		currentRole: "member",
		attemptedRole: "owner",
		shouldFail: true,
	},
	memberToAdmin: {
		currentRole: "member",
		attemptedRole: "admin",
		shouldFail: true,
	},
	adminToOwner: {
		currentRole: "admin",
		attemptedRole: "owner",
		shouldFail: true,
	},
	ownerToOwner: {
		currentRole: "owner",
		attemptedRole: "owner",
		shouldFail: false,
	},
});

// Mock environment variables
export const mockEnvVars = (overrides?: Record<string, string>) => {
	const originalEnv = { ...process.env };

	process.env = {
		...process.env,
		GOOGLE_CLIENT_ID: "mock-google-client-id",
		GOOGLE_CLIENT_SECRET: "mock-google-client-secret",
		GITHUB_CLIENT_ID: "mock-github-client-id",
		GITHUB_CLIENT_SECRET: "mock-github-client-secret",
		DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
		...overrides,
	};

	return () => {
		process.env = originalEnv;
	};
};

// Passkey utilities
export const createMockPasskeyChallenge = () => ({
	challenge: crypto.randomBytes(32).toString("base64url"),
	rpId: "localhost",
	rpName: "Test App",
	userId: crypto.randomBytes(32).toString("base64url"),
	userName: "test@example.com",
	timeout: 60000,
});

// Two-factor authentication utilities
export const generateTotpSecret = (): string => {
	return crypto.randomBytes(20).toString("base64");
};

export const generateValidTotp = (): string => {
	// Mock TOTP - in real tests you'd use a proper TOTP library
	return String(Math.floor(100000 + Math.random() * 900000));
};

export const generateInvalidTotp = (): string => {
	return "000000"; // Intentionally invalid
};

// API Key testing utilities
export const createApiKeyWithPermissions = (permissions: string[] = []) => ({
	key: generateApiKey(),
	permissions,
	createdAt: new Date(),
	expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
});

export const createExpiredApiKey = () => ({
	key: generateApiKey(),
	createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
	expiresAt: new Date(Date.now() - 1000), // Already expired
});

// Security assertion helpers
export const assertSecureHeaders = (headers: Headers) => {
	const requiredHeaders = [
		"x-content-type-options",
		"x-frame-options",
		"x-xss-protection",
	];

	const missing = requiredHeaders.filter((header) => !headers.has(header));

	if (missing.length > 0) {
		throw new Error(`Missing security headers: ${missing.join(", ")}`);
	}
};

export const assertNoSensitiveDataInResponse = (response: any) => {
	const sensitiveFields = ["password", "secret", "apiKey", "token"];
	const responseStr = JSON.stringify(response);

	const leaked = sensitiveFields.filter((field) =>
		responseStr.toLowerCase().includes(field.toLowerCase()),
	);

	if (leaked.length > 0) {
		throw new Error(`Response contains sensitive fields: ${leaked.join(", ")}`);
	}
};
