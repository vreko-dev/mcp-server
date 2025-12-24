/**
 * Diff calculation utilities for snapshot restoration previews
 */

export interface FileDiff {
	path: string;
	operation: "create" | "modify" | "delete";
	linesAdded: number;
	linesRemoved: number;
	preview: string;
	currentChecksum?: string;
	snapshotChecksum?: string;
}

export interface DiffPreview {
	totalFiles: number;
	filesCreated: number;
	filesModified: number;
	filesDeleted: number;
	totalLinesAdded: number;
	totalLinesRemoved: number;
	diffs: FileDiff[];
}

export class DiffCalculator {
	/**
	 * Calculate diff between current file and snapshot content
	 */
	calculateFileDiff(filePath: string, currentContent: string | null, snapshotContent: string | null): FileDiff {
		// Determine operation
		let operation: "create" | "modify" | "delete";
		if (currentContent === null && snapshotContent !== null) {
			operation = "create";
		} else if (currentContent !== null && snapshotContent === null) {
			operation = "delete";
		} else {
			operation = "modify";
		}

		// Calculate line counts
		const currentLines = currentContent ? currentContent.split("\n") : [];
		const snapshotLines = snapshotContent ? snapshotContent.split("\n") : [];

		const { added, removed, preview } = this.computeLineDiff(currentLines, snapshotLines);

		// Calculate checksums
		const currentChecksum = currentContent ? this.calculateChecksum(currentContent) : undefined;
		const snapshotChecksum = snapshotContent ? this.calculateChecksum(snapshotContent) : undefined;

		return {
			path: filePath,
			operation,
			linesAdded: added,
			linesRemoved: removed,
			preview,
			currentChecksum,
			snapshotChecksum,
		};
	}

	/**
	 * Compute line-by-line diff with preview
	 * Uses simple LCS algorithm for readable diffs
	 */
	private computeLineDiff(
		currentLines: string[],
		snapshotLines: string[],
	): { added: number; removed: number; preview: string } {
		const lcs = this.longestCommonSubsequence(currentLines, snapshotLines);
		const previewLines: string[] = [];
		let added = 0;
		let removed = 0;

		let i = 0;
		let j = 0;
		let previewLineCount = 0;
		const maxPreviewLines = 20; // Limit preview to first 20 lines

		for (let k = 0; k < lcs.length && previewLineCount < maxPreviewLines; k++) {
			// Lines removed from current
			while (i < currentLines.length && currentLines[i] !== lcs[k]) {
				previewLines.push(`- ${currentLines[i]}`);
				removed++;
				i++;
				previewLineCount++;
				if (previewLineCount >= maxPreviewLines) break;
			}

			// Lines added from snapshot
			while (j < snapshotLines.length && snapshotLines[j] !== lcs[k] && previewLineCount < maxPreviewLines) {
				previewLines.push(`+ ${snapshotLines[j]}`);
				added++;
				j++;
				previewLineCount++;
				if (previewLineCount >= maxPreviewLines) break;
			}

			// Common line
			if (previewLineCount < maxPreviewLines) {
				previewLines.push(`  ${lcs[k]}`);
				previewLineCount++;
			}

			i++;
			j++;
		}

		// Handle remaining lines
		while (i < currentLines.length && previewLineCount < maxPreviewLines) {
			previewLines.push(`- ${currentLines[i]}`);
			removed++;
			i++;
			previewLineCount++;
		}

		while (j < snapshotLines.length && previewLineCount < maxPreviewLines) {
			previewLines.push(`+ ${snapshotLines[j]}`);
			added++;
			j++;
			previewLineCount++;
		}

		// Count any remaining lines not included in preview
		added += snapshotLines.length - j;
		removed += currentLines.length - i;

		if (previewLineCount >= maxPreviewLines && (i < currentLines.length || j < snapshotLines.length)) {
			previewLines.push("... (preview truncated)");
		}

		return {
			added,
			removed,
			preview: previewLines.join("\n"),
		};
	}

	/**
	 * Longest Common Subsequence for diff calculation
	 */
	private longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
		const m = arr1.length;
		const n = arr2.length;
		const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

		// Fill DP table
		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				if (arr1[i - 1] === arr2[j - 1]) {
					dp[i][j] = dp[i - 1][j - 1] + 1;
				} else {
					dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
				}
			}
		}

		// Backtrack to find LCS
		const lcs: string[] = [];
		let i = m;
		let j = n;

		while (i > 0 && j > 0) {
			if (arr1[i - 1] === arr2[j - 1]) {
				lcs.unshift(arr1[i - 1]);
				i--;
				j--;
			} else if (dp[i - 1][j] > dp[i][j - 1]) {
				i--;
			} else {
				j--;
			}
		}

		return lcs;
	}

	/**
	 * Calculate SHA-256 checksum for content
	 */
	calculateChecksum(content: string): string {
		// Use Node.js crypto for checksum
		const crypto = require("node:crypto");
		return crypto.createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Generate full diff preview for multiple files
	 */
	generateDiffPreview(diffs: FileDiff[]): DiffPreview {
		let filesCreated = 0;
		let filesModified = 0;
		let filesDeleted = 0;
		let totalLinesAdded = 0;
		let totalLinesRemoved = 0;

		for (const diff of diffs) {
			switch (diff.operation) {
				case "create":
					filesCreated++;
					break;
				case "modify":
					filesModified++;
					break;
				case "delete":
					filesDeleted++;
					break;
			}
			totalLinesAdded += diff.linesAdded;
			totalLinesRemoved += diff.linesRemoved;
		}

		return {
			totalFiles: diffs.length,
			filesCreated,
			filesModified,
			filesDeleted,
			totalLinesAdded,
			totalLinesRemoved,
			diffs,
		};
	}
}
