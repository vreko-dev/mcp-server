#!/usr/bin/env tsx
/**
 * Script to create a test user for development
 *
 * This script creates a test user through the Better Auth API
 * for testing the dashboard integration.
 */
// Import auth without database dependencies
const { auth } = require("../packages/auth/auth");
async function createTestUser() {
	console.log("Creating test user for dashboard development...");
	try {
		// Try to create a user through Better Auth
		const response = await auth.api.signUpEmail({
			email: "dashboard@example.com",
			password: "dashboard123",
			name: "Dashboard Test User",
		});
		if (response) {
			console.log("✅ Test user created successfully!");
			console.log("User ID:", response.user.id);
			console.log("\n📝 Test user credentials:");
			console.log("   Email: dashboard@example.com");
			console.log("   Password: dashboard123");
		} else {
			console.log("❌ Failed to create test user");
		}
	} catch (error) {
		if (error?.code === "USER_ALREADY_EXISTS") {
			console.log("✅ Test user already exists");
			console.log("\n📝 Test user credentials:");
			console.log("   Email: dashboard@example.com");
			console.log("   Password: dashboard123");
		} else {
			console.error("❌ Failed to create test user:", error?.message || error);
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
