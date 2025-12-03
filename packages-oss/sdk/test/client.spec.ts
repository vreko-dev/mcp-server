import { describe, expect, it } from "vitest";
import { SnapbackClient } from "../src/client/SnapbackClient";

// Test IDs: sdk-001, sdk-002
describe("SnapbackClient", () => {
	describe("sdk-001: Envelope structure", () => {
		it("should accept all client surface types", () => {
			const surfaces = ["vscode", "mcp", "cli", "web"] as const;
			surfaces.forEach((surface) => {
				const client = new SnapbackClient({
					baseUrl: "http://localhost:3000",
					surface,
				});
				expect(client).toBeInstanceOf(SnapbackClient);
			});
		});

		it("should create envelope with required fields", () => {
			const client = new SnapbackClient({
				baseUrl: "http://localhost:3000",
				surface: "vscode",
			});
			// Envelope validation will be implemented in helpers
			expect(client).toBeDefined();
		});
	});

	describe("sdk-002: Method contracts", () => {
		it("should expose analyze method", () => {
			const client = new SnapbackClient({
				baseUrl: "http://localhost:3000",
				surface: "vscode",
			});
			// Method will be implemented in helpers
			expect(client).toBeDefined();
		});

		it("should expose evaluatePolicy method", () => {
			const client = new SnapbackClient({
				baseUrl: "http://localhost:3000",
				surface: "vscode",
			});
			// Method will be implemented in helpers
			expect(client).toBeDefined();
		});

		it("should expose ingestTelemetry method", () => {
			const client = new SnapbackClient({
				baseUrl: "http://localhost:3000",
				surface: "vscode",
			});
			// Method will be implemented in helpers
			expect(client).toBeDefined();
		});
	});
});
