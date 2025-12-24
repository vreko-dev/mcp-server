import { analyze, type Envelope, evaluatePolicy, ingestTelemetry, SnapbackClient } from "@snapback/sdk";

/**
 * SDK Adapter for MCP Server
 * Wraps the Snapback SDK for use in the MCP server
 */

export class MCPSDKAdapter {
	private client: SnapbackClient;
	private sessionId: string;

	constructor(config: { baseUrl: string; apiKey: string }) {
		// Generate a session ID for this MCP session
		this.sessionId = this.generateSessionId();

		// Initialize the Snapback client
		this.client = new SnapbackClient({
			endpoint: config.baseUrl,
			apiKey: config.apiKey,
			privacy: {
				hashFilePaths: true,
				anonymizeWorkspace: false,
			},
			cache: {
				enabled: true,
				ttl: {},
			},
			retry: {
				maxRetries: 3,
				backoffMs: 1000,
			},
		});
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Create envelope for requests
	 */
	private createEnvelope(workspaceId?: string): Envelope {
		return {
			session_id: this.sessionId,
			request_id: this.generateRequestId(),
			workspace_id: workspaceId,
			client: "mcp",
		};
	}

	/**
	 * Generate a unique request ID
	 */
	private generateRequestId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Analyze code content
	 */
	async analyzeContent(content: string, filePath: string, workspaceId?: string, language?: string): Promise<any> {
		const envelope = this.createEnvelope(workspaceId);

		return await analyze(this.client, envelope, {
			content,
			filePath,
			language,
		});
	}

	/**
	 * Evaluate policy
	 */
	async evaluatePolicy(context: Record<string, any>, workspaceId?: string): Promise<any> {
		const envelope = this.createEnvelope(workspaceId);

		return await evaluatePolicy(this.client, envelope, {
			context,
		});
	}

	/**
	 * Ingest telemetry data
	 */
	async ingestTelemetry(eventType: string, payload: Record<string, any>, workspaceId?: string): Promise<any> {
		const envelope = this.createEnvelope(workspaceId);

		return await ingestTelemetry(this.client, envelope, {
			eventType,
			payload,
			timestamp: Date.now(),
		});
	}
}
