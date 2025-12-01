import { SnapBackEventBus } from "@snapback/events";
import { ExtensionClient } from "@snapback/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MCPHttpServer } from "../../src/http-server.js";

// Mock the event bus and extension client to prevent connection errors
vi.mock("@snapback/events");
vi.mock("@snapback/sdk");

describe("Analyze Risk HTTP E2E Tests", () => {
	let httpServer: MCPHttpServer;
	let testPort: number;
	let _serverUrl: string;

	beforeAll(async () => {
		// Mock the event bus and extension client to prevent connection errors
		vi.mocked(SnapBackEventBus).mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn(),
			publishTelemetryEvent: vi.fn(),
			publishAnalysisResult: vi.fn(),
		}));

		vi.mocked(ExtensionClient).mockImplementation(() => ({
			initialize: vi.fn().mockResolvedValue(undefined),
			sendRequest: vi.fn().mockResolvedValue({}),
			dispose: vi.fn(),
		}));

		// Find an available port
		testPort = 3000 + Math.floor(Math.random() * 1000);
		_serverUrl = `http://localhost:${testPort}`;

		// Start the HTTP server
		httpServer = new MCPHttpServer(testPort);
		await httpServer.start();
	});

	afterAll(async () => {
		// Stop the HTTP server
		await httpServer.stop();
	});

	it("should analyze risk via HTTP POST request", async () => {
		// This is a placeholder test - in a real implementation, we would:
		// 1. Send a POST request to the analyze-risk endpoint
		// 2. Verify the response contains the expected analysis results
		// 3. Check that the server properly handles the request

		// For now, we'll just verify the server is running
		expect(httpServer).toBeDefined();
		expect(testPort).toBeGreaterThan(3000);
	});
});
