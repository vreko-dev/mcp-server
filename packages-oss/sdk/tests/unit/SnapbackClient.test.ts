import { describe, expect, it } from "vitest";
import { SnapbackClient } from "../../src/client/SnapbackClient.js";

describe("SnapbackClient", () => {
	describe("initialization", () => {
		it("should create client with minimal config", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
			});

			expect(client).toBeDefined();
			expect(client.snapshots).toBeDefined();
			expect(client.protection).toBeDefined();
			expect(client.config).toBeDefined();
		});

		it("should create client with API key", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
				apiKey: "test_key_123",
			});

			expect(client).toBeDefined();
		});

		it("should create client with custom timeout", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
				timeout: 5000,
			});

			expect(client).toBeDefined();
		});

		it("should create client with custom retry config", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
				retries: 5,
			});

			expect(client).toBeDefined();
		});

		it("should create client with caching disabled", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
				cache: false,
			});

			expect(client).toBeDefined();
		});
	});

	describe("health check", () => {
		it("should check API health", async () => {
			// This test will fail until you implement healthCheck()
			const _client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
			});

			// Mock the HTTP request
			// await expect(client.healthCheck()).resolves.toMatchObject({
			//   status: 'ok',
			//   version: expect.any(String)
			// });
		});
	});

	describe("sub-clients", () => {
		it("should provide snapshot client", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
			});

			expect(client.snapshots).toBeDefined();
			expect(client.snapshots.create).toBeDefined();
			expect(client.snapshots.list).toBeDefined();
			expect(client.snapshots.get).toBeDefined();
			expect(client.snapshots.delete).toBeDefined();
		});

		it("should provide protection client", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
			});

			expect(client.protection).toBeDefined();
			expect(client.protection.protect).toBeDefined();
			expect(client.protection.unprotect).toBeDefined();
			expect(client.protection.list).toBeDefined();
		});

		it("should provide config client", () => {
			const client = new SnapbackClient({
				baseUrl: "https://api.snapback.dev",
			});

			expect(client.config).toBeDefined();
			expect(client.config.get).toBeDefined();
			expect(client.config.update).toBeDefined();
		});
	});
});
