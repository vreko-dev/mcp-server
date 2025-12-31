import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { getAllowedCorsOrigin, getMaxBodySize, validateApiKey, validateWorkspace } from "./validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

// Simple logger for deployment (no external dependencies)
const logger = {
	info: (msg: string, context?: Record<string, unknown>) => {
		if (process.env.LOG_LEVEL !== "silent") {
			console.log(`[INFO] ${msg}`, context ? JSON.stringify(context) : "");
		}
	},
	warn: (msg: string, context?: Record<string, unknown>) => {
		console.warn(`[WARN] ${msg}`, context ? JSON.stringify(context) : "");
	},
	error: (msg: string, context?: Record<string, unknown>) => {
		console.error(`[ERROR] ${msg}`, context ? JSON.stringify(context) : "");
	},
};

// Handler functions
function handleHealth(res: ServerResponse): void {
	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(
		JSON.stringify({
			status: "healthy",
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		}),
	);
}

function handleTools(res: ServerResponse): void {
	const tools = [
		{
			name: "snapback.analyze",
			tier: "free",
			description: "Analyze code changes for risks or validate packages",
		},
		{
			name: "snapback.prepare_workspace",
			tier: "free",
			description: "Pre-flight workspace check",
		},
		{
			name: "snapback.validate",
			tier: "free",
			description: "Validate code against patterns",
		},
		{
			name: "snapback.context",
			tier: "free",
			description: "Context operations",
		},
		{
			name: "snapback.session",
			tier: "free",
			description: "Session management",
		},
		{
			name: "snapback.learn",
			tier: "free",
			description: "Record learnings",
		},
		{
			name: "snapback.acknowledge_risk",
			tier: "free",
			description: "Acknowledge risk and proceed",
		},
		{
			name: "snapback.meta",
			tier: "free",
			description: "Get tool metadata",
		},
		{
			name: "snapback.snapshot_create",
			tier: "pro",
			description: "Create code snapshots",
		},
		{
			name: "snapback.snapshot_list",
			tier: "pro",
			description: "List snapshots",
		},
		{
			name: "snapback.snapshot_restore",
			tier: "pro",
			description: "Restore from snapshot",
		},
	];

	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ tools, count: tools.length }));
}

async function handleMcp(res: ServerResponse, body: string, requestId: string): Promise<void> {
	let parsedBody: any;
	try {
		parsedBody = JSON.parse(body);
	} catch (parseError) {
		const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
		logger.error("JSON parse failed", {
			requestId,
			error: errorMsg,
			bodyPreview: body.substring(0, 100),
		});
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				error: "BAD_REQUEST",
				message: "Invalid JSON body",
			}),
		);
		return;
	}

	const { workspace, apiKey, command = "mcp", args } = parsedBody;

	// P0-7: Validate workspace path FIRST (before auth)
	const workspaceValidation = validateWorkspace(workspace);
	if (!workspaceValidation.valid) {
		logger.warn("Workspace validation failed", {
			requestId,
			error: workspaceValidation.error,
			workspace,
		});
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				error: "BAD_REQUEST",
				message: workspaceValidation.error,
			}),
		);
		return;
	}

	// P0-4: Validate API key format
	const apiKeyValidation = validateApiKey(apiKey);
	if (!apiKeyValidation.valid) {
		logger.warn("API key validation failed", {
			requestId,
			error: apiKeyValidation.error,
		});
		res.writeHead(401, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				error: "UNAUTHORIZED",
				message: apiKeyValidation.error,
			}),
		);
		return;
	}

	try {
		logger.info("Starting MCP server", {
			requestId,
			workspace,
			command,
		});

		// Spawn CLI MCP server as subprocess
		const mcpProcess = spawn(
			"node",
			[path.join(__dirname, "../../cli/dist/index.js"), command, "--stdio", "--workspace", workspace],
			{
				env: {
					...process.env,
					SNAPBACK_API_KEY: apiKey,
					SNAPBACK_WORKSPACE_ROOT: workspace,
					NODE_ENV,
					MCP_QUIET: "1",
				},
				stdio: ["pipe", "pipe", "pipe"],
			},
		);

		let outputBuffer = "";

		mcpProcess.stdout?.on("data", (data: Buffer) => {
			outputBuffer += data.toString();
		});

		mcpProcess.stderr?.on("data", (data: Buffer) => {
			logger.error("MCP process stderr", {
				requestId,
				error: data.toString(),
			});
		});

		const jsonRpcRequest = JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: args?.method || "tools/list",
			params: args?.params || {},
		});

		mcpProcess.stdin?.write(`${jsonRpcRequest}\n`);
		mcpProcess.stdin?.end();

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				mcpProcess.kill();
				reject(new Error("MCP server timeout (30s)"));
			}, 30000);

			mcpProcess.on("close", (code: number) => {
				clearTimeout(timeout);
				if (code !== 0 && !outputBuffer) {
					reject(new Error(`MCP process exited with code ${code}`));
				}
				resolve();
			});

			mcpProcess.on("error", (err: Error) => {
				clearTimeout(timeout);
				reject(err);
			});
		});

		if (!outputBuffer) {
			throw new Error("No response from MCP server");
		}

		const response = JSON.parse(outputBuffer);
		logger.info("MCP request completed", {
			requestId,
			hasError: response.error !== undefined,
		});

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(response));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error("MCP request failed", {
			requestId,
			error: message,
		});

		res.writeHead(500, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				jsonrpc: "2.0",
				error: {
					code: -32603,
					message: `Internal MCP error: ${message}`,
				},
			}),
		);
	}
}

// Create HTTP server
const app = createServer(async (req: IncomingMessage, res: ServerResponse) => {
	const corsOrigin = process.env.CORS_ORIGIN || "*";
	const requestOrigin = req.headers.origin;

	// P0-8: Handle CORS with multiple origin support
	const allowedOrigin = getAllowedCorsOrigin(requestOrigin, corsOrigin);

	res.setHeader("Access-Control-Allow-Origin", allowedOrigin || corsOrigin);
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		res.writeHead(200);
		res.end();
		return;
	}

	const requestId = randomUUID();
	const url = new URL(req.url || "", `http://${req.headers.host}`);
	logger.info("Incoming request", {
		requestId,
		method: req.method,
		path: url.pathname,
	});

	// P1-3: Collect body with size limit
	const maxSize = getMaxBodySize();
	let body = "";
	let bodySize = 0;

	req.on("data", (chunk) => {
		bodySize += chunk.length;
		if (bodySize > maxSize) {
			res.writeHead(413, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					error: "PAYLOAD_TOO_LARGE",
					message: `Request body exceeds maximum size of ${maxSize} bytes`,
				}),
			);
			req.destroy();
			return;
		}
		body += chunk.toString();
	});

	req.on("end", async () => {
		try {
			if (req.method === "GET" && url.pathname === "/health") {
				handleHealth(res);
			} else if (req.method === "GET" && url.pathname === "/tools") {
				handleTools(res);
			} else if (req.method === "POST" && url.pathname === "/mcp") {
				await handleMcp(res, body, requestId);
			} else {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						error: "NOT_FOUND",
						message: "Endpoint not found",
					}),
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error("Unhandled error", { error: message });
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					error: "INTERNAL_ERROR",
					message: NODE_ENV === "production" ? "Internal server error" : message,
				}),
			);
		}
	});
});

// Start server
const server = app.listen(PORT, () => {
	logger.info("SnapBack MCP Server started", {
		port: PORT,
		env: NODE_ENV,
		timestamp: new Date().toISOString(),
	});
});

// Graceful shutdown
process.on("SIGTERM", () => {
	logger.info("SIGTERM received, shutting down gracefully");
	server.close(() => {
		logger.info("Server closed");
		process.exit(0);
	});
});

process.on("SIGINT", () => {
	logger.info("SIGINT received, shutting down gracefully");
	server.close(() => {
		logger.info("Server closed");
		process.exit(0);
	});
});

export default app;
