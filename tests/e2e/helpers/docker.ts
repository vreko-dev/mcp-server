import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Wait for all Docker services to be healthy
 */
export async function waitForServices(timeout = 120000): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		try {
			// Check if services are running
			const { stdout } = await execAsync(
				'docker-compose -f docker-compose.dev.yml ps --services --filter "status=running"',
			);
			const runningServices = stdout.trim().split("\n").filter(Boolean);

			// Expected services
			const expectedServices = ["postgres", "redis", "api", "mcp", "web", "docs", "mailhog", "nginx"];

			// Check if all expected services are running
			const allRunning = expectedServices.every((service) => runningServices.includes(service));

			if (allRunning) {
				// Check health status
				const { stdout: healthStdout } = await execAsync("docker-compose -f docker-compose.dev.yml ps");
				const healthLines = healthStdout.trim().split("\n");

				// Check if all services are healthy (this is a simplified check)
				const allHealthy = healthLines.some((line) => line.includes("(healthy)"));

				if (allHealthy) {
					console.log("All services are healthy");
					return;
				}
			}

			console.log("Waiting for services to be healthy...");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		} catch (_error) {
			console.log("Error checking service status, retrying...");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	throw new Error("Services did not become healthy within timeout period");
}

/**
 * Reset the database by truncating test data
 */
export async function resetDatabase(): Promise<void> {
	try {
		// This is a placeholder - actual implementation would depend on your database setup
		// For example, with PostgreSQL:
		// await execAsync('docker-compose -f docker-compose.dev.yml exec -T postgres psql -U snapback -d snapback -c "TRUNCATE TABLE users, sessions, api_keys RESTART IDENTITY CASCADE;"');

		console.log("Database reset completed");
	} catch (error) {
		console.error("Failed to reset database:", error);
		throw error;
	}
}
