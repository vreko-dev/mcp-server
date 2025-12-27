/**
 * GitContextService - Extract git change context
 *
 * Provides git status, branch info, recent commits, and file history
 * to help agents understand change context without re-discovery.
 *
 * @module services/git-context-service
 */

import { execSync } from "node:child_process";
import type {
	FileHistory,
	GitBranch,
	GitContext,
	RecentCommit,
	StagedChange,
	UncommittedChange,
} from "../types/context.js";

// =============================================================================
// Constants
// =============================================================================

/** Maximum recent commits to include */
const MAX_RECENT_COMMITS = 5;

/** Git command timeout in milliseconds */
const GIT_TIMEOUT_MS = 5000;

// =============================================================================
// GitContextService
// =============================================================================

export class GitContextService {
	private workspaceRoot: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}

	/**
	 * Get complete git context for planned files
	 *
	 * Called by begin_task to surface git change context.
	 */
	async getContext(plannedFiles: string[]): Promise<GitContext> {
		try {
			const branch = this.getBranchInfo();
			const uncommittedChanges = this.getUncommittedChanges();
			const stagedChanges = this.getStagedChanges();
			const recentCommits = this.getRecentCommits(plannedFiles);
			const fileHistory = this.getFileHistory(plannedFiles, uncommittedChanges);

			return {
				branch,
				uncommittedChanges,
				stagedChanges,
				recentCommits,
				fileHistory,
			};
		} catch {
			// Return empty context if git fails
			return this.emptyContext();
		}
	}

	/**
	 * Check if workspace is a git repository
	 */
	async isGitRepo(): Promise<boolean> {
		try {
			this.git("rev-parse --git-dir");
			return true;
		} catch {
			return false;
		}
	}

	// ===========================================================================
	// Private Methods
	// ===========================================================================

	/**
	 * Get branch information
	 */
	private getBranchInfo(): GitBranch {
		try {
			const current = this.git("rev-parse --abbrev-ref HEAD").trim();
			const upstream = this.gitSafe("rev-parse --abbrev-ref @{u}")?.trim();
			let ahead = 0;
			let behind = 0;

			if (upstream) {
				try {
					const counts = this.git(`rev-list --left-right --count ${current}...${upstream}`);
					const parts = counts.trim().split(/\s+/);
					if (parts.length >= 2) {
						ahead = Number.parseInt(parts[0], 10) || 0;
						behind = Number.parseInt(parts[1], 10) || 0;
					}
				} catch {
					// Ignore errors getting ahead/behind counts
				}
			}

			return { current, upstream, ahead, behind };
		} catch {
			return { current: "", ahead: 0, behind: 0 };
		}
	}

	/**
	 * Get uncommitted changes in working tree
	 */
	private getUncommittedChanges(): UncommittedChange[] {
		try {
			const status = this.git("status --porcelain");
			const changes: UncommittedChange[] = [];

			for (const line of status.split("\n")) {
				if (!line.trim()) continue;

				// Git status format: XY filename
				// X = staging area status, Y = working tree status
				const statusCode = line.substring(0, 2);
				const file = line.substring(3).trim();

				// Determine the primary status
				let status: UncommittedChange["status"];
				if (statusCode.includes("?")) {
					status = "?";
				} else if (statusCode.includes("A")) {
					status = "A";
				} else if (statusCode.includes("D")) {
					status = "D";
				} else if (statusCode.includes("R")) {
					status = "R";
				} else if (statusCode.includes("C")) {
					status = "C";
				} else if (statusCode.includes("U")) {
					status = "U";
				} else {
					status = "M";
				}

				changes.push({ file, status });
			}

			return changes;
		} catch {
			return [];
		}
	}

	/**
	 * Get staged changes (ready to commit)
	 */
	private getStagedChanges(): StagedChange[] {
		try {
			const status = this.git("diff --cached --name-status");
			const changes: StagedChange[] = [];

			for (const line of status.split("\n")) {
				if (!line.trim()) continue;

				const parts = line.split("\t");
				if (parts.length < 2) continue;

				const statusCode = parts[0].charAt(0) as StagedChange["status"];
				const file = parts[1].trim();

				if (["A", "M", "D", "R"].includes(statusCode)) {
					changes.push({ file, status: statusCode });
				}
			}

			return changes;
		} catch {
			return [];
		}
	}

	/**
	 * Get recent commits
	 */
	private getRecentCommits(plannedFiles: string[]): RecentCommit[] {
		try {
			const format = '"%H|%s|%an|%ar|%ct"';
			const log = this.git(`log -10 --pretty=format:${format} --name-only`);
			const commits: RecentCommit[] = [];

			// Parse git log output (entries separated by blank lines)
			const entries = log.split("\n\n").filter(Boolean);

			for (const entry of entries) {
				const lines = entry.split("\n");
				if (lines.length === 0) continue;

				// Parse commit info line
				const infoLine = lines[0].replace(/^"|"$/g, "");
				const parts = infoLine.split("|");
				if (parts.length < 5) continue;

				const [fullHash, message, author, date] = parts;
				const files = lines.slice(1).filter(Boolean);

				// Check if any commit files match planned files
				const affectsPlannedFiles =
					plannedFiles.length > 0 &&
					files.some((f) => plannedFiles.some((pf) => f.includes(pf) || pf.includes(f)));

				commits.push({
					hash: fullHash.substring(0, 7),
					message,
					author,
					date,
					filesChanged: files.length,
					affectsPlannedFiles,
				});

				if (commits.length >= MAX_RECENT_COMMITS) break;
			}

			return commits;
		} catch {
			return [];
		}
	}

	/**
	 * Get file history for planned files
	 */
	private getFileHistory(files: string[], uncommittedChanges: UncommittedChange[]): Record<string, FileHistory> {
		const history: Record<string, FileHistory> = {};

		for (const file of files) {
			try {
				const lastCommit = this.gitSafe(`log -1 --pretty=format:"%H" -- "${file}"`);
				const lastModified = this.gitSafe(`log -1 --pretty=format:"%ar" -- "${file}"`);
				const isModifiedByUser = uncommittedChanges.some(
					(c) => c.file === file || c.file.includes(file) || file.includes(c.file),
				);

				history[file] = {
					lastModified: lastModified?.trim().replace(/^"|"$/g, "") || "unknown",
					lastCommit: lastCommit?.trim().replace(/^"|"$/g, "").substring(0, 7) || "none",
					modifiedByUser: isModifiedByUser,
				};
			} catch {
				history[file] = {
					lastModified: "unknown",
					lastCommit: "none",
					modifiedByUser: false,
				};
			}
		}

		return history;
	}

	/**
	 * Execute git command and return output
	 */
	private git(cmd: string): string {
		return execSync(`git ${cmd}`, {
			cwd: this.workspaceRoot,
			encoding: "utf8",
			timeout: GIT_TIMEOUT_MS,
			stdio: ["pipe", "pipe", "pipe"],
		});
	}

	/**
	 * Execute git command, returning null on failure
	 */
	private gitSafe(cmd: string): string | null {
		try {
			return this.git(cmd);
		} catch {
			return null;
		}
	}

	/**
	 * Return empty context structure
	 */
	private emptyContext(): GitContext {
		return {
			branch: { current: "", ahead: 0, behind: 0 },
			uncommittedChanges: [],
			stagedChanges: [],
			recentCommits: [],
			fileHistory: {},
		};
	}
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a GitContextService instance
 */
export function createGitContextService(workspaceRoot: string): GitContextService {
	return new GitContextService(workspaceRoot);
}
