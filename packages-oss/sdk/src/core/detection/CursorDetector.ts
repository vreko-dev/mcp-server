/**
 * Cursor IDE Detection
 *
 * Detects if running in Cursor (closed-source VS Code fork with built-in AI).
 * Uses heuristic: vscode.env.appName
 *
 * Confidence: 7.0 (presence) / 8.5 (absence)
 *
 * Asymmetry rationale:
 * - appName heuristic can miss edge cases (VM, SSH, custom builds)
 * - But if vscode.env.appName does NOT include 'cursor', we're quite sure it's not Cursor
 * - "Absence is stronger signal than presence" for heuristic-based detection
 * - Worst case: false negative (user in Cursor, we say "no AI") is acceptable for v1
 *   Better than false positive (user in VS Code, we claim Cursor detected)
 */

export interface IEnvironmentProvider {
	/**
	 * Returns the application name (e.g., "Cursor", "Visual Studio Code")
	 */
	getAppName(): string;

	/**
	 * Gets an environment variable value
	 */
	getEnvVar(key: string): string | undefined;
}

export class CursorDetector {
	constructor(private readonly env: IEnvironmentProvider) {}

	/**
	 * Detects Cursor IDE presence via appName heuristic
	 */
	detect(): { hasCursor: boolean; confidence: number } {
		const appName = this.env.getAppName().toLowerCase();

		if (appName.includes("cursor")) {
			return { hasCursor: true, confidence: 7.0 };
		}

		return { hasCursor: false, confidence: 8.5 };
	}
}
