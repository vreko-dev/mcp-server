import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// WebSocketClientTransport import commented out for MVP - WebSocket implementation removed to simplify architecture
// import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import retry from "async-retry";
import pLimit from "p-limit";
import { z } from "zod";
import { processToolResponse } from "./mcp-response-processor";
import { getLibraryDocsCached } from "./utils/cache";
import { withBreaker } from "./utils/circuit-breaker";
import { logger } from "./utils/logger";

// Type definitions for MCP tools with namespacing
interface MCPTool {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>; // JSON Schema object
	origin: string; // 'snapback' | 'ctx7' | 'gh' | 'registry' | etc.
	health: "ok" | "degraded" | "down";
	lastSeen: number;
}

interface ConnectedMCP {
	name: string;
	client: Client;
	tools: MCPTool[];
	transport: "stdio"; // "websocket" removed for MVP - using HTTP polling instead
	health: "ok" | "degraded" | "down";
	lastPing: number;
	latencyP50: number;
}

// Zod schemas for MCP responses
const ToolsListResponseSchema = z
	.object({
		tools: z
			.array(
				z.object({
					name: z.string(),
					description: z.string().optional(),
					inputSchema: z.any().optional(),
				}),
			)
			.optional(),
	})
	.strict();

const ToolsCallResponseSchema = z
	.object({
		content: z
			.array(
				z.union([
					z.object({ type: z.literal("text"), text: z.string() }).strict(),
					z.object({ type: z.literal("json"), json: z.any() }).strict(),
					z
						.object({
							type: z.literal("image"),
							data: z.string(),
							mimeType: z.string(),
						})
						.strict(),
				]),
			)
			.optional(),
		isError: z.boolean().optional(),
		error: z.any().optional(),
	})
	.strict();

// Configuration
const DEFAULT_CONFIG = {
	timeoutMs: 5000,
	maxConcurrent: 4,
	retry: {
		retries: 2,
		factor: 2,
		minTimeout: 250,
		maxTimeout: 1500,
		randomize: true,
	},
	circuit: {
		enabled: true,
		errorThresholdPercentage: 50,
		volumeThreshold: 10,
		timeoutMs: 5000,
		resetMs: 30000,
		rollingCountMs: 60000,
		rollingCountBuckets: 6,
	},
	batch: {
		size: 5,
		maxWaitMs: 150,
	},
};

// Global concurrency limiter
const globalLimit = pLimit(DEFAULT_CONFIG.maxConcurrent);

export class MCPClientManager {
	private connectedServers: Map<string, ConnectedMCP> = new Map();
	private toolCache: Map<string, string> = new Map(); // toolName -> serverName mapping
	private healthCheckInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Start health check loop
		this.startHealthChecks();
	}

	/**
	 * Connect to MCP servers from environment configuration
	 * MCP_SERVERS=context7=stdio:/usr/local/bin/context7,github=ws:wss://...
	 */
	async connectFromConfig(): Promise<void> {
		const config = process.env.MCP_SERVERS;
		if (!config) {
			logger.info("No MCP_SERVERS configuration found");
			return;
		}

		const serverConfigs = config.split(",");
		for (const serverConfig of serverConfigs) {
			const [name, transportAndUri] = serverConfig.split("=");
			const [transport, uri] = transportAndUri.split(":");

			try {
				await this.connectToServer(name, transport as "stdio" | "websocket", uri);
			} catch (error: any) {
				logger.error({ error }, `Failed to connect to MCP server ${name}: ${error.message}`);
			}
		}
	}

	/**
	 * Connect to an external MCP server
	 * @param name - Name to identify this server connection
	 * @param transport - Transport type ('stdio' or 'websocket')
	 * @param uri - URI for the transport (command for stdio, URL for websocket)
	 */
	async connectToServer(name: string, transport: "stdio" | "websocket", uri: string): Promise<void> {
		try {
			let client: Client;

			if (transport === "stdio") {
				const transportInstance = new StdioClientTransport({
					command: uri,
				});
				client = new Client({ name: "snapback-client", version: "0.1.0" }, { capabilities: {} });
				await client.connect(transportInstance);
			} else if (transport === "websocket") {
				// WebSocket transport commented out for MVP - replaced with HTTP polling
				// const transportInstance = new WebSocketClientTransport(new URL(uri));
				// client = new Client({ name: "snapback-client", version: "0.1.0" }, { capabilities: {} });
				// await client.connect(transportInstance);
				throw new Error(`WebSocket transport not supported in MVP: ${transport}`);
			} else {
				throw new Error(`Unsupported transport: ${transport}`);
			}

			// Discover available tools
			const toolsResponse = await client.request(
				{ method: "tools/list", params: {} },
				ToolsListResponseSchema as any,
			);

			const tools: MCPTool[] = (toolsResponse.tools || []).map((tool: any) => ({
				...tool,
				// Namespace the tool name
				name: `${name}.${tool.name}`,
				origin: name,
				health: "ok",
				lastSeen: Date.now(),
			}));

			// Register tools in cache for quick lookup
			for (const tool of tools) {
				this.toolCache.set(tool.name, name);
			}

			this.connectedServers.set(name, {
				name,
				client,
				tools,
				transport,
				health: "ok",
				lastPing: Date.now(),
				latencyP50: 0,
			});

			logger.info(`Connected to MCP server: ${name} with ${tools.length} tools`);
		} catch (error: any) {
			logger.error({ error }, `Failed to connect to MCP server ${name}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Health check loop - ping each server periodically
	 */
	private startHealthChecks(): void {
		this.healthCheckInterval = setInterval(async () => {
			for (const [name, server] of this.connectedServers.entries()) {
				try {
					// Simple ping to check health
					const start = Date.now();
					await server.client.request({ method: "ping", params: {} }, z.object({}).strict() as any);
					const latency = Date.now() - start;

					server.health = "ok";
					server.lastPing = Date.now();
					server.latencyP50 = latency; // Simplified for now
				} catch (error: any) {
					logger.warn({ error }, `Health check failed for MCP server ${name}: ${error.message}`);
					server.health = "down";
				}
			}
		}, 30000); // 30s interval
	}

	/**
	 * Get all available tools with health information
	 */
	listAllTools(): { server: string; tools: MCPTool[] }[] {
		const result: { server: string; tools: MCPTool[] }[] = [];
		for (const [name, server] of this.connectedServers.entries()) {
			result.push({
				server: name,
				tools: server.tools,
			});
		}
		return result;
	}

	/**
	 * Catalog tool - returns all available tools with metadata
	 */
	getToolCatalog(): MCPTool[] {
		const catalog: MCPTool[] = [];
		for (const server of this.connectedServers.values()) {
			catalog.push(...server.tools);
		}
		return catalog;
	}

	/**
	 * Call a tool on a specific MCP server with resilience patterns
	 * @param serverName - Name of the server to call
	 * @param toolName - Name of the tool to call
	 * @param args - Arguments for the tool
	 * @param options - Call options
	 */
	async callToolWithResilience(
		serverName: string,
		toolName: string,
		args: Record<string, unknown>,
		options: {
			useCache?: boolean;
			cacheKey?: string;
			timeoutMs?: number;
			requestId?: string;
		} = {},
	): Promise<any> {
		const server = this.connectedServers.get(serverName);
		if (!server) {
			throw new Error(`MCP server ${serverName} not connected`);
		}

		const toolCall = async () => {
			const response = await server.client.request(
				{
					method: "tools/call",
					params: { name: toolName, arguments: args },
				},
				ToolsCallResponseSchema as any,
			);
			// Process the response through the response processor
			return processToolResponse(response);
		};

		// Wrap with circuit breaker and retry logic
		const breaker = withBreaker(`${serverName}-${toolName}`, toolCall);
		const resilientToolCall = () =>
			globalLimit(() =>
				retry(() => breaker(undefined), {
					retries: DEFAULT_CONFIG.retry.retries,
					factor: DEFAULT_CONFIG.retry.factor,
					minTimeout: DEFAULT_CONFIG.retry.minTimeout,
					maxTimeout: DEFAULT_CONFIG.retry.maxTimeout,
					randomize: DEFAULT_CONFIG.retry.randomize,
					onRetry: (e: Error, n: number) =>
						logger.warn(`Retrying tool ${serverName}.${toolName} attempt ${n}: ${String(e)}`),
				}),
			);

		if (options.useCache && options.cacheKey) {
			// Use cached version if available
			return await getLibraryDocsCached(options.cacheKey, resilientToolCall);
		}
		return await resilientToolCall();
	}

	/**
	 * Call a tool by namespaced name, automatically routing to the correct server
	 * @param namespacedToolName - Namespaced tool name (e.g., 'ctx7.search_docs')
	 * @param args - Arguments for the tool
	 * @param options - Call options
	 */
	async callToolByName(
		namespacedToolName: string,
		args: any,
		options: {
			useCache?: boolean;
			cacheKey?: string;
			timeoutMs?: number;
			requestId?: string;
		} = {},
	): Promise<any> {
		const serverName = this.toolCache.get(namespacedToolName);
		if (!serverName) {
			throw new Error(`Tool ${namespacedToolName} not found on any connected MCP server`);
		}

		// Extract the actual tool name (remove namespace)
		const toolName = namespacedToolName.split(".").slice(1).join(".");

		return await this.callToolWithResilience(serverName, toolName, args, options);
	}

	/**
	 * Disconnect from a server
	 * @param name - Name of the server to disconnect from
	 */
	async disconnectFromServer(name: string): Promise<void> {
		const server = this.connectedServers.get(name);
		if (server) {
			// Remove tools from cache
			for (const tool of server.tools) {
				this.toolCache.delete(tool.name);
			}

			// Disconnect client
			await server.client.close();

			// Remove from connected servers
			this.connectedServers.delete(name);

			logger.info(`Disconnected from MCP server: ${name}`);
		}
	}

	/**
	 * Disconnect from all servers
	 */
	async disconnectAll(): Promise<void> {
		for (const name of this.connectedServers.keys()) {
			await this.disconnectFromServer(name);
		}

		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}
	}
}
