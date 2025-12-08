/**
 * Test Data Generators - Industry Standard
 *
 * Provides consistent, randomized test data to prevent collisions
 * and ensure test isolation.
 */

import { nanoid } from "nanoid";

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix = "test"): string {
	const timestamp = Date.now();
	const random = nanoid(6);
	return `${prefix}-${timestamp}-${random}@snapback.test`;
}

/**
 * Generate strong test password
 */
export function generateTestPassword(): string {
	const random = nanoid(12);
	return `Test${random}!123`;
}

/**
 * Generate test user data
 */
export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
	return {
		email: generateTestEmail(),
		password: generateTestPassword(),
		name: `Test User ${nanoid(6)}`,
		...overrides,
	};
}

/**
 * Test user type
 */
export type TestUser = {
	email: string;
	password: string;
	name: string;
};

/**
 * Common test credentials (for setup scripts)
 */
export const TEST_CREDENTIALS = {
	regular: {
		email: "user@example.com",
		password: "User123!@#",
		name: "Regular User",
	},
	admin: {
		email: "admin@example.com",
		password: "Admin123!@#",
		name: "Admin User",
	},
	newUser: {
		email: "newuser@example.com",
		password: "NewUser123!@#",
		name: "New User",
	},
} as const;

/**
 * Wait utilities
 */
export const wait = {
	short: () => new Promise((resolve) => setTimeout(resolve, 100)),
	medium: () => new Promise((resolve) => setTimeout(resolve, 500)),
	long: () => new Promise((resolve) => setTimeout(resolve, 1000)),
};

/**
 * Common test assertions
 */
export const assertions = {
	/**
	 * Verify page loaded successfully (no errors)
	 */
	pageLoaded: async (page: any) => {
		// Check no console errors
		const errors: string[] = [];
		page.on("pageerror", (error: Error) => {
			errors.push(error.message);
		});

		// Give page time to settle
		await wait.short();

		if (errors.length > 0) {
			throw new Error(`Page errors detected: ${errors.join(", ")}`);
		}
	},

	/**
	 * Verify no network errors
	 */
	noNetworkErrors: async (page: any) => {
		const failures: string[] = [];
		page.on("requestfailed", (request: any) => {
			failures.push(`${request.method()} ${request.url()}`);
		});

		await wait.short();

		if (failures.length > 0) {
			throw new Error(`Network errors detected: ${failures.join(", ")}`);
		}
	},
};

/**
 * Performance helpers
 */
export const performance = {
	/**
	 * Measure time taken for operation
	 */
	measure: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
		const start = Date.now();
		const result = await fn();
		const duration = Date.now() - start;
		return { result, duration };
	},

	/**
	 * Assert operation completes within time
	 */
	assertFasterThan: async <T>(
		fn: () => Promise<T>,
		maxDuration: number,
	): Promise<T> => {
		const { result, duration } = await performance.measure(fn);
		if (duration > maxDuration) {
			throw new Error(
				`Operation took ${duration}ms, expected <${maxDuration}ms`,
			);
		}
		return result;
	},
};
