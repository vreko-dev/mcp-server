import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Supabase Lazy Proxy", () => {
	beforeEach(() => {
		// Clear environment variables
		delete process.env.SUPABASE_URL;
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;

		// Clear module cache to get fresh import
		vi.resetModules();
	});

	describe("lazy initialization", () => {
		it("should not throw during module import without credentials", async () => {
			// This should not throw even though env vars are missing
			expect(async () => {
				await import("../supabase-service.js");
			}).not.toThrow();
		});

		it("should throw only when first property is accessed without credentials", async () => {
			const { supabase } = await import("../supabase-service.js");

			// Accessing a property should trigger initialization and throw
			expect(() => {
				supabase.auth;
			}).toThrow(/SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/);
		});

		it("should initialize successfully with valid credentials", async () => {
			// Set valid credentials
			process.env.SUPABASE_URL = "https://example.supabase.co";
			process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";

			const { supabase } = await import("../supabase-service.js");

			// Should not throw when accessing properties
			expect(() => {
				supabase.auth;
			}).not.toThrow();
		});
	});

	describe("regression guards", () => {
		it("should ensure proxy is not created during module import", async () => {
			// This test verifies the proxy doesn't trigger initialization at import time
			const initSpy = vi.fn();

			// Mock createClient to track initialization
			vi.doMock("@supabase/supabase-js", () => ({
				createClient: (...args: any[]) => {
					initSpy(...args);
					return { auth: {}, from: () => ({}) };
				},
			}));

			// Import module
			await import("../supabase-service.js");

			// Initialization should not have been called yet
			expect(initSpy).not.toHaveBeenCalled();
		});

		it("should only initialize once even with multiple property accesses", async () => {
			process.env.SUPABASE_URL = "https://example.supabase.co";
			process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";

			const initSpy = vi.fn();

			vi.doMock("@supabase/supabase-js", () => ({
				createClient: (...args: any[]) => {
					initSpy(...args);
					return { auth: {}, from: () => ({}), storage: {} };
				},
			}));

			const { supabase } = await import("../supabase-service.js");

			// Access multiple properties
			supabase.auth;
			supabase.from("user");
			supabase.storage;

			// Should only initialize once
			expect(initSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe("error messages", () => {
		it("should provide actionable error message when credentials are missing", async () => {
			const { supabase } = await import("../supabase-service.js");

			try {
				supabase.auth;
				expect.fail("Should have thrown");
			} catch (error: any) {
				expect(error.message).toMatch(/SUPABASE_URL|environment variable/i);
			}
		});

		it("should provide helpful context in error messages", async () => {
			const { supabase } = await import("../supabase-service.js");

			try {
				supabase.from("user");
				expect.fail("Should have thrown");
			} catch (error: any) {
				// Error should mention configuration or credentials
				expect(error.message.toLowerCase()).toMatch(/url|key|credential|config/);
			}
		});
	});

	describe("environment isolation", () => {
		it("should work in test environment without credentials", async () => {
			// Save original environment
			const originalEnv = process.env.NODE_ENV;

			// Simulate test environment where Supabase might not be configured
			(process.env as any).NODE_ENV = "test";

			// Import should succeed
			const module = await import("../supabase-service.js");
			expect(module.supabase).toBeDefined();

			// But accessing should throw
			expect(() => {
				module.supabase.auth;
			}).toThrow();

			// Restore original environment
			(process.env as any).NODE_ENV = originalEnv;
		});

		it("should work in development with credentials", async () => {
			// Save original environment
			const originalEnv = process.env.NODE_ENV;
			const originalUrl = process.env.SUPABASE_URL;
			const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

			(process.env as any).NODE_ENV = "development";
			(process.env as any).SUPABASE_URL = "https://dev.supabase.co";
			(process.env as any).SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dev";

			const { supabase } = await import("../supabase-service.js");

			expect(() => {
				supabase.auth;
			}).not.toThrow();

			// Restore original environment
			(process.env as any).NODE_ENV = originalEnv;
			(process.env as any).SUPABASE_URL = originalUrl;
			(process.env as any).SUPABASE_SERVICE_ROLE_KEY = originalKey;
		});
	});
});
