import {
	type ChildProcess,
	exec as execCallback,
	spawn,
} from "node:child_process";
import { promisify } from "node:util";
import fetch from "node-fetch";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const _exec = promisify(execCallback);

describe("Dashboard Integration Test", () => {
	let devServer: ChildProcess;
	let serverReady = false;

	beforeAll(async () => {
		// Start the development server
		devServer = spawn("npm", ["run", "dev"], {
			cwd: process.cwd(),
			stdio: "pipe",
			env: { ...process.env },
		});

		// Wait for server to be ready
		devServer.stdout?.on("data", (data) => {
			const output = data.toString();
			if (output.includes("Ready in")) {
				serverReady = true;
			}
			console.log("Server output:", output);
		});

		devServer.stderr?.on("data", (data) => {
			console.error("Server error:", data.toString());
		});

		// Wait up to 30 seconds for server to start
		const startTime = Date.now();
		while (!serverReady && Date.now() - startTime < 30000) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		if (!serverReady) {
			throw new Error("Dev server failed to start within 30 seconds");
		}

		// Give it a bit more time to fully initialize
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}, 40000); // 40 second timeout for beforeAll

	afterAll(() => {
		// Kill the dev server
		if (devServer) {
			devServer.kill();
		}
	});

	it("should render dashboard page", async () => {
		try {
			// Try to fetch the dashboard page
			const response = await fetch("http://localhost:3000/app/dashboard", {
				headers: {
					Accept: "text/html",
				},
			});

			expect(response.status).toBe(200);

			const html = await response.text();
			expect(html).toContain("Dashboard");
			expect(html).toContain("Welcome back");

			console.log("Dashboard page rendered successfully");
		} catch (error) {
			console.error("Error fetching dashboard:", error);
			throw error;
		}
	}, 10000); // 10 second timeout
});
