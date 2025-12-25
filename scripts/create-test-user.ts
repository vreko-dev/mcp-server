#!/usr/bin/env tsx

/**
 * Script to create a test user for development
 *
 * This script creates a test user through the Better Auth API by default,
 * or directly in the database with --direct flag.
 *
 * Usage:
 *   pnpm tsx scripts/create-test-user.ts          # Uses Better Auth API
 *   pnpm tsx scripts/create-test-user.ts --direct # Direct database insert
 */

const TEST_USER = {
	email: "dashboard@example.com",
	password: "dashboard123",
	name: "Dashboard Test User",
};

async function createViaAuthAPI() {
	console.log("Creating test user via Better Auth API...");

	const { auth } = require("../packages/auth/auth");

	const response = await auth.api.signUpEmail({
		email: TEST_USER.email,
		password: TEST_USER.password,
		name: TEST_USER.name,
	});

	if (response) {
		console.log("User ID:", response.user.id);
		return true;
	}
	return false;
}

async function createViaDirect() {
	console.log("Creating test user via direct database insert...");

	const { db } = await import("../packages/database/drizzle/client");
	const { user } = await import("../packages/database/drizzle/schema/postgres");
	const { eq } = await import("drizzle-orm");
	const { createId } = await import("@paralleldrive/cuid2");

	if (!db) {
		throw new Error("Database connection is not available");
	}

	// Check if test user already exists
	const existingUsers = await db.select().from(user).where(eq(user.email, TEST_USER.email));

	if (existingUsers.length > 0) {
		console.log("User already exists:", existingUsers[0].id);
		console.log("\nNote: You'll need to set a password through the app interface");
		return true;
	}

	// Create a test user
	const [newUser] = await db
		.insert(user)
		.values({
			id: createId(),
			email: TEST_USER.email,
			name: TEST_USER.name,
			role: "user",
			emailVerified: true,
			onboardingComplete: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning();

	console.log("User ID:", newUser.id);
	console.log("\nNote: You'll need to set a password through the app interface");
	return true;
}

async function createTestUser() {
	const isDirect = process.argv.includes("--direct");
	const method = isDirect ? "direct database" : "Better Auth API";

	console.log(`Creating test user for dashboard development (${method})...`);
	console.log("");

	try {
		const success = isDirect ? await createViaDirect() : await createViaAuthAPI();

		if (success) {
			console.log("\n" + "=".repeat(50));
			console.log("Test user credentials:");
			console.log(`   Email:    ${TEST_USER.email}`);
			if (!isDirect) {
				console.log(`   Password: ${TEST_USER.password}`);
			}
			console.log("=".repeat(50));
		} else {
			console.log("Failed to create test user");
		}
	} catch (error: any) {
		if (error?.code === "USER_ALREADY_EXISTS") {
			console.log("Test user already exists");
			console.log("\nTest user credentials:");
			console.log(`   Email:    ${TEST_USER.email}`);
			console.log(`   Password: ${TEST_USER.password}`);
		} else {
			console.error("Failed to create test user:", error?.message || error);

			if (!isDirect) {
				console.log("\nTip: Try --direct flag for direct database insert:");
				console.log("   pnpm tsx scripts/create-test-user.ts --direct");
			} else if (error?.message?.includes("Supabase")) {
				console.log("\nTip: You can create a test user through the web interface:");
				console.log("   1. Start the development server: pnpm dev");
				console.log("   2. Navigate to http://localhost:3000/auth/signup");
				console.log(`   3. Create an account with email: ${TEST_USER.email}`);
			}
			throw error;
		}
	}
}

// Run the function if this script is executed directly
if (require.main === module) {
	createTestUser()
		.then(() => {
			console.log("\nUser creation completed");
			process.exit(0);
		})
		.catch((error) => {
			console.error("\nUser creation failed:", error);
			process.exit(1);
		});
}

export { createTestUser };
