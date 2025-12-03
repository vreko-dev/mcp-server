import type { FileInput } from "@snapback-oss/contracts";

export class SnapshotNaming {
	/**
	 * Generate snapshot name based on naming strategy
	 */
	generateName(files: FileInput[], strategy: "git" | "semantic" | "timestamp" | "custom" = "semantic"): string {
		switch (strategy) {
			case "git":
				return this.gitStrategy(files);
			case "semantic":
				return this.semanticStrategy(files);
			case "timestamp":
				return this.timestampStrategy();
			default:
				return this.semanticStrategy(files);
		}
	}

	/**
	 * Git strategy - would parse git commit message (simplified implementation)
	 */
	private gitStrategy(files: FileInput[]): string {
		// In a real implementation, this would integrate with git
		// For now, fall back to semantic strategy
		return this.semanticStrategy(files);
	}

	/**
	 * Semantic strategy - analyze file operations
	 */
	private semanticStrategy(files: FileInput[]): string {
		if (files.length === 1) {
			const file = files[0];
			const fileName = file.path.split("/").pop() || "file";
			return `${this.capitalize(file.action)} ${fileName}`;
		}

		// Analyze file operations
		const actionCounts = files.reduce(
			(acc, f) => {
				acc[f.action] = (acc[f.action] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const primaryAction = Object.entries(actionCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

		if (primaryAction) {
			return `${this.capitalize(String(primaryAction[0]))} ${files.length} files`;
		}

		return `Snapshot of ${files.length} files`;
	}

	/**
	 * Timestamp strategy - use current timestamp
	 */
	private timestampStrategy(): string {
		return `Snapshot ${new Date().toISOString()}`;
	}

	/**
	 * Capitalize first letter of string
	 */
	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}
