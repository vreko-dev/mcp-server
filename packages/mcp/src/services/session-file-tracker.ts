/**
 * SessionFileTracker - Track files touched during MCP sessions
 *
 * Bridges the gap when neither daemon nor extension is available.
 * Tracks files mentioned in:
 * - snap m:s task start (planned files)
 * - check tool validations
 * - snap_learn file references
 *
 * Used by what_changed when local fallback is active.
 *
 * @module services/session-file-tracker
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

// =============================================================================
// Types
// =============================================================================

/**
 * A file tracked during the session
 */
export interface TrackedFile {
	/** File path relative to workspace */
	path: string;
	/** How the file was tracked */
	source: "planned" | "validated" | "mentioned" | "edited";
	/** When the file was first tracked */
	firstTracked: number;
	/** When the file was last touched */
	lastTouched: number;
	/** Estimated lines changed (if available) */
	linesChanged?: number;
	/** File size at last check */
	size?: number;
}

/**
 * Session file tracking state
 */
interface SessionFileState {
	/** Current task ID */
	taskId: string | null;
	/** Task start time */
	taskStartedAt: number | null;
	/** Tracked files */
	files: Map<string, TrackedFile>;
}

// =============================================================================
// Constants
// =============================================================================

const STATE_FILE = ".snapback/mcp/session-files.json";

// =============================================================================
// SessionFileTracker
// =============================================================================

export class SessionFileTracker {
	private workspaceRoot: string;
	private state: SessionFileState;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.state = this.loadState();
	}

	/**
	 * Start tracking for a new task
	 */
	startTask(taskId: string, plannedFiles: string[] = []): void {
		this.state = {
			taskId,
			taskStartedAt: Date.now(),
			files: new Map(),
		};

		// Track planned files
		for (const file of plannedFiles) {
			this.trackFile(file, "planned");
		}

		this.saveState();
	}

	/**
	 * End tracking for current task
	 */
	endTask(): TrackedFile[] {
		const files = this.getTrackedFiles();
		this.state = {
			taskId: null,
			taskStartedAt: null,
			files: new Map(),
		};
		this.saveState();
		return files;
	}

	/**
	 * Track a file
	 */
	trackFile(filePath: string, source: TrackedFile["source"], linesChanged?: number): void {
		if (!this.state.taskId) {
			return; // No active task
		}

		// Normalize path
		const normalizedPath = filePath.startsWith(this.workspaceRoot)
			? relative(this.workspaceRoot, filePath)
			: filePath;

		const now = Date.now();
		const existing = this.state.files.get(normalizedPath);

		if (existing) {
			// Update existing entry
			existing.lastTouched = now;
			if (linesChanged !== undefined) {
				existing.linesChanged = (existing.linesChanged || 0) + linesChanged;
			}
			// Upgrade source priority: edited > validated > mentioned > planned
			const sourcePriority = { edited: 4, validated: 3, mentioned: 2, planned: 1 };
			if (sourcePriority[source] > sourcePriority[existing.source]) {
				existing.source = source;
			}
		} else {
			// New entry
			const fullPath = join(this.workspaceRoot, normalizedPath);
			let size: number | undefined;
			try {
				if (existsSync(fullPath)) {
					size = statSync(fullPath).size;
				}
			} catch {
				// Ignore stat errors
			}

			this.state.files.set(normalizedPath, {
				path: normalizedPath,
				source,
				firstTracked: now,
				lastTouched: now,
				linesChanged,
				size,
			});
		}

		this.saveState();
	}

	/**
	 * Track multiple files at once
	 */
	trackFiles(files: string[], source: TrackedFile["source"]): void {
		for (const file of files) {
			this.trackFile(file, source);
		}
	}

	/**
	 * Get all tracked files for current task
	 */
	getTrackedFiles(): TrackedFile[] {
		return Array.from(this.state.files.values());
	}

	/**
	 * Get files changed since task start (for what_changed)
	 */
	getChangedFiles(): Array<{
		file: string;
		type: "created" | "modified" | "deleted";
		linesChanged: number;
		aiAttributed: boolean;
		timestamp: number;
	}> {
		const files = this.getTrackedFiles();

		return files.map((f) => ({
			file: f.path,
			type: this.determineChangeType(f),
			linesChanged: f.linesChanged || 0,
			aiAttributed: f.source === "edited" || f.source === "validated",
			timestamp: f.lastTouched,
		}));
	}

	/**
	 * Determine change type based on file state
	 */
	private determineChangeType(file: TrackedFile): "created" | "modified" | "deleted" {
		const fullPath = join(this.workspaceRoot, file.path);
		if (!existsSync(fullPath)) {
			return "deleted";
		}
		// If tracked from task start, likely created or modified
		// We can't know for sure without git, so default to modified
		return "modified";
	}

	/**
	 * Check if currently tracking a task
	 */
	hasActiveTask(): boolean {
		return this.state.taskId !== null;
	}

	/**
	 * Get current task ID
	 */
	getCurrentTaskId(): string | null {
		return this.state.taskId;
	}

	/**
	 * Get task duration in ms
	 */
	getTaskDuration(): number {
		if (!this.state.taskStartedAt) {
			return 0;
		}
		return Date.now() - this.state.taskStartedAt;
	}

	/**
	 * Get stats for the current session
	 */
	getStats(): {
		filesTracked: number;
		totalLinesChanged: number;
		durationMs: number;
	} {
		const files = this.getTrackedFiles();
		return {
			filesTracked: files.length,
			totalLinesChanged: files.reduce((sum, f) => sum + (f.linesChanged || 0), 0),
			durationMs: this.getTaskDuration(),
		};
	}

	// =========================================================================
	// Persistence
	// =========================================================================

	private getStatePath(): string {
		return join(this.workspaceRoot, STATE_FILE);
	}

	private loadState(): SessionFileState {
		const statePath = this.getStatePath();
		try {
			if (existsSync(statePath)) {
				const data = JSON.parse(readFileSync(statePath, "utf8"));
				return {
					taskId: data.taskId || null,
					taskStartedAt: data.taskStartedAt || null,
					files: new Map(Object.entries(data.files || {})),
				};
			}
		} catch {
			// Ignore load errors
		}
		return {
			taskId: null,
			taskStartedAt: null,
			files: new Map(),
		};
	}

	private saveState(): void {
		const statePath = this.getStatePath();
		try {
			const dir = dirname(statePath);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}

			const data = {
				taskId: this.state.taskId,
				taskStartedAt: this.state.taskStartedAt,
				files: Object.fromEntries(this.state.files),
			};
			writeFileSync(statePath, JSON.stringify(data, null, 2));
		} catch {
			// Ignore save errors
		}
	}
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create SessionFileTracker instance
 */
export function createSessionFileTracker(workspaceRoot: string): SessionFileTracker {
	return new SessionFileTracker(workspaceRoot);
}

// =============================================================================
// Singleton per workspace
// =============================================================================

const trackers = new Map<string, SessionFileTracker>();

/**
 * Get or create tracker for workspace (singleton pattern)
 */
export function getSessionFileTracker(workspaceRoot: string): SessionFileTracker {
	if (!trackers.has(workspaceRoot)) {
		trackers.set(workspaceRoot, new SessionFileTracker(workspaceRoot));
	}
	return trackers.get(workspaceRoot)!;
}
