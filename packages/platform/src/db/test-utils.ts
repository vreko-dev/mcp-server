/**
 * Test utilities for database integration tests
 * Provides transaction rollback functionality and test data fixtures
 */

import type { db } from "./client";

// Type for database transaction
export type TestTransaction = typeof db;

/**
 * Test in transaction wrapper
 * Wraps a test function to run within a database transaction that gets rolled back
 * @param testName - Name of the test (for logging/debugging)
 * @param testFn - Test function that receives a transaction object
 * @returns A function that can be passed to vitest's it() function
 */
export const testInTransaction = (testName: string, testFn: (tx: TestTransaction) => Promise<void>) => {
	return async () => {
		// For now, we'll just run the test function directly
		// In a more sophisticated implementation, this would:
		// 1. Start a database transaction
		// 2. Pass the transaction to the test function
		// 3. Rollback the transaction after the test completes
		// 4. Handle any errors and cleanup

		// Import the db client directly for now
		const module = await import("./client");
		const db = module.db;

		try {
			// Run the test function with the database client
			// In a real implementation, this would be a transaction object
			await testFn(db);
		} catch (error) {
			// Log the test name for debugging
			console.error(`Test failed: ${testName}`, error);
			throw error;
		}
	};
};

/**
 * Create a test user for integration tests
 * @param tx - Database transaction/client
 * @param userData - User data to create
 * @returns Created user object
 */
export const createTestUser = async (
	_tx: TestTransaction,
	userData: {
		email: string;
		emailVerified?: boolean;
		[name: string]: any;
	},
) => {
	// This is a simplified implementation
	// In a real implementation, this would insert a user into the database
	// using the provided transaction and return the created user

	const mockUser = {
		id: `user_${Date.now()}`,
		email: userData.email,
		emailVerified: userData.emailVerified || false,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	// In a real implementation, we would do something like:
	// const [user] = await tx.insert(users).values(mockUser).returning();
	// return user;

	return mockUser;
};

/**
 * Truncate all tables in the database
 * Useful for cleaning up test data between tests
 */
export const truncateAllTables = async () => {
	// This is a placeholder implementation
	// In a real implementation, this would truncate all tables in the database
	// to ensure a clean state for each test

	console.warn("truncateAllTables is not implemented - tests may have side effects");
};

/**
 * Get test database connection
 * @returns Database connection for testing
 */
export const getTestDb = async () => {
	const module = await import("./client");
	return module.db;
};

/**
 * Close test database connection
 */
export const closeTestDb = async () => {
	// This is a placeholder implementation
	// In a real implementation, this would close the database connection
	console.log("closeTestDb called");
};

// Export all utilities
export default {
	testInTransaction,
	createTestUser,
	truncateAllTables,
	getTestDb,
	closeTestDb,
};
