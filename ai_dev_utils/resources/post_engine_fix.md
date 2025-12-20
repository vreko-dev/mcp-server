# Comprehensive Fix Prompt: SnapBack UI Refresh Bug

## Problem Statement

SnapBack extension creates snapshots successfully but UI components (tree view, status bar, counters) fail to update. Users see notifications like "Copilot tried to overwrite X — SnapBack protected it" but:
- Tree view doesn't show new snapshots
- Status bar counter doesn't increment
- Protected files count remains stale

## Root Cause Analysis

**Three interconnected issues:**

### Issue 1: Disconnected Event Systems
- `OperationCoordinator` has the global `SnapBackEventBus` and correctly emits `SNAPSHOT_CREATED`
- `SnapshotManager` has a local `vscode.EventEmitter` that emits to nowhere useful
- UI components listen on `SnapBackEventBus`, never receive events from `SnapshotManager`

### Issue 2: AutoDecisionIntegration Uses Wrong API
`AutoDecisionIntegration.executeDecision()` calls:
```typescript
await this.snapshotManager.createSnapshot([...])
```

But `SnapshotStorageAdapter.save()` is designed to throw:
```typescript
throw new Error("Direct save not supported - use OperationCoordinator.coordinateSnapshotCreation()")
```

### Issue 3: Missing Dependency Injection
`AutoDecisionIntegration` constructor doesn't receive `OperationCoordinator`, so it can't use the correct API.

## Files to Modify

### File 1: `/apps/vscode/src/integration/AutoDecisionIntegration.ts`

**Changes needed:**

1. Add import for `OperationCoordinator`
2. Add `operationCoordinator` parameter to constructor
3. Store as class property
4. Update `executeDecision()` to use `OperationCoordinator.coordinateSnapshotCreation()`

**Complete replacement for the class:**

```typescript
/**
 * AutoDecisionIntegration
 *
 * Bridges VS Code file events to AutoDecisionEngine domain logic.
 *
 * Flow:
 * 1. onDidChangeTextDocument fires → onFileChange() buffers event
 * 2. 300ms debounce expires → processBatch() called
 * 3. processBatch() builds SaveContext from buffered events
 * 4. AutoDecisionEngine.makeDecision() evaluates signals
 * 5. NotificationAdapter converts decision to UserNotification
 * 6. OperationCoordinator creates snapshot if needed (triggers UI refresh)
 * 7. Show notification to user
 *
 * Runs parallel to SaveHandler (no replacement).
 */

import * as crypto from "node:crypto";
import * as path from "node:path";
import * as vscode from "vscode";
import { SettingsLoader } from "../config/settingsLoader";
import { AutoDecisionEngine } from "../domain/engine";
import { NotificationAdapter } from "../domain/notificationAdapter";
import type { FileInfo } from "../domain/signalAggregator";
import { createSignalAggregator, type SignalAggregator } from "../domain/signalAggregator";
import type { AutoDecisionConfig, ProtectionDecision, SaveContext } from "../domain/types";
import { DEFAULT_CONFIG } from "../domain/types";
import { FeedbackManager } from "../engine/FeedbackManager";
import type { NotificationManager } from "../notificationManager";
import { RecoveryUXNotification } from "../notifications/RecoveryUXNotification";
import type { OperationCoordinator } from "../operationCoordinator";
import type { AIRiskAssessment, AIRiskService, ChangeToAssess } from "../services/aiRiskService";
import type { WorkspaceContextManager } from "../services/WorkspaceContextManager";
import type { SnapshotManager } from "../snapshot/SnapshotManager";
import { absoluteToWorkspaceRelative, createAbsolutePath } from "../types/PathBrands";
import { detectAIPresence } from "../utils/AIPresenceDetector";
import { logger } from "../utils/logger";

export interface FileChangeEvent {
	type: "change" | "save" | "create" | "delete";
	filePath: string;
	content?: string;
	timestamp: number;
}

/**
 * Orchestrates domain components for session-level file protection
 */
export class AutoDecisionIntegration {
	private engine: AutoDecisionEngine;
	private adapter: NotificationAdapter;
	private signalAggregator: SignalAggregator;
	private settingsLoader: SettingsLoader | null = null;
	private snapshotManager: SnapshotManager;
	private operationCoordinator: OperationCoordinator | null = null;
	private workspaceContextManager: WorkspaceContextManager;
	private aiRiskService: AIRiskService | null = null;

	private fileBuffer: FileChangeEvent[] = [];
	private bufferTimeout: NodeJS.Timeout | null = null;
	private isProcessing = false;
	private disposables: vscode.Disposable[] = [];
	private isActive = false;

	private readonly DEBOUNCE_MS = 300;
	private readonly IGNORE_PATTERNS = ["node_modules/**", "dist/**", ".git/**", ".vscode/**", "*.lock", "*.log"];

	private readonly BINARY_EXTENSIONS = [
		".png",
		".jpg",
		".jpeg",
		".gif",
		".svg",
		".pdf",
		".zip",
		".exe",
		".dll",
		".so",
		".dylib",
		".bin",
	];

	constructor(
		snapshotManager: SnapshotManager,
		_notificationManager: NotificationManager,
		workspaceContextManager: WorkspaceContextManager,
		config?: Partial<AutoDecisionConfig>,
		context?: vscode.ExtensionContext,
		aiRiskService?: AIRiskService,
		operationCoordinator?: OperationCoordinator,
	) {
		// Store dependencies
		this.snapshotManager = snapshotManager;
		this.operationCoordinator = operationCoordinator ?? null;
		this.workspaceContextManager = workspaceContextManager;
		this.aiRiskService = aiRiskService ?? null;

		// Initialize SettingsLoader if context available
		if (context) {
			this.settingsLoader = new SettingsLoader(context);

			// Listen for settings changes and update engine
			this.settingsLoader.onSettingsChange((settings) => {
				this.engine.updateConfig({
					riskThreshold: settings.autoDecision.riskThreshold,
					notifyThreshold: settings.autoDecision.notifyThreshold,
					minFilesForBurst: settings.autoDecision.minFilesForBurst,
					maxSnapshotsPerMinute: settings.autoDecision.maxSnapshotsPerMinute,
				});
				logger.info("AutoDecisionEngine updated with new settings", {
					settings: settings.autoDecision,
				});
			});
		}

		// Merge settings-based config if available
		let mergedConfig: AutoDecisionConfig = { ...DEFAULT_CONFIG, ...config };
		if (this.settingsLoader) {
			const loadedSettings = this.settingsLoader.loadAutoDecisionSettings();
			mergedConfig = {
				...mergedConfig,
				riskThreshold: loadedSettings.riskThreshold,
				notifyThreshold: loadedSettings.notifyThreshold,
				minFilesForBurst: loadedSettings.minFilesForBurst,
				maxSnapshotsPerMinute: loadedSettings.maxSnapshotsPerMinute,
			};
		}

		this.engine = new AutoDecisionEngine(mergedConfig);
		this.adapter = new NotificationAdapter();

		this.signalAggregator = createSignalAggregator();

		logger.info("AutoDecisionIntegration initialized", {
			config: mergedConfig,
			hasOperationCoordinator: !!operationCoordinator,
		});
	}

	/**
	 * Activate integration: start listening to file change events
	 */
	activate(): void {
		if (this.isActive) {
			logger.warn("AutoDecisionIntegration already active");
			return;
		}

		this.isActive = true;
		this.registerTextDocumentListener();
		this.registerSaveListener();

		logger.info("AutoDecisionIntegration activated");
	}

	/**
	 * Deactivate integration: stop listening and cleanup
	 */
	deactivate(): void {
		if (!this.isActive) {
			return;
		}

		this.isActive = false;

		// Cancel pending debounce
		if (this.bufferTimeout) {
			clearTimeout(this.bufferTimeout);
			this.bufferTimeout = null;
		}

		// Dispose all listeners
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
		this.fileBuffer = [];

		// Dispose settings loader
		if (this.settingsLoader) {
			this.settingsLoader.dispose();
		}

		logger.info("AutoDecisionIntegration deactivated");
	}

	/**
	 * Register listener for onDidChangeTextDocument events
	 */
	private registerTextDocumentListener(): void {
		this.disposables.push(
			vscode.workspace.onDidChangeTextDocument((event) => {
				const { document } = event;

				// Skip if not in workspace
				if (!vscode.workspace.getWorkspaceFolder(document.uri)) {
					return;
				}

				// Skip ignored files
				if (this.shouldIgnoreFile(document.uri.fsPath)) {
					return;
				}

				this.onFileChange({
					type: "change",
					filePath: document.uri.fsPath,
					content: document.getText(),
					timestamp: Date.now(),
				});
			}),
		);

		logger.debug("Text document change listener registered");
	}

	/**
	 * Register listener for onDidSaveTextDocument events
	 */
	private registerSaveListener(): void {
		this.disposables.push(
			vscode.workspace.onDidSaveTextDocument((document) => {
				// Skip ignored files
				if (this.shouldIgnoreFile(document.uri.fsPath)) {
					return;
				}

				this.onFileChange({
					type: "save",
					filePath: document.uri.fsPath,
					content: document.getText(),
					timestamp: Date.now(),
				});
			}),
		);

		logger.debug("Save listener registered");
	}

	/**
	 * Check if file should be ignored
	 */
	private shouldIgnoreFile(filePath: string): boolean {
		const extension = path.extname(filePath).toLowerCase();

		// Ignore binary files
		if (this.BINARY_EXTENSIONS.includes(extension)) {
			return true;
		}

		// Ignore patterns
		for (const pattern of this.IGNORE_PATTERNS) {
			const regexPattern = pattern.replace(/\*\*/g, "(.*/)?").replace(/\*/g, "[^/]*").replace(/\./g, "\\.");
			const regex = new RegExp(regexPattern);

			if (regex.test(filePath)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Handle file change event: buffer and debounce
	 */
	private onFileChange(event: FileChangeEvent): void {
		if (!this.isActive) {
			return;
		}

		this.fileBuffer.push(event);

		// Reset debounce timer
		if (this.bufferTimeout) {
			clearTimeout(this.bufferTimeout);
		}

		this.bufferTimeout = setTimeout(() => this.processBatch(), this.DEBOUNCE_MS);
	}

	/**
	 * Process buffered file changes:
	 * 1. Build SaveContext
	 * 2. Run AutoDecisionEngine
	 * 3. Adapt to notification
	 * 4. Execute decision (snapshot + notification)
	 */
	private async processBatch(): Promise<void> {
		if (this.fileBuffer.length === 0) {
			return;
		}

		// Prevent concurrent processing
		if (this.isProcessing) {
			logger.debug("Batch processing already in progress, queueing next batch");
			return;
		}

		this.isProcessing = true;

		try {
			// Step 1: Extract file info from buffered events
			const fileInfos = await Promise.all(
				this.fileBuffer.map((event) => this.extractFileInfo(event.filePath, event.content || "")),
			);

			const workspaceRoot = this.workspaceContextManager.getWorkspaceRoot();
			logger.debug("Processing batch", {
				fileCount: fileInfos.length,
				workspaceRoot,
			});

			// Step 2: Build SaveContext
			const saveContext = await this.buildSaveContext(fileInfos);

			logger.debug("SaveContext built", {
				fileCount: saveContext.files.length,
				riskScore: saveContext.riskScore,
				aiDetected: saveContext.aiDetected,
				burstDetected: saveContext.burstDetected,
			});

			// Step 3: Run AutoDecisionEngine
			const decision = this.engine.makeDecision(saveContext);

			logger.debug("Decision made", {
				createSnapshot: decision.createSnapshot,
				showNotification: decision.showNotification,
				reasons: decision.reasons,
				confidence: decision.confidence,
			});

			// Trigger FeedbackManager if burst is detected
			if (saveContext.burstDetected) {
				const feedbackManager = FeedbackManager.getInstance();
				const detectionId = `burst-${Date.now()}-${Math.random().toString(36).slice(7)}`;
				const confidence = decision.confidence;
				feedbackManager.handleDetection(detectionId, confidence);
				logger.debug("FeedbackManager triggered for burst detection", {
					detectionId,
					confidence,
				});
			}

			// Step 4: Execute decision
			await this.executeDecision(decision, saveContext);
		} catch (error) {
			logger.error("Error processing batch", error as Error);
		} finally {
			this.isProcessing = false;
			this.fileBuffer = [];
		}
	}

	/**
	 * Extract file metadata for SaveContext
	 */
	private async extractFileInfo(filePath: string, content: string): Promise<FileInfo> {
		const workspaceRoot = this.workspaceContextManager.getWorkspaceRoot();

		if (!workspaceRoot) {
			logger.warn("No workspace root available, using absolute path", { filePath });
			return {
				path: filePath,
				extension: path.extname(filePath),
				sizeBytes: Buffer.byteLength(content, "utf-8"),
				isNew: false,
				isBinary: this.isBinaryContent(content, path.extname(filePath)),
				nextHash: crypto.createHash("sha256").update(content).digest("hex"),
			};
		}

		try {
			const absolutePath = createAbsolutePath(filePath);
			const workspaceRootPath = createAbsolutePath(workspaceRoot);
			const relativePath = absoluteToWorkspaceRelative(absolutePath, workspaceRootPath);

			return {
				path: relativePath,
				extension: path.extname(filePath),
				sizeBytes: Buffer.byteLength(content, "utf-8"),
				isNew: false,
				isBinary: this.isBinaryContent(content, path.extname(filePath)),
				nextHash: crypto.createHash("sha256").update(content).digest("hex"),
			};
		} catch (error) {
			logger.warn("File outside workspace, using absolute path", {
				filePath,
				workspaceRoot,
				error: (error as Error).message,
			});

			return {
				path: filePath,
				extension: path.extname(filePath),
				sizeBytes: Buffer.byteLength(content, "utf-8"),
				isNew: false,
				isBinary: this.isBinaryContent(content, path.extname(filePath)),
				nextHash: crypto.createHash("sha256").update(content).digest("hex"),
			};
		}
	}

	/**
	 * Check if content is binary
	 */
	private isBinaryContent(content: string, extension: string): boolean {
		if (this.BINARY_EXTENSIONS.includes(extension.toLowerCase())) {
			return true;
		}
		if (content.includes("\0")) {
			return true;
		}
		return false;
	}

	/**
	 * Build SaveContext from file infos using signal aggregation
	 */
	private async buildSaveContext(fileInfos: FileInfo[]): Promise<SaveContext> {
		const repoId = this.getRepoId();

		this.signalAggregator.reset();

		const riskScore = await this.getRiskScore(fileInfos);
		this.signalAggregator.setRiskSignal({ score: riskScore });

		this.signalAggregator.setBurstSignal({
			detected: fileInfos.length >= 3,
			fileCount: fileInfos.length,
		});

		const criticalFiles = fileInfos.filter((f) => this.isCriticalFile(f.path));
		this.signalAggregator.setCriticalFileSignal({
			detected: criticalFiles.length > 0,
			files: criticalFiles.map((f) => f.path),
			count: criticalFiles.length,
		});

		this.signalAggregator.setSessionSignal({
			sessionId: `session-${Date.now()}`,
			fileCount: fileInfos.length,
			durationMs: 0,
		});

		const aiPresence = detectAIPresence();
		this.signalAggregator.setAISignal({
			detected: aiPresence.hasAI,
			toolName: aiPresence.detectedAssistants[0],
			confidence: aiPresence.hasAI ? 0.85 : 0,
			indicators: aiPresence.detectedAssistants,
		});

		const context = this.signalAggregator.aggregate(fileInfos, repoId);
		return context;
	}

	/**
	 * Get risk score using AIRiskService if available
	 */
	private async getRiskScore(fileInfos: FileInfo[]): Promise<number> {
		if (this.aiRiskService && fileInfos.length > 0) {
			try {
				const primaryFile = fileInfos[0];
				const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
				const absolutePath = path.isAbsolute(primaryFile.path)
					? primaryFile.path
					: workspaceFolder
						? path.join(workspaceFolder, primaryFile.path)
						: primaryFile.path;

				const fileUri = vscode.Uri.file(absolutePath);
				const document = await vscode.workspace.openTextDocument(fileUri);
				const content = document.getText();

				const change: ChangeToAssess = {
					filePath: absolutePath,
					before: "",
					after: content,
					category: "file-change",
				};

				const assessment: AIRiskAssessment = await this.aiRiskService.assessChange(change);
				logger.debug("AIRiskService assessment received", {
					filePath: primaryFile.path,
					score: assessment.score,
					level: assessment.level,
				});

				return assessment.score;
			} catch (error) {
				logger.warn("AIRiskService assessment failed, using fallback", {
					error: (error as Error).message,
				});
			}
		}

		return this.estimateRiskScoreLocally(fileInfos);
	}

	/**
	 * Estimate risk score from file patterns (local fallback)
	 */
	private estimateRiskScoreLocally(fileInfos: FileInfo[]): number {
		let score = 0;

		const criticalCount = fileInfos.filter((f) => this.isCriticalFile(f.path)).length;
		score += criticalCount * 20;

		if (fileInfos.length >= 5) {
			score += 30;
		} else if (fileInfos.length >= 3) {
			score += 15;
		}

		const largeFiles = fileInfos.filter((f) => f.sizeBytes > 10000).length;
		score += largeFiles * 10;

		return Math.min(score, 100);
	}

	/**
	 * Check if file is critical
	 */
	private isCriticalFile(filePath: string): boolean {
		const criticalPatterns = ["package.json", ".env", ".snapbackrc", "tsconfig.json", ".config.ts", ".config.js"];
		return criticalPatterns.some((pattern) => filePath.includes(pattern));
	}

	/**
	 * Get repo ID from workspace
	 */
	private getRepoId(): string {
		const folder = vscode.workspace.workspaceFolders?.[0];
		return folder?.name ?? "unknown";
	}

	/**
	 * Execute decision: create snapshot and/or show notification
	 *
	 * CRITICAL FIX: Uses OperationCoordinator instead of SnapshotManager
	 * to ensure events are emitted on the correct event bus for UI refresh.
	 */
	private async executeDecision(decision: ProtectionDecision, context: SaveContext): Promise<void> {
		try {
			if (decision.createSnapshot && context.files.length > 0) {
				logger.info("Creating snapshot from AutoDecision", {
					reasons: decision.reasons,
					confidence: decision.confidence,
					hasOperationCoordinator: !!this.operationCoordinator,
				});

				const primaryFile = context.files[0];
				try {
					const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const absolutePath = path.isAbsolute(primaryFile.path)
						? primaryFile.path
						: workspaceFolder
							? path.join(workspaceFolder, primaryFile.path)
							: primaryFile.path;

					const fileUri = vscode.Uri.file(absolutePath);
					const document = await vscode.workspace.openTextDocument(fileUri);
					const content = document.getText();

					let snapshotId: string | undefined;

					// FIX: Use OperationCoordinator for proper event bus integration
					if (this.operationCoordinator) {
						// Build file contents map with workspace-relative path as key
						const relativePath = workspaceFolder
							? path.relative(workspaceFolder, absolutePath)
							: absolutePath;

						const fileContents: Record<string, string> = {
							[relativePath]: content,
						};

						// Create snapshot through OperationCoordinator
						// This ensures SNAPSHOT_CREATED event is emitted on the global eventBus
						snapshotId = await this.operationCoordinator.coordinateSnapshotCreation(
							false, // showNotification - we show our own notification
							[absolutePath], // specificFiles
							fileContents, // providedFileContents
							`AI-detected: ${path.basename(absolutePath)}`, // customSnapshotName
						);

						logger.info("Snapshot created via OperationCoordinator", {
							snapshotId,
							filePath: absolutePath,
						});
					} else {
						// Fallback: Use SnapshotManager directly (UI won't refresh)
						logger.warn(
							"OperationCoordinator not available - snapshot will be created but UI may not refresh"
						);
						try {
							const snapshot = await this.snapshotManager.createSnapshot([
								{
									path: absolutePath,
									content,
									action: "modify" as const,
								},
							]);
							snapshotId = snapshot.id;
						} catch (fallbackError) {
							// SnapshotStorageAdapter throws "Direct save not supported"
							// This is expected when OperationCoordinator is not wired
							logger.error(
								"Fallback snapshot creation failed - wire OperationCoordinator to fix",
								fallbackError as Error
							);
						}
					}

					if (snapshotId) {
						// Show recovery notification
						const notification = new RecoveryUXNotification();
						void notification.showProtectionAlert({
							filePath: primaryFile.path,
							snapshotId,
							aiTool: detectAIPresence().detectedAssistants[0] || "AI",
							operationType: "auto-detected",
						});
					}
				} catch (snapshotError) {
					logger.error("Failed to create snapshot from AutoDecision", snapshotError as Error);
				}
			}

			if (decision.showNotification) {
				const notification = this.adapter.adaptDecision(decision);

				logger.info("Showing notification", {
					type: notification.type,
					severity: notification.severity,
					title: notification.title,
				});

				this.showNotification(notification.title, notification.message);
			}
		} catch (error) {
			logger.error("Error executing decision", error as Error);
		}
	}

	/**
	 * Show notification to user
	 */
	private showNotification(title: string, message: string): void {
		vscode.window.showInformationMessage(`${title}: ${message}`);
	}

	/**
	 * Get current statistics (for testing)
	 */
	getStats(): {
		isActive: boolean;
		bufferedEvents: number;
		isProcessing: boolean;
	} {
		return {
			isActive: this.isActive,
			bufferedEvents: this.fileBuffer.length,
			isProcessing: this.isProcessing,
		};
	}
}

/**
 * Factory function
 */
export function createAutoDecisionIntegration(
	snapshotManager: SnapshotManager,
	notificationManager: NotificationManager,
	workspaceContextManager: WorkspaceContextManager,
	config?: Partial<AutoDecisionConfig>,
	operationCoordinator?: OperationCoordinator,
): AutoDecisionIntegration {
	return new AutoDecisionIntegration(
		snapshotManager,
		notificationManager,
		workspaceContextManager,
		config,
		undefined,
		undefined,
		operationCoordinator,
	);
}
```

---

### File 2: `/apps/vscode/src/extension.ts`

**Find this section (around line 540):**

```typescript
// 🆕 Phase 14: Initialize AutoDecisionIntegration (session-level AI protection)
const phase14Start = Date.now();
autoDecisionIntegration = new AutoDecisionIntegration(
	phase3Result.snapshotManager,
	phase3Result.notificationManager,
	workspaceContextManager,
	{
		riskThreshold: config.get<number>("snapback.autoDecision.riskThreshold", 60),
		notifyThreshold: config.get<number>("snapback.autoDecision.notifyThreshold", 40),
		minFilesForBurst: config.get<number>("snapback.autoDecision.minFilesForBurst", 3),
		maxSnapshotsPerMinute: config.get<number>("snapback.autoDecision.maxSnapshotsPerMinute", 4),
	},
	context,
	aiRiskService,
);
```

**Replace with:**

```typescript
// 🆕 Phase 14: Initialize AutoDecisionIntegration (session-level AI protection)
// FIX: Pass OperationCoordinator to enable proper event bus integration for UI refresh
const phase14Start = Date.now();
autoDecisionIntegration = new AutoDecisionIntegration(
	phase3Result.snapshotManager,
	phase3Result.notificationManager,
	workspaceContextManager,
	{
		riskThreshold: config.get<number>("snapback.autoDecision.riskThreshold", 60),
		notifyThreshold: config.get<number>("snapback.autoDecision.notifyThreshold", 40),
		minFilesForBurst: config.get<number>("snapback.autoDecision.minFilesForBurst", 3),
		maxSnapshotsPerMinute: config.get<number>("snapback.autoDecision.maxSnapshotsPerMinute", 4),
	},
	context,
	aiRiskService,
	phase3Result.operationCoordinator, // 🔧 FIX: Wire OperationCoordinator for UI refresh
);
```

---

## Verification Steps

After applying the fix:

1. **Rebuild the extension:**
   ```bash
   cd apps/vscode
   pnpm build
   ```

2. **Check for TypeScript errors:**
   ```bash
   pnpm typecheck
   ```

3. **Manual test:**
   - Open a workspace in VS Code/Qoder
   - Open a file and make rapid edits (simulating AI paste)
   - Verify:
     - [ ] Notification appears: "AI tried to overwrite X — SnapBack protected it"
     - [ ] Tree view updates with new snapshot
     - [ ] Status bar counter increments
     - [ ] No error in Output → SnapBack: "Direct save not supported"

4. **Check logs for success:**
   - Should see: `"Snapshot created via OperationCoordinator"`
   - Should NOT see: `"Direct save not supported - use OperationCoordinator"`

---

## Event Flow After Fix

```
AutoDecisionIntegration.executeDecision()
    ↓
OperationCoordinator.coordinateSnapshotCreation()
    ↓
this.publishEvent(SnapBackEvent.SNAPSHOT_CREATED, payload)
    ↓
SnapBackEventBus.publish()
    ↓
extension.ts → bus.on(SnapBackEvent.SNAPSHOT_CREATED, handler)
    ↓
refreshViews()
    ↓
├── SnapBackTreeProvider.refresh()      ✅
├── SnapshotNavigatorProvider.refresh() ✅
└── ProtectedFilesTreeProvider.refresh() ✅
```

---

## Additional Context

**Why this architecture exists:**
- `SnapshotStorageAdapter` is intentionally a read-only bridge for UI operations (view, delete, protect)
- `OperationCoordinator` is the canonical path for snapshot creation because it:
  - Handles workspace scanning and file reading
  - Manages operation progress tracking
  - Emits events on the global `SnapBackEventBus`
  - Tracks snapshots in `SessionCoordinator`
  - Updates `WorkspaceMemory`

**Related files (for context, no changes needed):**
- `/apps/vscode/src/snapshot/SnapshotStorageAdapter.ts` - Documents the "Direct save not supported" design
- `/apps/vscode/src/operationCoordinator.ts` - Contains `coordinateSnapshotCreation()` implementation
- `/apps/vscode/src/views/snapBackTreeProvider.ts` - Listens for refresh events
