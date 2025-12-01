import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import contentType from "content-type";
import getRawBody from "raw-body";

const MAXIMUM_MESSAGE_SIZE = "4mb";

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
	private requests: Map<string, { count: number; resetTime: number }> = new Map();
	private windowMs: number;
	private maxRequests: number;

	constructor(windowMs = 60000, maxRequests = 100) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
	}

	isAllowed(ip: string): boolean {
		const now = Date.now();
		const window = this.requests.get(ip);

		if (!window || window.resetTime <= now) {
			// Reset the window
			this.requests.set(ip, {
				count: 1,
				resetTime: now + this.windowMs,
			});
			return true;
		}

		if (window.count >= this.maxRequests) {
			// Rate limit exceeded
			return false;
		}

		// Increment the count
		window.count++;
		return true;
	}

	reset(): void {
		this.requests.clear();
	}
}

/**
 * HTTP server for MCP that handles both SSE connections and POST requests
 * With enhanced security features
 */
export class MCPHttpServer {
	private server: any; // HTTP server instance
	private mcpServer: Server;
	private transports: Map<string, SSEServerTransport> = new Map();
	private rateLimiter: RateLimiter;

	constructor(mcpServer: Server) {
		this.mcpServer = mcpServer;
		this.rateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
		this.server = createServer(this.handleRequest.bind(this));
	}

	/**
	 * Handle incoming HTTP requests
	 */
	private async handleRequest(req: IncomingMessage, res: ServerResponse) {
		try {
			// Apply security headers
			this.applySecurityHeaders(res);

			const url = new URL(req.url || "/", `http://${req.headers.host}`);

			// Handle CORS preflight requests
			if (req.method === "OPTIONS") {
				this.handleCorsPreflight(req, res);
				return;
			}

			// Apply rate limiting
			if (!this.checkRateLimit(req, res)) {
				return;
			}

			// Handle SSE connection requests (GET)
			if (req.method === "GET" && url.pathname === "/mcp") {
				await this.handleSSEConnection(req, res);
				return;
			}

			// Handle MCP message requests (POST)
			if (req.method === "POST" && url.pathname === "/mcp") {
				await this.handlePostMessage(req, res);
				return;
			}

			// Handle health check
			if (req.method === "GET" && url.pathname === "/health") {
				await this.handleHealthCheck(req, res);
				return;
			}

			// Handle version check
			if (req.method === "GET" && url.pathname === "/version") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ version: "0.1.1", name: "snapback-mcp" }));
				return;
			}

			// 404 for unknown routes
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Not found" }));
		} catch (error) {
			console.error("HTTP server error:", error);
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Internal server error" }));
		}
	}

	/**
	 * Apply security headers to responses
	 */
	private applySecurityHeaders(res: ServerResponse): void {
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("X-Frame-Options", "DENY");
		res.setHeader("X-XSS-Protection", "1; mode=block");
		res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
		res.setHeader("Content-Security-Policy", "default-src 'self'");
	}

	/**
	 * Handle CORS preflight requests
	 */
	private handleCorsPreflight(req: IncomingMessage, res: ServerResponse): void {
		const origin = req.headers.origin;
		const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

		// Check if origin is allowed
		const isAllowed =
			allowedOrigins.includes("*") ||
			(origin && allowedOrigins.includes(origin)) ||
			// Allow localhost for development
			origin?.startsWith("http://localhost:");

		if (isAllowed) {
			res.setHeader("Access-Control-Allow-Origin", origin || "*");
		}

		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
		res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
		res.writeHead(204);
		res.end();
	}

	/**
	 * Check rate limiting for requests
	 */
	private checkRateLimit(req: IncomingMessage, res: ServerResponse): boolean {
		const clientIp = this.getClientIp(req);

		if (!this.rateLimiter.isAllowed(clientIp)) {
			res.writeHead(429, {
				"Content-Type": "application/json",
				"Retry-After": "60",
			});
			res.end(
				JSON.stringify({
					error: "Too Many Requests",
					message: "Rate limit exceeded. Please try again later.",
				}),
			);
			return false;
		}

		return true;
	}

	/**
	 * Get client IP address
	 */
	private getClientIp(req: IncomingMessage): string {
		return (
			(req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
			(req.headers["x-real-ip"] as string) ||
			req.socket?.remoteAddress ||
			"unknown"
		);
	}

	/**
	 * Handle health check requests
	 */
	private async handleHealthCheck(_req: IncomingMessage, res: ServerResponse): Promise<void> {
		// Import health check utilities
		const { createHealthCheck, checkHttpService } = await import("@snapback/health");

		// Create health check with API dependency
		const healthCheck = createHealthCheck({
			service: "snapback-mcp",
			version: "1.0.0",
			dependencies: [
				{
					name: "api",
					check: () => checkHttpService(process.env.API_URL || "http://api:8080"),
				},
			],
		});

		const health = await healthCheck();
		const statusCode = health.status === "healthy" ? 200 : 503;
		res.writeHead(statusCode, {
			"Content-Type": "application/json",
			"Cache-Control": "no-cache, no-store, must-revalidate",
		});
		res.end(JSON.stringify(health));
	}

	/**
	 * Handle SSE connection requests
	 */
	private async handleSSEConnection(req: IncomingMessage, res: ServerResponse) {
		try {
			// Authenticate the connection
			if (!this.authenticateRequest(req)) {
				res.writeHead(401, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Unauthorized" }));
				return;
			}

			// Create a new SSE transport for this connection
			const transport = new SSEServerTransport("/mcp", res);

			// Store transport by session ID
			this.transports.set(transport.sessionId, transport);

			// Set up cleanup when transport closes
			transport.onclose = () => {
				this.transports.delete(transport.sessionId);
			};

			// Connect the MCP server to this transport
			await this.mcpServer.connect(transport);

			// Start the SSE connection
			await transport.start();
		} catch (error) {
			console.error("SSE connection error:", error);
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Failed to establish SSE connection" }));
		}
	}

	/**
	 * Handle POST message requests
	 */
	private async handlePostMessage(req: IncomingMessage, res: ServerResponse) {
		try {
			// Authenticate the request
			if (!this.authenticateRequest(req)) {
				res.writeHead(401, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Unauthorized" }));
				return;
			}

			// Parse query parameters to get session ID
			const url = new URL(req.url || "/", `http://${req.headers.host}`);
			const sessionId = url.searchParams.get("sessionId");

			if (!sessionId) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Missing sessionId parameter" }));
				return;
			}

			// Find the transport for this session
			const transport = this.transports.get(sessionId);
			if (!transport) {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Session not found" }));
				return;
			}

			// Parse content type
			const ct = contentType.parse(req.headers["content-type"] || "application/json");
			if (ct.type !== "application/json") {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: `Unsupported content-type: ${ct.type}` }));
				return;
			}

			// Get request body
			const body = await getRawBody(req, {
				limit: MAXIMUM_MESSAGE_SIZE,
				encoding: ct.parameters.charset || "utf-8",
			});

			// Parse JSON message
			const _message = JSON.parse(body.toString());

			// Handle the message with the transport
			await transport.handlePostMessage(req, res);
		} catch (error) {
			console.error("POST message error:", error);
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Invalid message" }));
		}
	}

	/**
	 * Authenticate incoming requests
	 */
	private authenticateRequest(req: IncomingMessage): boolean {
		// Check for Authorization header (Bearer token)
		const authHeader = req.headers.authorization;
		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.substring(7); // Remove "Bearer " prefix
			// In a real implementation, validate the token against a service
			// For now, we'll accept any non-empty token
			return token.length > 0;
		}

		// Check for X-API-Key header
		const apiKey = req.headers["x-api-key"];
		if (apiKey && typeof apiKey === "string") {
			// In a real implementation, validate the API key against a service
			// For now, we'll accept any non-empty API key
			return apiKey.length > 0;
		}

		// If no authentication provided, reject in production
		const isDevelopment = process.env.NODE_ENV === "development";
		if (!isDevelopment) {
			return false;
		}

		// In development, allow unauthenticated requests
		return true;
	}

	/**
	 * Start the HTTP server
	 */
	async listen(port = 3000, host = "localhost"): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(port, host, () => {
				console.log(`MCP HTTP server listening on http://${host}:${port}`);
				resolve();
			});
		});
	}

	/**
	 * Close the HTTP server
	 */
	async close(): Promise<void> {
		// Close all transports
		for (const transport of this.transports.values()) {
			await transport.close();
		}
		this.transports.clear();

		// Close the HTTP server
		return new Promise((resolve) => {
			this.server.close(() => {
				resolve();
			});
		});
	}
}
