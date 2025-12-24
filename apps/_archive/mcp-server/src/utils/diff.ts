/**
 * Diff utility functions for hunk and halo selection
 */

export interface ChangedLine {
	lineNumber: number;
	content: string;
	type: "added" | "removed" | "context";
}

export interface Hunk {
	startLine: number;
	endLine: number;
	lines: ChangedLine[];
}

/**
 * Select hunks from changed lines with halo (context lines before and after)
 *
 * @param changedLines - Array of changed lines with their line numbers
 * @param haloSize - Number of context lines to include before and after each hunk (default: 3)
 * @returns Array of hunks with context lines
 */
export function selectHunksWithHalo(changedLines: ChangedLine[], haloSize = 3): Hunk[] {
	if (changedLines.length === 0) {
		return [];
	}

	// Sort changed lines by line number
	const sortedLines = [...changedLines].sort((a, b) => a.lineNumber - b.lineNumber);

	const hunks: Hunk[] = [];
	let currentHunk: Hunk | null = null;

	for (const line of sortedLines) {
		if (currentHunk === null) {
			// Start a new hunk
			currentHunk = {
				startLine: Math.max(1, line.lineNumber - haloSize),
				endLine: line.lineNumber + haloSize,
				lines: [line],
			};
		} else if (line.lineNumber <= currentHunk.endLine) {
			// Extend the current hunk
			currentHunk.lines.push(line);
			currentHunk.endLine = line.lineNumber + haloSize;
		} else {
			// Finish the current hunk and start a new one
			hunks.push(currentHunk);
			currentHunk = {
				startLine: Math.max(1, line.lineNumber - haloSize),
				endLine: line.lineNumber + haloSize,
				lines: [line],
			};
		}
	}

	// Add the last hunk
	if (currentHunk !== null) {
		hunks.push(currentHunk);
	}

	return hunks;
}

/**
 * Extract line numbers from changed lines
 *
 * @param changedLines - Array of changed lines
 * @returns Array of line numbers
 */
export function extractLineNumbers(changedLines: ChangedLine[]): number[] {
	return changedLines.map((line) => line.lineNumber);
}

/**
 * Filter content to only include lines within specified hunks
 *
 * @param content - Full file content as string
 * @param hunks - Array of hunks to include
 * @returns Filtered content containing only lines within hunks
 */
export function filterContentByHunks(content: string, hunks: Hunk[]): string {
	const lines = content.split("\n");
	const resultLines: string[] = [];

	for (const hunk of hunks) {
		// Add lines within the hunk range
		for (let i = hunk.startLine - 1; i < hunk.endLine && i < lines.length; i++) {
			resultLines.push(lines[i]);
		}
	}

	return resultLines.join("\n");
}

/**
 * Create changed line objects from diff changes
 *
 * @param changes - Diff changes from the MCP protocol
 * @returns Array of changed line objects
 */
export function createChangedLines(changes: any[]): ChangedLine[] {
	const changedLines: ChangedLine[] = [];
	let currentLineNumber = 1;

	for (const change of changes) {
		const lines = change.value.split("\n");

		for (let i = 0; i < lines.length; i++) {
			// Skip empty last line from split
			if (i === lines.length - 1 && lines[i] === "") {
				continue;
			}

			const line: ChangedLine = {
				lineNumber: currentLineNumber,
				content: lines[i],
				type: change.added ? "added" : change.removed ? "removed" : "context",
			};

			if (change.added || change.removed) {
				changedLines.push(line);
			}

			if (!change.removed) {
				currentLineNumber++;
			}
		}
	}

	return changedLines;
}
