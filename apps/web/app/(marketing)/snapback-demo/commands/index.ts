import { getAiSuggestions } from "../domain/ai";
import { parseIgnoreFile, parsePolicyFile, parseSnapbackRc } from "../domain/policies";
import { shouldProtectFile } from "../domain/protection";
import { createSnapshot } from "../domain/snapshot";
import type { GitContext, Policy, ProtectedFile, ProtectionLevel, Snapshot } from "../domain/types";
import { NotificationRepo } from "../persistence/NotificationRepo";
import { PolicyRepo } from "../persistence/PolicyRepo";
import { ProtectionRepo } from "../persistence/ProtectionRepo";
import { SnapshotRepo } from "../persistence/SnapshotRepo";

// Repository instances
const snapshotRepo = new SnapshotRepo();
const protectionRepo = new ProtectionRepo();
const notificationRepo = new NotificationRepo();
const policyRepo = new PolicyRepo();

const generateId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11));

/**
 * SnapBack Commands Registry
 * This module provides a centralized registry of all available commands
 * that can be invoked through the command palette or UI actions.
 */
export class SnapBackCommands {
	/**
	 * Initializes SnapBack with default settings and loads existing data
	 */
	async initialize(): Promise<void> {
		// Load policies from files
		await this.loadPolicies();

		// Show initialization notification
		await notificationRepo.create({
			id: generateId(),
			type: "info",
			title: "SnapBack Initialized",
			message: "SnapBack protection system is now active",
			timestamp: new Date(),
		});
	}

	/**
	 * Creates a snapshot for the current file
	 */
	async createSnapshot(
		fileId: string,
		filePath: string,
		content: string,
		protectionLevel: ProtectionLevel,
		gitContext?: GitContext,
		options?: {
			force?: boolean;
			checkpointInterval?: number;
		},
	): Promise<Snapshot | null> {
		// Get existing snapshots for deduplication
		const existingSnapshots = await snapshotRepo.getByFileId(fileId);

		// Create snapshot with deduplication
		const snapshot = createSnapshot(fileId, content, existingSnapshots, protectionLevel, gitContext, {
			...(options?.checkpointInterval !== undefined && {
				checkpointInterval: options.checkpointInterval,
			}),
			forceCreate: options?.force ?? false,
		});

		if (snapshot) {
			// Save to repository (idempotent)
			await snapshotRepo.create(snapshot);

			// Show notification
			// In a real implementation, we would check settings
			// For now, we'll always show the notification
			const showNotification = true; // This would come from settings
			if (showNotification) {
				await notificationRepo.create({
					id: generateId(),
					type: "success",
					title: "Checkpoint Created",
					message: `Snapshot created for ${filePath}`,
					timestamp: new Date(),
				});
			}

			return snapshot;
		}

		return null;
	}

	/**
	 * Restores content from a snapshot
	 */
	async snapBack(snapshotId: string): Promise<string | null> {
		const snapshot = await snapshotRepo.getById(snapshotId);

		if (snapshot) {
			// Show notification
			await notificationRepo.create({
				id: generateId(),
				type: "info",
				title: "Content Restored",
				message: "File content restored from snapshot",
				timestamp: new Date(),
			});

			return snapshot.content;
		}

		return null;
	}

	/**
	 * Views details of a specific snapshot
	 */
	async viewSnapshot(snapshotId: string): Promise<Snapshot | null> {
		return (await snapshotRepo.getById(snapshotId)) ?? null;
	}

	/**
	 * Shows all snapshots
	 */
	async showAllSnapshots(): Promise<Snapshot[]> {
		return await snapshotRepo.getAll();
	}

	/**
	 * Renames a snapshot
	 */
	async renameSnapshot(snapshotId: string, newName: string): Promise<Snapshot | null> {
		const trimmedName = newName.trim();
		if (!trimmedName) {
			return null;
		}

		await snapshotRepo.update(snapshotId, { name: trimmedName });
		const updatedSnapshot = await snapshotRepo.getById(snapshotId);

		if (updatedSnapshot) {
			await notificationRepo.create({
				id: generateId(),
				type: "info",
				title: "Snapshot Renamed",
				message: `Snapshot renamed to ${trimmedName}`,
				timestamp: new Date(),
			});
		}

		return updatedSnapshot ?? null;
	}

	/**
	 * Deletes a snapshot
	 */
	async deleteSnapshot(snapshotId: string): Promise<void> {
		const snapshot = await snapshotRepo.getById(snapshotId);
		await snapshotRepo.delete(snapshotId);

		await notificationRepo.create({
			id: generateId(),
			type: "warning",
			title: "Snapshot Deleted",
			message: snapshot ? `Snapshot ${snapshot.name} removed` : "Snapshot removed",
			timestamp: new Date(),
		});
	}

	/**
	 * Compares current file with a snapshot (stub implementation)
	 */
	async compareWithSnapshot(
		currentContent: string,
		snapshotId: string,
	): Promise<{ diff: string; hasChanges: boolean }> {
		const snapshot = await snapshotRepo.getById(snapshotId);

		if (snapshot) {
			// Simple comparison for demo
			const hasChanges = currentContent !== snapshot.content;
			const diff = hasChanges
				? `Changes detected between current content and snapshot from ${snapshot.timestamp.toLocaleString()}`
				: "No differences found";

			return { diff, hasChanges };
		}

		return { diff: "Snapshot not found", hasChanges: false };
	}

	/**
	 * Protects a file with a specific protection level
	 */
	async protectFile(path: string, level: ProtectionLevel): Promise<ProtectedFile> {
		const protectedFile = await protectionRepo.save({
			id: generateId(),
			path,
			protectionLevel: level,
		});

		// Show notification
		await notificationRepo.create({
			id: generateId(),
			type: "info",
			title: "File Protected",
			message: `File ${path} is now protected at ${level} level`,
			timestamp: new Date(),
		});

		return protectedFile;
	}

	/**
	 * Changes protection level for a file
	 */
	async changeProtectionLevel(path: string, level: ProtectionLevel): Promise<void> {
		await protectionRepo.updateProtectionLevel(path, level);

		// Show notification
		await notificationRepo.create({
			id: generateId(),
			type: "info",
			title: "Protection Level Changed",
			message: `Protection level for ${path} changed to ${level}`,
			timestamp: new Date(),
		});
	}

	/**
	 * Removes protection from a file
	 */
	async unprotectFile(path: string): Promise<void> {
		await protectionRepo.removeProtection(path);

		// Show notification
		await notificationRepo.create({
			id: generateId(),
			type: "info",
			title: "File Unprotected",
			message: `File ${path} is no longer protected`,
			timestamp: new Date(),
		});
	}

	/**
	 * Quick sets protection level
	 */
	async quickSetProtection(path: string, level: "watch" | "warn" | "block"): Promise<void> {
		await this.changeProtectionLevel(path, level);
	}

	/**
	 * Toggles AI monitoring
	 */
	async toggleAiMonitoring(enabled: boolean): Promise<void> {
		// In a real implementation, this would update settings
		// For now, we'll just show a notification
		await notificationRepo.create({
			id: generateId(),
			type: "info",
			title: "AI Monitoring",
			message: `AI monitoring ${enabled ? "enabled" : "disabled"}`,
			timestamp: new Date(),
		});
	}

	/**
	 * Shows AI monitoring status
	 */
	async showAiMonitoringStatus(enabled: boolean): Promise<string> {
		return `AI monitoring is currently ${enabled ? "enabled" : "disabled"}`;
	}

	/**
	 * Loads policies from policy files
	 */
	async loadPolicies(): Promise<Policy[]> {
		// In a real implementation, we would read actual policy files
		// For demo, we'll use mock policies

		// Mock .snapbackprotected content
		const protectedContent = `
# Protected files
@warn *.ts
@block src/config/*.json
src/database/migrations/*.sql
`;

		// Mock .snapbackignore content
		const ignoreContent = `
# Ignored files
node_modules/
.git/
dist/
*.log
`;

		// Mock .snapbackrc content (YAML style)
		const snapbackRcContent = `
# .snapbackrc - Team Protection Configuration
version: 2.0
project: "snapback-demo"

hats:
  critical:
    - "*.env*"
    - "package*.json"
    - "*lock.{yaml,json}"
    - "config/**/*.{js,ts,json}"

  protected:
    - "src/**/*.{ts,tsx,js,jsx}"
    - "lib/**/*"

  watched:
    - "*.md"
    - "docs/**/*"

rules:
  - pattern: "migrations/*.sql"
    hat: critical
    reason: "Database changes are irreversible"
    notify_team: true
`;

		// Parse policies
		const protectedPolicies = parsePolicyFile(protectedContent);
		const ignorePolicies = parseIgnoreFile(ignoreContent);
		const rcPolicies = parseSnapbackRc(snapbackRcContent);

		// Combine and save policies
		const allPolicies = [...protectedPolicies, ...ignorePolicies, ...rcPolicies];
		await policyRepo.saveAll(allPolicies);
		return allPolicies;
	}

	/**
	 * Checks if a file should be protected based on policies
	 */
	async checkFileProtection(path: string): Promise<ProtectionLevel | null> {
		const policies = await policyRepo.getAll();
		return shouldProtectFile(path, policies);
	}

	/**
	 * Gets AI suggestions for content changes
	 */
	async getAiSuggestions(context: {
		content: string;
		previousContent?: string;
		filePath: string;
		protectionLevel: ProtectionLevel;
	}): Promise<any[]> {
		// In a real implementation, this would use actual AI models
		// For demo, we'll use the stubbed implementation
		return getAiSuggestions(context);
	}

	// Alias methods for checkpoint terminology (for demo compatibility)
	async createCheckpoint(
		fileId: string,
		filePath: string,
		content: string,
		protectionLevel: ProtectionLevel,
		gitContext?: GitContext,
		options?: {
			force?: boolean;
			checkpointInterval?: number;
		},
	): Promise<Snapshot | null> {
		return this.createSnapshot(fileId, filePath, content, protectionLevel, gitContext, options);
	}

	async viewCheckpoint(checkpointId: string): Promise<Snapshot | null> {
		return this.viewSnapshot(checkpointId);
	}

	async compareWithCheckpoint(
		currentContent: string,
		checkpointId: string,
	): Promise<{ diff: string; hasChanges: boolean }> {
		return this.compareWithSnapshot(currentContent, checkpointId);
	}

	async renameCheckpoint(checkpointId: string, newName: string): Promise<Snapshot | null> {
		return this.renameSnapshot(checkpointId, newName);
	}

	async deleteCheckpoint(checkpointId: string): Promise<void> {
		return this.deleteSnapshot(checkpointId);
	}
}

// Export singleton instance
export const snapBackCommands = new SnapBackCommands();
