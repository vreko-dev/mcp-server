import crypto from "node:crypto";

/**
 * Hash file path with SHA-256
 */
export function hashFilePath(filePath: string): string {
	return crypto.createHash("sha256").update(filePath).digest("hex");
}

/**
 * Hash workspace ID for anonymization
 */
export function hashWorkspaceId(workspaceId: string): string {
	return crypto.createHash("sha256").update(workspaceId).digest("hex");
}
