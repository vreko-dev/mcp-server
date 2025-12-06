import simpleGit, { type SimpleGit } from "simple-git";
import { logger } from "./utils/logger";

export interface CommitInfo {
	hash: string;
	date: string;
	message: string;
	author: string;
}

export interface ChangeInfo {
	modified: string[];
	added: string[];
	deleted: string[];
}

export interface CommitContext {
	branch: string;
	commitHash: string;
	commitMessage: string;
	author: string;
	changes: ChangeInfo;
}

export class GitIntegration {
	private git: SimpleGit;

	constructor(cwd?: string) {
		this.git = simpleGit(cwd);
	}

	/**
	 * Check if the current directory is a git repository
	 * @returns Promise resolving to true if the directory is a git repository, false otherwise
	 */
	async isRepository(): Promise<boolean> {
		try {
			return await this.git.checkIsRepo();
		} catch (_error) {
			return false;
		}
	}

	/**
	 * Get the status of the git repository
	 * @returns Promise resolving to an array of status strings
	 */
	async getStatus(): Promise<string[]> {
		try {
			const status = await this.git.status();
			const statusLines: string[] = [];

			// Add untracked files (A - Added)
			for (const file of status.not_added) {
				statusLines.push(`A ${file}`);
			}

			// Add deleted files (D - Deleted)
			for (const file of status.deleted) {
				statusLines.push(`D ${file}`);
			}

			// Add modified files (M - Modified)
			for (const file of status.modified) {
				statusLines.push(`M ${file}`);
			}

			// Add created files (A - Added)
			for (const file of status.created) {
				statusLines.push(`A ${file}`);
			}

			// Add conflicted files (UU - Unmerged)
			for (const file of status.conflicted) {
				statusLines.push(`UU ${file}`);
			}

			return statusLines;
		} catch (_error) {
			return [];
		}
	}

	/**
	 * Get the current branch name
	 * @returns Promise resolving to the current branch name or null if not in a repo
	 */
	async getCurrentBranch(): Promise<string | null> {
		try {
			const branchSummary = await this.git.branch();
			return branchSummary.current;
		} catch (_error) {
			return null;
		}
	}

	/**
	 * Check if there are merge conflicts
	 * @returns Promise resolving to true if there are conflicts, false otherwise
	 */
	async hasConflicts(): Promise<boolean> {
		try {
			const status = await this.git.status();
			return status.conflicted.length > 0;
		} catch (_error) {
			return false;
		}
	}

	/**
	 * Check if the working tree is dirty (has uncommitted changes)
	 * @returns Promise resolving to true if the working tree is dirty, false otherwise
	 */
	async isWorkingTreeDirty(): Promise<boolean> {
		try {
			const status = await this.git.status();
			return !status.isClean();
		} catch (_error) {
			return false;
		}
	}

	async getCommitContext(): Promise<CommitContext> {
		try {
			// Get current branch
			const branchSummary = await this.git.branch();
			const branch = branchSummary.current;

			// Get current commit hash
			let commitHash = "";
			try {
				commitHash = await this.git.revparse(["HEAD"]);
			} catch (_error) {
				// Handle case where there are no commits yet
				commitHash = "";
			}

			// Get status for changes
			const status = await this.git.status();
			const changes: ChangeInfo = {
				modified: status.modified,
				added: [...status.not_added, ...status.created],
				deleted: status.deleted,
			};

			// Get latest commit info
			let commitMessage = "";
			let author = "";

			try {
				const log = await this.git.log({ maxCount: 1 });
				if (log.latest) {
					commitMessage = log.latest.message;
					author = log.latest.author_name;
				}
			} catch (_error) {
				// Handle case where there are no commits yet
			}

			return {
				branch,
				commitHash: commitHash.trim(),
				commitMessage,
				author,
				changes,
			};
		} catch (_error) {
			// Return default context if git operations fail
			return {
				branch: "unknown",
				commitHash: "",
				commitMessage: "",
				author: "",
				changes: {
					modified: [],
					added: [],
					deleted: [],
				},
			};
		}
	}

	async getFileHistory(filePath: string): Promise<CommitInfo[]> {
		try {
			const log = await this.git.log({ file: filePath });
			return log.all.map((commit) => ({
				hash: commit.hash,
				date: commit.date,
				message: commit.message,
				author: commit.author_name,
			}));
		} catch (_error) {
			return [];
		}
	}

	async getDiff(options?: { staged?: boolean; files?: string[] }): Promise<string> {
		try {
			const diffOptions: string[] = [];

			if (options?.staged) {
				diffOptions.push("--staged");
			}

			if (options?.files && options.files.length > 0) {
				diffOptions.push(...options.files);
			}

			return await this.git.diff(diffOptions);
		} catch (_error) {
			return "";
		}
	}

	/**
	 * Create a shadow branch for context preservation
	 * @returns Promise resolving to the shadow branch name, or null if failed
	 */
	async createShadowBranch(baseBranch: string): Promise<string | null> {
		try {
			// Create a unique shadow branch name
			const timestamp = Date.now();
			const shadowBranchName = `snapback/shadow/${baseBranch}/${timestamp}`;

			// Create the shadow branch from the current state
			await this.git.checkout(["-b", shadowBranchName]);

			return shadowBranchName;
		} catch (error) {
			logger.error({ error }, "Failed to create shadow branch:");
			return null;
		}
	}

	/**
	 * Create a stash snapshot with a message
	 * @param message - The snapshot message
	 * @returns Promise resolving to an object indicating if a stash was created
	 */
	async stashSnapshot(message: string): Promise<{ created: boolean }> {
		try {
			// Create a stash with the provided message
			const result = await this.git.stash(["save", message]);

			// Check if anything was actually stashed
			const created = !result.includes("No local changes to save");

			return { created };
		} catch (error) {
			logger.error({ error }, "Failed to create stash snapshot:");
			return { created: false };
		}
	}

	/**
	 * Switch branches while preserving snapshots
	 * @param branch - The branch to switch to
	 * @returns Promise resolving to true if successful, false otherwise
	 */
	async switchBranchWithSnapshotPreservation(branch: string): Promise<boolean> {
		try {
			// Switch to the specified branch
			await this.git.checkout(branch);
			return true;
		} catch (error) {
			logger.error({ error }, "Failed to switch branches:");
			return false;
		}
	}

	/**
	 * Handle detached HEAD states
	 * @returns Promise resolving to true if successful, false otherwise
	 */
	async handleDetachedHeadState(): Promise<boolean> {
		try {
			// Get the current commit hash
			const commitHash = await this.git.revparse(["HEAD"]);

			// Switch back to the main branch (or create a branch from current commit)
			await this.git.checkout(["-b", `snapback-detached-${Date.now()}`, commitHash]);

			return true;
		} catch (error) {
			logger.error({ error }, "Failed to handle detached HEAD state:");
			return false;
		}
	}

	/**
	 * Recover from mid-rebase/merge conflicts
	 * @returns Promise resolving to true if successful, false otherwise
	 */
	async recoverFromMidRebaseMergeConflicts(): Promise<boolean> {
		try {
			// Try to abort any ongoing rebase
			try {
				await this.git.rebase(["--abort"]);
			} catch (_error) {
				// Ignore if no rebase in progress
			}

			// Try to abort any ongoing merge
			try {
				await this.git.merge(["--abort"]);
			} catch (_error) {
				// Ignore if no merge in progress
			}

			// Reset to the last clean state
			await this.git.reset(["--hard", "HEAD"]);

			return true;
		} catch (error) {
			logger.error({ error }, "Failed to recover from conflicts:");
			return false;
		}
	}
}
