import { beforeEach, describe, expect, it, vi } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

// biome-ignore lint/suspicious/noExplicitAny: Required for conditional imports
let auth: any;

if (isDatabaseAvailable) {
	const authModule = await import("../auth");
	auth = authModule.auth;
}

describe.skipIf(!isDatabaseAvailable)("Authentication Flow Tests", () => {
	// Mock the database adapter to avoid actual database calls
	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
	});

	describe("Environment Setup", () => {
		it("should have required environment variables", () => {
			expect(process.env.DATABASE_URL).toBeDefined();
			expect(process.env.BETTER_AUTH_SECRET).toBeDefined();
			expect(process.env.BETTER_AUTH_SECRET?.length).toBeGreaterThanOrEqual(32);
		});
	});

	describe("Auth Instance", () => {
		it("should create auth instance", () => {
			expect(auth).toBeDefined();
			expect(typeof auth).toBe("object");
		});
	});
});
