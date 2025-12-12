import { logger } from "@snapback/infrastructure";
import { createHash } from "crypto";

interface CreationEvent {
	eventType: string;
	snapshotId: string;
	timestamp: number;
}

/**
 * SnapshotCreationTracker emits telemetry events for snapshot creation lifecycle.
 * Ensures privacy by hashing file paths and sanitizing error messages.
 */
export class SnapshotCreationTracker {
	private hashFilePath(filePath: string): string {
		return createHash("sha256").update(filePath).digest("hex");
	}

	private sanitizeError(error: any): string {
		if (!error) return "Unknown error";

		const message = error instanceof Error ? error.message : String(error);

		// Remove file paths from error message
		return message
			.replace(/\/[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+/g, "/***")
			.replace(/[A-Z]:\\[a-zA-Z0-9_\-\\./]+\.[a-zA-Z0-9]+/g, "***");
	}

	/**
	 * Emits event when snapshot creation is initiated.
	 */
	emitInitiated(data: { snapshotId: string; filePath?: string }): CreationEvent {
		const event: CreationEvent = {
			eventType: "snapshot_creation_initiated",
			snapshotId: data.snapshotId,
			timestamp: Date.now(),
		};

		// Never include raw file path
		if (data.filePath) {
			const hashedPath = this.hashFilePath(data.filePath);
			logger.info("Snapshot creation initiated", {
				snapshotId: data.snapshotId,
				pathHash: hashedPath,
			});
		}

		return event;
	}

	/**
	 * Emits event when snapshot creation completes successfully.
	 */
	emitCompleted(data: { snapshotId: string; duration: number; fileCount?: number }): CreationEvent {
		const event: CreationEvent = {
			eventType: "snapshot_creation_completed",
			snapshotId: data.snapshotId,
			timestamp: Date.now(),
		};

		logger.info("Snapshot creation completed", {
			snapshotId: data.snapshotId,
			duration: data.duration,
			fileCount: data.fileCount,
		});

		return event;
	}

	/**
	 * Emits failure event with sanitized error information.
	 */
	emitFailure(data: { snapshotId: string; error: any; duration: number }): CreationEvent {
		const sanitizedError = this.sanitizeError(data.error);

		const event: CreationEvent = {
			eventType: "snapshot_creation_failed",
			snapshotId: data.snapshotId,
			timestamp: Date.now(),
		};

		logger.warn("Snapshot creation failed", {
			snapshotId: data.snapshotId,
			error: sanitizedError,
			duration: data.duration,
		});

		return event;
	}
}
