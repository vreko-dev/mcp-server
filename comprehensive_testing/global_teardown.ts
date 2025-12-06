/**
 * Global teardown for E2E tests
 * - Cleans up test data
 * - Stops containers (local dev only)
 */

import type { FullConfig } from "@playwright/test";
import { execSync } from "child_process";

async function globalTeardown(_config: FullConfig): Promise<void> {
	console.log("[E2E Teardown] Starting...");

	// Clean test data
	await cleanTestData();

	// In CI, containers are managed by the workflow
	if (!process.env.CI && process.env.CLEANUP_CONTAINERS === "true") {
		stopContainers();
	}

	console.log("[E2E Teardown] Complete");
}

async function cleanTestData(): Promise<void> {
	console.log("[E2E Teardown] Cleaning test data...");
	// In production, this would delete test user data
	// For now, test users are ephemeral
}

function stopContainers(): void {
	try {
		execSync("docker stop snapback-test-db && docker rm snapback-test-db", {
			stdio: "pipe",
		});
		console.log("[E2E Teardown] Stopped database container");
	} catch {
		// Container may not exist
	}
}

export default globalTeardown;
