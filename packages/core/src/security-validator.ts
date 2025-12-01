import * as path from "node:path";

export class SecurityValidator {
	/**
	 * Filter credentials from data to prevent storing sensitive information
	 * @param data - Data to filter
	 * @returns Object with filtered data and list of detected credentials
	 */
	filterCredentials(data: any): { filtered: any; detected: string[] } {
		const detected: string[] = [];
		const filtered = structuredClone(data);

		const scanForCredentials = (obj: any, path = ""): void => {
			if (typeof obj === "object" && obj !== null) {
				for (const key in obj) {
					const currentPath = path ? `${path}.${key}` : key;
					if (typeof obj[key] === "string") {
						// Check for common credential patterns
						if (
							key.toLowerCase().includes("password") ||
							key.toLowerCase().includes("secret") ||
							key.toLowerCase().includes("key") ||
							key.toLowerCase().includes("token") ||
							key.toLowerCase().includes("credential")
						) {
							detected.push(currentPath);
							obj[key] = "[FILTERED]";
						}
					} else if (typeof obj[key] === "object" && obj[key] !== null) {
						scanForCredentials(obj[key], currentPath);
					}
				}
			}
		};

		scanForCredentials(filtered);
		return { filtered, detected };
	}

	/**
	 * Validate file path to prevent path traversal attacks
	 * @param filePath - File path to validate
	 * @param workspaceRoot - Workspace root directory
	 * @param isStoragePath - Whether this is a storage path validation
	 * @returns Object with validation result and reason
	 */
	validatePath(
		filePath: string,
		workspaceRoot: string,
		isStoragePath = false,
	): { isValid: boolean; reason: string; normalizedPath?: string } {
		try {
			// Normalize the path
			const normalizedPath = path.normalize(filePath);

			// Check for path traversal attempts
			if (normalizedPath.includes("..")) {
				return {
					isValid: false,
					reason: "Path traversal detected",
				};
			}

			// Check for absolute paths (unless it's a storage path)
			if (!isStoragePath && path.isAbsolute(normalizedPath)) {
				return {
					isValid: false,
					reason: "Absolute paths not allowed",
				};
			}

			// Check that path is within workspace
			const resolvedPath = path.resolve(normalizedPath);
			const resolvedWorkspace = path.resolve(workspaceRoot);

			if (!resolvedPath.startsWith(resolvedWorkspace)) {
				return {
					isValid: false,
					reason: "Path outside workspace boundary",
				};
			}

			return {
				isValid: true,
				reason: "Valid path",
				normalizedPath,
			};
		} catch (error) {
			return {
				isValid: false,
				reason: `Path validation error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Validate checkpoint ID to prevent injection attacks
	 * @param checkpointId - Checkpoint ID to validate
	 * @returns Object with validation result and reason
	 */
	validateCheckpointId(checkpointId: string): {
		isValid: boolean;
		reason: string;
	} {
		// Check that checkpoint ID is a valid string
		if (!checkpointId || typeof checkpointId !== "string") {
			return {
				isValid: false,
				reason: "Invalid checkpoint ID format",
			};
		}

		// Check for malicious characters
		if (/[<>;"'|&$]/.test(checkpointId)) {
			return {
				isValid: false,
				reason: "Checkpoint ID contains invalid characters",
			};
		}

		// Check length
		if (checkpointId.length > 100) {
			return {
				isValid: false,
				reason: "Checkpoint ID too long",
			};
		}

		return {
			isValid: true,
			reason: "Valid checkpoint ID",
		};
	}

	/**
	 * Validate snapshot ID to prevent injection attacks
	 * @param snapshotId - Snapshot ID to validate
	 * @returns Object with validation result and reason
	 */
	validateSnapshotId(snapshotId: string): {
		isValid: boolean;
		reason: string;
	} {
		// Check that snapshot ID is a valid string
		if (!snapshotId || typeof snapshotId !== "string") {
			return {
				isValid: false,
				reason: "Invalid snapshot ID format",
			};
		}

		// Check for malicious characters
		if (/[<>;"'|&$]/.test(snapshotId)) {
			return {
				isValid: false,
				reason: "Snapshot ID contains invalid characters",
			};
		}

		// Check length
		if (snapshotId.length > 100) {
			return {
				isValid: false,
				reason: "Snapshot ID too long",
			};
		}

		return {
			isValid: true,
			reason: "Valid snapshot ID",
		};
	}

	/**
	 * Validate MCP response to prevent injection attacks
	 * @param response - MCP response to validate
	 * @returns True if response is valid, false otherwise
	 */
	validateMCPResponse(response: any): boolean {
		try {
			// Check for malicious content in response
			const responseString = JSON.stringify(response);

			// Check for common attack patterns
			const hasXSS = responseString.includes("<script") || responseString.includes("javascript:");
			const hasSQLInjection = responseString.includes(" OR ") && responseString.includes("1=1");
			const hasCommandInjection =
				/[;&|`$(){}[\]]/.test(responseString) &&
				(responseString.includes("rm ") || responseString.includes("del ") || responseString.includes("exec "));

			return !hasXSS && !hasSQLInjection && !hasCommandInjection;
		} catch (_error) {
			// If we can't stringify the response, it's potentially malicious
			return false;
		}
	}
}
