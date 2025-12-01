#!/usr/bin/env tsx
/**
 * Simple script to create a test user for development
 *
 * This script creates a test user through direct database operations
 * for testing the dashboard integration.
 */
// Use dynamic import to avoid Supabase dependency issues
async function createTestUser() {
	console.log("Creating test user for dashboard development...");
	try {
		// Dynamically import the database client
		const { db } = await import("../packages/database/drizzle/client");
		const { user } = await import("../packages/database/drizzle/schema/postgres");
		const { eq } = await import("drizzle-orm");
		const { createId } = await import("@paralleldrive/cuid2");
		if (!db) {
			throw new Error("Database connection is not available");
		}
		// Check if test user already exists
		console.log("Checking if test user already exists...");
		const existingUsers = await db.select().from(user).where(eq(user.email, "dashboard@example.com"));
		if (existingUsers.length > 0) {
			console.log("✅ Test user already exists:", existingUsers[0].id);
			console.log("\n📝 Test user credentials:");
			console.log("   Email: dashboard@example.com");
			console.log("   You'll need to set a password through the app interface");
			return;
		}
		// Create a test user
		console.log("Creating test user...");
		const [newUser] = await db
			.insert(user)
			.values({
				id: createId(),
				email: "dashboard@example.com",
				name: "Dashboard Test User",
				role: "user",
				emailVerified: true,
				onboardingComplete: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();
		console.log("✅ Test user created:", newUser.id);
		console.log("\n📝 Test user credentials:");
		console.log("   Email: dashboard@example.com");
		console.log("   You'll need to set a password through the app interface");
	} catch (error) {
		console.error("❌ Failed to create test user:", error?.message || error);
		// If it's a Supabase error, suggest using the web interface
		if (error?.message?.includes("Supabase")) {
			console.log("\n💡 Tip: You can create a test user through the web interface:");
			console.log("   1. Start the development server: pnpm dev");
			console.log("   2. Navigate to http://localhost:3000/auth/signup");
			console.log("   3. Create an account with email: dashboard@example.com");
		}
	}
}
// Run the function if this script is executed directly
if (require.main === module) {
	createTestUser()
		.then(() => {
			console.log("User creation completed");
			process.exit(0);
		})
		.catch((error) => {
			console.error("User creation failed:", error);
			process.exit(1);
		});
}
export { createTestUser };
