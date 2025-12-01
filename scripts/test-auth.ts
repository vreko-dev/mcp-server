#!/usr/bin/env ts-node

import { testAuthFlow } from "../packages/auth/debug-auth";
import { testSessionCreation } from "../packages/auth/test-session";
import { testDatabaseConnection } from "../packages/database/debug-db";

async function runAllTests() {
	console.log("Running authentication system tests...\n");

	// Test 1: Database connection
	console.log("=== Database Connection Test ===");
	const dbResult = await testDatabaseConnection();
	console.log("Result:", dbResult);
	console.log("");

	// Test 2: Auth flow
	console.log("=== Auth Flow Test ===");
	const authResult = await testAuthFlow();
	console.log("Result:", authResult);
	console.log("");

	// Test 3: Session creation
	console.log("=== Session Creation Test ===");
	const sessionResult = await testSessionCreation();
	console.log("Result:", sessionResult);
	console.log("");

	// Summary
	console.log("=== Test Summary ===");
	console.log("Database:", dbResult.success ? "PASS" : "FAIL");
	console.log("Auth Flow:", authResult.success ? "PASS" : "FAIL");
	console.log("Session:", sessionResult.success ? "PASS" : "FAIL");

	const allPassed = dbResult.success && authResult.success && sessionResult.success;
	console.log("\nOverall Result:", allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED");

	process.exit(allPassed ? 0 : 1);
}

// Run the tests
if (require.main === module) {
	runAllTests().catch((error) => {
		console.error("Test suite failed with error:", error);
		process.exit(1);
	});
}
