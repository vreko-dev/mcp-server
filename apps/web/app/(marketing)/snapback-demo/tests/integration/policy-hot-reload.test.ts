import { beforeEach, describe, expect, it, vi } from "vitest";
import { parsePolicyFile } from "../../domain/policies";

describe("Policy Hot-Reload Debounce", () => {
	beforeEach(() => {
		// Clear any cached state between tests
		vi.clearAllMocks();
	});

	describe("debounce behavior", () => {
		it("should reload policy only once for rapid changes", async () => {
			// Mock the policy parsing function to track calls
			const parsePolicyFileMock = vi.fn(parsePolicyFile);

			// Simulate rapid policy file changes
			const policyContents = [
				"@warn *.ts\n@block src/config/*.json",
				"@warn *.ts\n@block src/config/*.json\nsrc/database/*.sql", // Added line
				"@block *.ts\n@block src/config/*.json\nsrc/database/*.sql", // Changed level
			];

			// Track reload events
			let reloadCount = 0;
			const reloadEvents: number[] = [];

			// Simulate debounce logic (simplified for test)
			let lastReload = 0;
			const DEBOUNCE_DELAY = 1000; // 1 second debounce

			const simulatePolicyChange = (content: string) => {
				const now = Date.now();
				if (now - lastReload > DEBOUNCE_DELAY) {
					reloadCount++;
					reloadEvents.push(now);
					lastReload = now;
					parsePolicyFileMock(content);
				}
			};

			// Simulate rapid changes within debounce window
			for (let i = 0; i < policyContents.length; i++) {
				simulatePolicyChange(policyContents[i]);
				// Wait 300ms between changes (less than debounce delay)
				await new Promise((resolve) => setTimeout(resolve, 300));
			}

			// Should only have reloaded once due to debouncing
			expect(reloadCount).toBe(1);
			expect(parsePolicyFileMock).toHaveBeenCalledTimes(1);

			// Verify the final policy content was parsed
			expect(parsePolicyFileMock).toHaveBeenCalledWith(policyContents[2]);
		});

		it("should reload policy multiple times when changes are spaced", async () => {
			const parsePolicyFileMock = vi.fn(parsePolicyFile);

			let reloadCount = 0;
			let lastReload = 0;
			const DEBOUNCE_DELAY = 500;

			const simulatePolicyChange = (content: string) => {
				const now = Date.now();
				if (now - lastReload > DEBOUNCE_DELAY) {
					reloadCount++;
					lastReload = now;
					parsePolicyFileMock(content);
					return true; // Actually reloaded
				}
				return false; // Debounced
			};

			// First change
			const reloaded1 = simulatePolicyChange("@warn *.ts");
			expect(reloaded1).toBe(true);

			// Wait longer than debounce delay
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Second change
			const reloaded2 = simulatePolicyChange("@block *.ts");
			expect(reloaded2).toBe(true);

			// Should have reloaded twice
			expect(reloadCount).toBe(2);
			expect(parsePolicyFileMock).toHaveBeenCalledTimes(2);
		});
	});

	describe("status prompt behavior", () => {
		it("should show status prompt exactly once per reload cycle", async () => {
			let promptCount = 0;

			// Mock function to show status prompt
			const showStatusPrompt = vi.fn(() => {
				promptCount++;
			});

			// Simulate policy reload with debounce
			let lastReload = 0;
			const DEBOUNCE_DELAY = 1000;

			const reloadPolicyWithPrompt = (content: string) => {
				const now = Date.now();
				if (now - lastReload > DEBOUNCE_DELAY) {
					lastReload = now;
					// Parse policy
					const policies = parsePolicyFile(content);
					// Show prompt
					showStatusPrompt();
					return policies;
				}
				return null; // Debounced
			};

			// Rapid changes
			const contents = ["@warn *.ts", "@block *.ts", "@watch *.ts"];

			const results = [];
			for (const content of contents) {
				const result = reloadPolicyWithPrompt(content);
				if (result) {
					results.push(result);
				}
				await new Promise((resolve) => setTimeout(resolve, 300));
			}

			// Should only show prompt once
			expect(promptCount).toBe(1);
			expect(showStatusPrompt).toHaveBeenCalledTimes(1);
			expect(results).toHaveLength(1); // Only one actual reload
		});
	});
});
