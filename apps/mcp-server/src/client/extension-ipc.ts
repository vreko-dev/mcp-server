import { SnapBackEventBusEventEmitter2 as SnapBackEventBus } from "@snapback/events";
import type {
	AnalysisRequest,
	AnalysisResponse,
	IterationStats,
	SessionResponse,
	SnapshotRequest,
	SnapshotResponse,
} from "./snapback-api.js";

/**
 * ExtensionIPCClient - Direct IPC communication with VS Code Extension
 * Replaces HTTP-based SnapBackAPIClient with Unix socket RPC
 */
export class ExtensionIPCClient {
	private eventBus: InstanceType<typeof SnapBackEventBus>;
	private connected: boolean;

	constructor() {
		this.eventBus = new SnapBackEventBus();
		// Initialize the event bus
		this.eventBus.initialize().catch((err: Error) => {
			console.error("[SnapBack MCP] Failed to initialize EventEmitter2 event bus:", err);
		});
		this.connected = false;
	}

	async connect(): Promise<void> {
		// For the new EventEmitter2 implementation, no connection is needed
		this.connected = true;
	}

	async analyzeFast(_request: AnalysisRequest): Promise<AnalysisResponse> {
		// For now, return minimal response
		// Extension doesn't have Guardian integration yet
		return {
			riskLevel: "safe",
			score: 0,
			factors: [],
			analysisTimeMs: 0,
			issues: [],
		};
	}

	async getIterationStats(filePath: string): Promise<IterationStats> {
		return await this.eventBus.request("get_iteration_stats", { filePath });
	}

	async createSnapshot(request: SnapshotRequest): Promise<SnapshotResponse> {
		return await this.eventBus.request("create_snapshot", {
			filePath: request.filePath,
			reason: request.reason,
		});
	}

	async getCurrentSession(): Promise<SessionResponse> {
		// For now, return minimal session data
		// Can enhance Extension to track this
		return {
			consecutiveAIEdits: 0,
			lastEditTimestamp: Date.now(),
			filePath: "",
			riskLevel: "low",
		};
	}

	async getSafetyGuidelines(): Promise<string> {
		return `# Snapback Safety Guidelines

## Protection Levels
- Watch (🟢): Silent auto-snapshotting
- Warn (🟡): Confirmation before save
- Block (🔴): Required snapshot note

## Best Practices
- Create snapshots before major refactors
- Review AI suggestions carefully
- Monitor iteration count (limit: 5 consecutive edits)
`;
	}

	get isConnected(): boolean {
		return this.connected;
	}

	close(): void {
		this.eventBus.close();
		this.connected = false;
	}
}
