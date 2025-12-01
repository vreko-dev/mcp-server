import { z } from "zod";
import { getSnapshotManager, toFileInputs } from "./sdk-adapter.js";

// Schema for create snapshot tool
export const CreateSnapshotSchema = z.object({
	filePath: z.string().optional().describe("Optional file path to create snapshot for"),
	reason: z.string().optional().describe("Optional reason for creating the snapshot"),
	content: z.string().optional().describe("Optional content to snapshot"),
	files: z
		.array(
			z.object({
				path: z.string().describe("File path"),
				content: z.string().describe("File content"),
			}),
		)
		.optional()
		.describe("Array of files to snapshot"),
});

/**
 * Create a snapshot with content-addressed ID
 *
 * @param input - The input parameters for creating a snapshot
 * @returns The snapshot ID and metadata
 */
export async function createSnapshot(input: z.infer<typeof CreateSnapshotSchema>) {
	try {
		const manager = getSnapshotManager();

		// Prepare files array
		let files: Array<{ path: string; content: string }> = [];

		if (input.files && input.files.length > 0) {
			files = input.files;
		} else if (input.content) {
			const filePath = input.filePath || "content.txt";
			files = [{ path: filePath, content: input.content }];
		}

		// Convert to SDK FileInput format
		const fileInputs = toFileInputs(files);

		// Create snapshot using SnapshotManager
		const snapshot = await manager.create(fileInputs, {
			description: input.reason || "MCP snapshot",
			protected: false,
		});

		// Format response for MCP
		const response = {
			id: snapshot.id,
			timestamp: snapshot.timestamp,
			reason: input.reason || "MCP snapshot",
			filePath: input.filePath,
			fileCount: (snapshot.files || []).length,
		};

		return {
			success: true,
			snapshot: response,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
