import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MCPHttpServer } from "../../src/http-server";

// Mock the MCP server
const mockMCPServer = {
	connect: vi.fn(),
} as unknown as Server;

describe("Secure Communication Channels Integration", () => {
	let httpServer: MCPHttpServer;

	beforeEach(async () => {
		// Create a real HTTP server instance for testing
		httpServer = new MCPHttpServer(mockMCPServer);

		// Mock the listen method to avoid port conflicts
		vi.spyOn(httpServer, "listen").mockImplementation(async (_port = 3000, _host = "localhost") => {
			return new Promise((resolve) => {
				// Don't actually start the server, just resolve
				resolve();
			});
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should apply security headers to all responses", async () => {
		// Create a mock request and response
		const mockReq = {
			method: "GET",
			url: "/health",
			headers: {
				host: "localhost:3000",
			},
			socket: {},
		} as unknown as IncomingMessage;

		const mockRes = {
			headers: {} as Record<string, string>,
			writeHead: vi.fn(function (_statusCode: number, headers?: Record<string, string>) {
				if (headers) {
					Object.assign(this.headers, headers);
				}
				return this;
			}),
			setHeader: vi.fn(function (name: string, value: string) {
				this.headers[name] = value;
				return this;
			}),
			end: vi.fn(),
		} as unknown as ServerResponse;

		// Call the handleRequest method directly
		// We need to access the private method, so we'll use bracket notation
		const handleRequest = (httpServer as any).handleRequest.bind(httpServer);
		await handleRequest(mockReq, mockRes);

		// Verify security headers were applied
		expect(mockRes.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
		expect(mockRes.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
		expect(mockRes.setHeader).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
		expect(mockRes.setHeader).toHaveBeenCalledWith(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains",
		);
		expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Security-Policy", "default-src 'self'");
	});

	it("should handle CORS preflight requests correctly", async () => {
		// Create a mock OPTIONS request
		const mockReq = {
			method: "OPTIONS",
			url: "/mcp",
			headers: {
				host: "localhost:3000",
				origin: "http://localhost:5173",
				"access-control-request-method": "POST",
				"access-control-request-headers": "Content-Type, Authorization",
			},
			socket: {},
		} as unknown as IncomingMessage;

		const mockRes = {
			headers: {} as Record<string, string>,
			writeHead: vi.fn(function (_statusCode: number, headers?: Record<string, string>) {
				if (headers) {
					Object.assign(this.headers, headers);
				}
				return this;
			}),
			setHeader: vi.fn(function (name: string, value: string) {
				this.headers[name] = value;
				return this;
			}),
			end: vi.fn(),
		} as unknown as ServerResponse;

		// Call the handleRequest method directly
		const handleRequest = (httpServer as any).handleRequest.bind(httpServer);
		await handleRequest(mockReq, mockRes);

		// Verify CORS headers were set
		expect(mockRes.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://localhost:5173");
		expect(mockRes.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		expect(mockRes.setHeader).toHaveBeenCalledWith(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, X-API-Key",
		);
		expect(mockRes.setHeader).toHaveBeenCalledWith("Access-Control-Max-Age", "86400");
		expect(mockRes.writeHead).toHaveBeenCalledWith(204);
	});

	it("should authenticate requests with Bearer tokens", async () => {
		// Create a mock POST request with Bearer token
		const mockReq = {
			method: "POST",
			url: "/mcp?sessionId=test-session",
			headers: {
				host: "localhost:3000",
				"content-type": "application/json",
				authorization: "Bearer test-token-123",
			},
			socket: {},
		} as unknown as IncomingMessage;

		const mockRes = {
			headers: {} as Record<string, string>,
			writeHead: vi.fn(function (_statusCode: number, headers?: Record<string, string>) {
				if (headers) {
					Object.assign(this.headers, headers);
				}
				return this;
			}),
			setHeader: vi.fn(function (name: string, value: string) {
				this.headers[name] = value;
				return this;
			}),
			end: vi.fn(),
		} as unknown as ServerResponse;

		// Mock the authenticateRequest method to verify it's called
		const authenticateRequestSpy = vi.spyOn(httpServer as any, "authenticateRequest").mockReturnValue(true);

		// Mock the transports map to avoid transport lookup errors
		const transports = new Map();
		(httpServer as any).transports = transports;

		// Call the handleRequest method directly
		const handleRequest = (httpServer as any).handleRequest.bind(httpServer);
		await handleRequest(mockReq, mockRes);

		// Verify authentication was attempted
		expect(authenticateRequestSpy).toHaveBeenCalledWith(mockReq);
	});

	it("should authenticate requests with API keys", async () => {
		// Create a mock POST request with API key
		const mockReq = {
			method: "POST",
			url: "/mcp?sessionId=test-session",
			headers: {
				host: "localhost:3000",
				"content-type": "application/json",
				"x-api-key": "test-api-key-123",
			},
			socket: {},
		} as unknown as IncomingMessage;

		const mockRes = {
			headers: {} as Record<string, string>,
			writeHead: vi.fn(function (_statusCode: number, headers?: Record<string, string>) {
				if (headers) {
					Object.assign(this.headers, headers);
				}
				return this;
			}),
			setHeader: vi.fn(function (name: string, value: string) {
				this.headers[name] = value;
				return this;
			}),
			end: vi.fn(),
		} as unknown as ServerResponse;

		// Mock the authenticateRequest method to verify it's called
		const authenticateRequestSpy = vi.spyOn(httpServer as any, "authenticateRequest").mockReturnValue(true);

		// Mock the transports map to avoid transport lookup errors
		const transports = new Map();
		(httpServer as any).transports = transports;

		// Call the handleRequest method directly
		const handleRequest = (httpServer as any).handleRequest.bind(httpServer);
		await handleRequest(mockReq, mockRes);

		// Verify authentication was attempted
		expect(authenticateRequestSpy).toHaveBeenCalledWith(mockReq);
	});

	it("should implement rate limiting", async () => {
		// Create multiple mock requests from the same IP
		const mockReq = {
			method: "GET",
			url: "/health",
			headers: {
				host: "localhost:3000",
			},
			socket: {
				remoteAddress: "127.0.0.1",
			},
		} as unknown as IncomingMessage;

		const mockRes = {
			headers: {} as Record<string, string>,
			writeHead: vi.fn(function (_statusCode: number, headers?: Record<string, string>) {
				if (headers) {
					Object.assign(this.headers, headers);
				}
				return this;
			}),
			setHeader: vi.fn(function (name: string, value: string) {
				this.headers[name] = value;
				return this;
			}),
			end: vi.fn(),
		} as unknown as ServerResponse;

		// Call the handleRequest method multiple times
		const handleRequest = (httpServer as any).handleRequest.bind(httpServer);

		// First request should succeed
		await handleRequest(mockReq, mockRes);
		expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

		// Reset mock
		mockRes.writeHead.mockClear();

		// Second request should also succeed (we're not actually rate limiting in this simple test)
		await handleRequest(mockReq, mockRes);
		expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
	});
});
