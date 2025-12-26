/**
 * Facade Tool Handlers
 *
 * Thin wrapper layer that implements the 11 consolidated facade tools.
 * Each facade routes to legacy handlers based on the 'op' or 'type' parameter.
 *
 * @module facades
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createStorage } from "@snapback/engine";
import { WorkspaceVitals } from "@snapback/intelligence/vitals";
import { applyAutomaticFix, diagnoseSnapshotFailure, formatDiagnosis, type SnapshotDiagnosis } from "@snapback-oss/sdk";
import { CommonErrors } from "../errors.js";
import type { ToolContext, ToolHandler, ToolResult } from "../registry.js";
import { atomicWriteFileSync, validateFilePaths } from "../validation.js";
// Import composite tool handlers (pair programmer)
import { handleBeginTask } from "./begin-task.js";
import { handleCompleteTask } from "./complete-task.js";
import { getIntelligence } from "./intelligence.js";
import { generatePairingProtocol, getContextSummary } from "./pairing-protocol.js";
import { handleQuickCheck } from "./quick-check.js";
import {
	buildSmartActions,
	type CleanupResult,
	type CoachingContext,
	cleanupArchivedSessions,
	cleanupStaleLearnings,
	compressResponse,
	findMatchingSnapshot,
	formatBytes,
	generateCoachingHint,
	getArchitectureVersion,
	getFileHashes,
	getResponseConfig,
} from "./response-utils.js";
import { handleReviewWork } from "./review-work.js";
import { handleWhatChanged } from "./what-changed.js";

/**
 * Helper to create a tool result
 */
function result(text: string, isError = false): ToolResult {
	return {
		content: [{ type: "text", text }],
		isError,
	};
}

/**
 * Helper to create JSON result with optional compression and coaching
 */
function jsonResult(
	data: unknown,
	options?: {
		context?: ToolContext;
		coaching?: CoachingContext;
		compress?: boolean;
	},
): ToolResult {
	let finalData = data as Record<string, unknown>;

	// Add coaching hint if context provided
	if (options?.coaching) {
		const hint = generateCoachingHint(options.coaching);
		if (hint) {
			finalData = { ...finalData, _hint: hint };
		}
	}

	// Compress if requested or if context tier requires it
	if (options?.compress !== false && options?.context) {
		const config = getResponseConfig(options.context.tier || "local");
		finalData = compressResponse(finalData, config);
	}

	return result(JSON.stringify(finalData, null, 2));
}

/**
 * Helper to create JSON error result (sets isError: true)
 */
function errorJsonResult(data: unknown): ToolResult {
	return result(JSON.stringify(data, null, 2), true);
}

/**
 * analyze - Risk and package analysis
 */
export const handleAnalyze: ToolHandler = async (args, _context) => {
	const { type } = args as { type?: "risk" | "package" };

	if (type === "risk") {
		const { changes, filePath } = args as { changes?: unknown[]; filePath?: string };

		// Basic risk analysis based on change patterns
		const riskFactors: string[] = [];
		let severity: "low" | "medium" | "high" = "low";

		if (changes && Array.isArray(changes)) {
			const hasRemovals = changes.some((c: unknown) => (c as { removed?: boolean }).removed);
			const hasAdditions = changes.some((c: unknown) => (c as { added?: boolean }).added);

			if (hasRemovals && hasAdditions) {
				riskFactors.push("Mixed additions and removals");
				severity = "medium";
			}
			if (changes.length > 50) {
				riskFactors.push("Large change set (50+ lines)");
				severity = "high";
			}
		}

		if (filePath) {
			if (filePath.includes("auth") || filePath.includes("security")) {
				riskFactors.push("Security-sensitive file");
				severity = "high";
			}
			if (filePath.includes("config") || filePath.includes(".env")) {
				riskFactors.push("Configuration file");
				severity = "medium";
			}
		}

		return jsonResult({
			type: "risk_assessment",
			severity,
			riskFactors,
			recommendation: severity === "high" ? "Create snapshot before proceeding" : "Proceed with caution",
			next_actions: [
				severity === "high" ? { tool: "snapshot_create", priority: 1, reason: "High risk detected" } : null,
				{ tool: "validate", priority: 2, reason: "Validate changes before commit" },
			].filter(Boolean),
		});
	}

	if (type === "package") {
		const { packageName, targetVersion } = args as { packageName?: string; targetVersion?: string };

		if (!packageName) {
			return errorJsonResult(CommonErrors.missingParam("packageName"));
		}

		return jsonResult({
			type: "package_validation",
			packageName,
			targetVersion: targetVersion || "latest",
			recommendation: "proceed",
			warnings: [],
			message: "Package validation - check npm registry for peer dependencies",
			next_actions: [{ tool: "snapshot_create", priority: 1, reason: "Before package changes" }],
		});
	}

	return errorJsonResult(CommonErrors.missingParam("type (risk | package)"));
};

/**
 * prepare_workspace - Pre-flight workspace check
 * Uses real WorkspaceVitals from @snapback/intelligence
 */
export const handlePrepareWorkspace: ToolHandler = async (_args, context) => {
	const storage = createStorage(context.workspaceRoot);
	const snapshots = storage.listSnapshots();

	// Use real vitals from @snapback/intelligence
	const vitals = WorkspaceVitals.for(context.workspaceRoot);
	const currentVitals = vitals.current();
	const guidance = vitals.getAgentGuidance();
	const snapshotDecision = vitals.shouldSnapshot();

	const lastSnapshot = snapshots[0];
	const timeSinceLastSnapshot = lastSnapshot ? Math.floor((Date.now() - lastSnapshot.createdAt) / 60000) : null;

	// Protection score based on pressure (inverted - low pressure = high protection)
	const protectionScore = Math.max(0, 100 - currentVitals.pressure.value);

	return jsonResult({
		vitals: {
			pulse: currentVitals.pulse,
			temperature: currentVitals.temperature,
			pressure: currentVitals.pressure,
			oxygen: currentVitals.oxygen,
			trajectory: currentVitals.trajectory,
		},
		protectionScore,
		lastSnapshot: lastSnapshot
			? {
					id: lastSnapshot.id,
					createdAt: new Date(lastSnapshot.createdAt).toISOString(),
					fileCount: lastSnapshot.files.length,
					minutesAgo: timeSinceLastSnapshot,
				}
			: null,
		totalSnapshots: snapshots.length,
		recommendation: {
			should: snapshotDecision.should,
			reason: snapshotDecision.reason,
			urgency: snapshotDecision.urgency,
		},
		safeOperations: guidance.safeOperations,
		blockedOperations: guidance.blockedOperations,
		suggestion: guidance.suggestion,
		next_actions: snapshotDecision.should
			? [{ tool: "snapshot_create", priority: 1, reason: snapshotDecision.reason }]
			: [],
	});
};

/**
 * snapshot_create - Create snapshot with auto-retry, diagnosis, and duplicate detection
 */
export const handleSnapshotCreate: ToolHandler = async (args, context) => {
	const { files, reason, trigger } = args as {
		files?: string[];
		reason?: string;
		trigger?: string;
	};

	if (!files || files.length === 0) {
		return errorJsonResult(CommonErrors.missingParam("files"));
	}

	// P0-004: Validate file paths for traversal attacks
	const pathValidation = validateFilePaths(files, context.workspaceRoot);
	if (!pathValidation.valid) {
		return errorJsonResult(CommonErrors.pathTraversalBlocked(pathValidation.invalidPath, pathValidation.error));
	}

	const storage = createStorage(context.workspaceRoot);

	// Enhancement #1: Duplicate snapshot prevention (fixed)
	// Check if ALL requested files are unchanged in ANY recent snapshot
	// Uses blobId comparison directly - no expensive restore() needed
	const snapshots = storage.listSnapshots();

	if (snapshots.length > 0) {
		const currentHashes = getFileHashes(files, context.workspaceRoot);

		// Check against recent snapshots (not just the most recent)
		// This handles: subset requests, different file orderings, recent snapshots
		const match = findMatchingSnapshot(currentHashes, snapshots, 5);

		if (match.matched && match.snapshotId && match.createdAt) {
			const minutesAgo = Math.floor((Date.now() - match.createdAt) / 60000);
			return jsonResult(
				{
					status: "skipped",
					reason: "Files unchanged since last snapshot",
					lastSnapshotId: match.snapshotId,
					lastSnapshotTime: new Date(match.createdAt).toISOString(),
					minutesAgo,
					fileCount: files.length,
					message: `Skipped: files match snapshot from ${minutesAgo} minute(s) ago`,
					_hint: "No changes detected. Your previous snapshot already covers these files.",
					next_actions: buildSmartActions(
						[{ tool: "prepare_workspace", reason: "Check workspace state", priority: 2 }],
						{ hasUnsavedChanges: false },
					),
				},
				{ context, coaching: { lastAction: "snapshot_skipped" } },
			);
		}
	}

	const maxRetries = 3;
	let lastError: Error | null = null;
	let diagnosis: SnapshotDiagnosis | null = null;

	// Retry loop with auto-fix
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			// Read file contents using sanitized paths
			const fileContents = pathValidation.sanitizedPaths.map((fullPath, idx) => {
				if (!existsSync(fullPath)) {
					throw new Error(`File not found: ${files[idx]}`);
				}
				return {
					path: files[idx],
					content: readFileSync(fullPath, "utf8"),
				};
			});

			// Create snapshot using engine
			const snapshot = await storage.createSnapshot(fileContents, {
				description: reason,
				trigger: (trigger as "manual" | "auto" | "ai-detection") || "manual",
			});

			return jsonResult(
				{
					status: "success",
					snapshotId: snapshot.id,
					fileCount: snapshot.files.length,
					totalSize: snapshot.totalSize,
					createdAt: new Date(snapshot.createdAt).toISOString(),
					message: `Snapshot created with ${snapshot.files.length} file(s)`,
					attempts: attempt + 1,
					autoFixed: attempt > 0,
					next_actions: buildSmartActions(
						[{ tool: "snapshot_list", reason: "Verify snapshot", priority: 2 }],
						{ hasUnsavedChanges: false, lastSnapshotMinutes: 0 },
					),
				},
				{ context, coaching: { lastAction: "snapshot_create", taskPhase: "working" } },
			);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Diagnose the failure
			diagnosis = diagnoseSnapshotFailure(lastError, files, context.workspaceRoot);

			// If we can auto-fix and haven't exhausted retries, try fixing
			if (diagnosis.canAutoFix && attempt < maxRetries) {
				const fixed = await applyAutomaticFix(diagnosis, {
					workspaceRoot: context.workspaceRoot,
					files,
				});

				if (fixed) {
					// Auto-fix succeeded, retry
					continue;
				}
			}

			// Can't auto-fix or exhausted retries - return error with diagnosis
			break;
		}
	}

	// All retries failed - return detailed diagnosis
	if (lastError && diagnosis) {
		const formattedDiagnosis = formatDiagnosis(diagnosis);

		return errorJsonResult({
			status: "error",
			error: "E106_SNAPSHOT_CREATION_FAILED",
			message: lastError.message,
			diagnosis: {
				type: diagnosis.type,
				message: diagnosis.message,
				cause: diagnosis.cause,
				suggestedFix: diagnosis.suggestedFix,
				userAction: diagnosis.userAction,
				confidence: diagnosis.confidence,
				affectedFiles: diagnosis.affectedFiles,
			},
			formatted: formattedDiagnosis,
			next_actions: diagnosis.canAutoFix
				? [{ tool: "snapshot_create", priority: 1, reason: "Retry with manual fix" }]
				: [],
		});
	}

	// Fallback error (should never reach here)
	return result(`Snapshot creation failed: ${lastError?.message || "Unknown error"}`, true);
};

/**
 * snapshot_list - List snapshots
 */
export const handleSnapshotList: ToolHandler = async (args, context) => {
	const { limit = 20, since } = args as { limit?: number; since?: string };

	const storage = createStorage(context.workspaceRoot);
	let snapshots = storage.listSnapshots();

	// Filter by since if provided
	if (since) {
		const sinceTime = new Date(since).getTime();
		snapshots = snapshots.filter((s) => s.createdAt >= sinceTime);
	}

	// Limit results
	snapshots = snapshots.slice(0, limit);

	return jsonResult({
		status: "success",
		count: snapshots.length,
		snapshots: snapshots.map((s) => ({
			id: s.id,
			createdAt: new Date(s.createdAt).toISOString(),
			fileCount: s.files.length,
			totalSize: s.totalSize,
			description: s.description,
			trigger: s.trigger,
			files: s.files.map((f) => f.path),
		})),
		next_actions:
			snapshots.length > 0
				? [
						{
							tool: "snapshot_restore",
							priority: 2,
							reason: "Restore if needed",
							args: { snapshotId: snapshots[0].id },
						},
					]
				: [{ tool: "snapshot_create", priority: 1, reason: "No snapshots yet" }],
	});
};

/**
 * snapshot_restore - Restore snapshot
 */
export const handleSnapshotRestore: ToolHandler = async (args, context) => {
	const {
		snapshotId,
		files: filterFiles,
		dryRun,
	} = args as {
		snapshotId?: string;
		files?: string[];
		dryRun?: boolean;
	};

	if (!snapshotId) {
		return errorJsonResult(CommonErrors.missingParam("snapshotId"));
	}

	// P0-004: Validate filter file paths if provided
	if (filterFiles && filterFiles.length > 0) {
		const pathValidation = validateFilePaths(filterFiles, context.workspaceRoot);
		if (!pathValidation.valid) {
			return errorJsonResult(CommonErrors.pathTraversalBlocked(pathValidation.invalidPath, pathValidation.error));
		}
	}

	const storage = createStorage(context.workspaceRoot);

	try {
		// Get snapshot to validate it exists
		const snapshot = storage.getSnapshot(snapshotId);
		if (!snapshot) {
			return errorJsonResult(CommonErrors.snapshotNotFound(snapshotId));
		}

		// Restore files from snapshot
		const restoredFiles = await storage.restore(snapshotId);

		// Filter if specific files requested
		const filesToRestore = filterFiles ? restoredFiles.filter((f) => filterFiles.includes(f.path)) : restoredFiles;

		if (dryRun) {
			return jsonResult({
				status: "dry_run",
				snapshotId,
				wouldRestore: filesToRestore.map((f) => ({
					path: f.path,
					size: Buffer.byteLength(f.content, "utf8"),
				})),
				message: `Would restore ${filesToRestore.length} file(s)`,
			});
		}

		// P0-005: Create backup snapshot BEFORE overwriting files
		const existingFiles: { path: string; content: string }[] = [];
		for (const file of filesToRestore) {
			const fullPath = join(context.workspaceRoot, file.path);
			if (existsSync(fullPath)) {
				existingFiles.push({
					path: file.path,
					content: readFileSync(fullPath, "utf8"),
				});
			}
		}

		let backupSnapshotId: string | null = null;
		if (existingFiles.length > 0) {
			const backupSnapshot = await storage.createSnapshot(existingFiles, {
				description: `Auto-backup before restore from ${snapshotId}`,
				trigger: "auto",
			});
			backupSnapshotId = backupSnapshot.id;
		}

		// Actually write files
		for (const file of filesToRestore) {
			const fullPath = join(context.workspaceRoot, file.path);
			const dir = dirname(fullPath);
			if (!existsSync(dir)) {
				await import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
			}
			writeFileSync(fullPath, file.content, "utf8");
		}

		return jsonResult({
			status: "success",
			snapshotId,
			backupSnapshotId,
			restoredFiles: filesToRestore.map((f) => f.path),
			message: `Restored ${filesToRestore.length} file(s) from snapshot${backupSnapshotId ? ` (backup: ${backupSnapshotId})` : ""}`,
			next_actions: [{ tool: "prepare_workspace", priority: 1, reason: "Verify workspace state" }],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Snapshot restore failed: ${message}`, true);
	}
};

/**
 * validate - Code validation
 * Supports "quick" (fast pattern checks) and "comprehensive" (full 7-layer pipeline)
 * Uses Intelligence facade for comprehensive validation
 */
export const handleValidate: ToolHandler = async (args, context) => {
	const {
		mode = "quick",
		code,
		filePath,
	} = args as {
		mode?: "quick" | "comprehensive";
		code?: string;
		filePath?: string;
	};

	if (!code || !filePath) {
		return errorJsonResult(CommonErrors.missingParam("code, filePath"));
	}

	// Comprehensive mode: use full 7-layer ValidationPipeline from Intelligence
	if (mode === "comprehensive") {
		try {
			const intel = getIntelligence(context.workspaceRoot);
			const validation = await intel.checkPatterns(code, filePath);

			return jsonResult({
				status: "success",
				mode: "comprehensive",
				filePath,
				passed: validation.overall.passed,
				confidence: validation.overall.confidence,
				totalIssues: validation.overall.totalIssues,
				recommendation: validation.recommendation,
				layers: validation.layers.map((l) => ({
					name: l.layer,
					passed: l.passed,
					issueCount: l.issues.length,
					issues: l.issues.map((i) => ({
						severity: i.severity,
						type: i.type,
						message: i.message,
						line: i.line,
						fix: i.fix,
					})),
					duration: l.duration,
				})),
				focusPoints: validation.focusPoints,
				message: validation.overall.passed
					? "All validation layers passed"
					: `Found ${validation.overall.totalIssues} issue(s) across ${validation.layers.filter((l) => !l.passed).length} layer(s)`,
				next_actions: validation.overall.passed
					? []
					: [
							{
								tool: "validate",
								priority: 1,
								reason: "Re-validate after fixes",
								args: { mode: "comprehensive" },
							},
						],
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return result(`Comprehensive validation failed: ${message}`, true);
		}
	}

	// Quick mode: fast pattern checks without full pipeline
	const violations: Array<{
		rule: string;
		severity: "critical" | "warning" | "info";
		line?: number;
		message: string;
	}> = [];

	// Check for common issues with line detection
	const lines = code.split("\n");
	lines.forEach((line, idx) => {
		const lineNum = idx + 1;
		if (line.includes("console.log")) {
			violations.push({
				rule: "no-console",
				severity: "warning",
				line: lineNum,
				message: "console.log found - consider removing for production",
			});
		}
		if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
			violations.push({
				rule: "no-explicit-any",
				severity: "warning",
				line: lineNum,
				message: "Explicit 'any' type found - consider more specific type",
			});
		}
		if (/\/\/\s*(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
			violations.push({
				rule: "no-todo-comments",
				severity: "info",
				line: lineNum,
				message: "TODO/FIXME comment found - consider addressing before commit",
			});
		}
		if (/debugger\b/.test(line)) {
			violations.push({
				rule: "no-debugger",
				severity: "critical",
				line: lineNum,
				message: "debugger statement found - must remove before production",
			});
		}
	});

	// Check file-level patterns
	if (filePath.includes("auth") || filePath.includes("security")) {
		if (code.includes("eval(") || code.includes("Function(")) {
			violations.push({
				rule: "no-eval-in-security",
				severity: "critical",
				message: "eval/Function in security-sensitive file - potential code injection risk",
			});
		}
	}

	const criticalCount = violations.filter((v) => v.severity === "critical").length;
	const warningCount = violations.filter((v) => v.severity === "warning").length;
	const confidence =
		criticalCount > 0
			? 30
			: warningCount > 2
				? 60
				: violations.length === 0
					? 100
					: Math.max(70, 100 - warningCount * 10);

	const recommendation = confidence >= 95 ? "auto_merge" : confidence >= 70 ? "quick_review" : "full_review";

	return jsonResult({
		status: "success",
		mode: "quick",
		filePath,
		passed: criticalCount === 0,
		confidence,
		totalIssues: violations.length,
		violations,
		recommendation,
		message:
			violations.length === 0
				? "No violations found"
				: `Found ${violations.length} issue(s): ${criticalCount} critical, ${warningCount} warnings`,
		hint:
			criticalCount > 0
				? "Fix critical issues before committing"
				: warningCount > 2
					? "Consider running comprehensive validation"
					: null,
		next_actions:
			criticalCount > 0 || warningCount > 2
				? [
						{
							tool: "validate",
							priority: 1,
							reason: "Run comprehensive validation",
							args: { mode: "comprehensive" },
						},
					]
				: [],
	});
};

/**
 * context - Context management
 * P1-004: Full implementation of all context operations
 */
export const handleContext: ToolHandler = async (args, context) => {
	const { op, domain, name, value } = args as {
		op?: string;
		domain?: string;
		name?: string;
		value?: number;
	};

	if (!op) {
		return errorJsonResult(CommonErrors.missingParam("op"));
	}

	const ctxDir = join(context.workspaceRoot, ".snapback", "ctx");
	const ctxPath = join(ctxDir, "context.json");
	const ctxFilePath = join(context.workspaceRoot, ".ctx");

	switch (op) {
		case "status": {
			const exists = existsSync(ctxPath);
			const ctxFileExists = existsSync(ctxFilePath);
			let contextData: Record<string, unknown> | null = null;
			if (exists) {
				try {
					contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
				} catch {
					// Ignore parse errors
				}
			}
			return jsonResult({
				op: "status",
				initialized: exists,
				path: ctxPath,
				ctxFileExists,
				projectPhase: contextData?.project_phase || "unknown",
				priority: contextData?.priority || "unknown",
				message: exists ? "Context initialized" : "Context not initialized - run op: init",
			});
		}
		case "init": {
			// Create context directory if needed
			if (!existsSync(ctxDir)) {
				await import("node:fs").then((fs) => fs.mkdirSync(ctxDir, { recursive: true }));
			}

			// Default context structure
			const defaultContext = {
				project_phase: "development",
				priority: "stability",
				constraints: {
					extension: {
						bundle: { max: 150, unit: "KB", description: "Max extension bundle size" },
					},
					web: {
						fcp: { max: 1500, unit: "ms", description: "First Contentful Paint" },
						lcp: { max: 2500, unit: "ms", description: "Largest Contentful Paint" },
					},
				},
				blockers: [],
				lastScanned: new Date().toISOString(),
				staleAfterDays: 7,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			// P0-002: Use atomic write for crash safety
			const writeResult = atomicWriteFileSync(ctxPath, JSON.stringify(defaultContext, null, 2));
			if (!writeResult.success) {
				return jsonResult({
					op: "init",
					status: "error",
					error: "E404_CONTEXT_OPERATION_FAILED",
					message: writeResult.error,
				});
			}

			return jsonResult({
				op: "init",
				status: "success",
				path: ctxPath,
				message: "Context initialized with default configuration",
				next_actions: [
					{ tool: "context", priority: 1, reason: "Check status", args: { op: "status" } },
					{ tool: "context", priority: 2, reason: "Build .ctx file", args: { op: "build" } },
				],
			});
		}
		case "build": {
			// Build .ctx file from context.json
			if (!existsSync(ctxPath)) {
				return jsonResult({
					op: "build",
					status: "error",
					error: "E204_CONTEXT_NOT_INITIALIZED",
					message: "Context not initialized - run op: init first",
				});
			}

			try {
				const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
				// Build minified .ctx for LLM consumption
				const ctxContent = JSON.stringify(contextData);

				// P0-002: Use atomic write for crash safety
				const writeResult = atomicWriteFileSync(ctxFilePath, ctxContent);
				if (!writeResult.success) {
					return jsonResult({
						op: "build",
						status: "error",
						error: "E404_CONTEXT_OPERATION_FAILED",
						message: writeResult.error,
					});
				}

				return jsonResult({
					op: "build",
					status: "success",
					path: ctxFilePath,
					size: ctxContent.length,
					message: ".ctx file built successfully",
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "build",
					status: "error",
					error: "E404_CONTEXT_OPERATION_FAILED",
					message: `Failed to build .ctx: ${msg}`,
				});
			}
		}
		case "validate": {
			if (!existsSync(ctxPath)) {
				return jsonResult({
					op: "validate",
					valid: false,
					reason: "Context not initialized",
				});
			}

			const ctxFileExists = existsSync(ctxFilePath);
			if (!ctxFileExists) {
				return jsonResult({
					op: "validate",
					valid: false,
					reason: ".ctx file missing - run op: build",
					next_actions: [{ tool: "context", priority: 1, reason: "Build .ctx", args: { op: "build" } }],
				});
			}

			// Check if .ctx is in sync with context.json
			const contextJson = readFileSync(ctxPath, "utf8");
			const ctxFile = readFileSync(ctxFilePath, "utf8");
			const isSync = JSON.stringify(JSON.parse(contextJson)) === ctxFile;

			return jsonResult({
				op: "validate",
				valid: isSync,
				reason: isSync ? "Context is in sync" : "Context is stale - run op: build",
				next_actions: isSync
					? []
					: [{ tool: "context", priority: 1, reason: "Rebuild", args: { op: "build" } }],
			});
		}
		case "constraint": {
			if (!domain || !name) {
				return errorJsonResult(CommonErrors.missingParam("domain, name"));
			}

			if (!existsSync(ctxPath)) {
				return jsonResult({
					op: "constraint",
					status: "error",
					error: "E204_CONTEXT_NOT_INITIALIZED",
					message: "Context not initialized",
				});
			}

			try {
				const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
				const constraint = contextData?.constraints?.[domain]?.[name];

				if (!constraint) {
					return jsonResult({
						op: "constraint",
						domain,
						name,
						found: false,
						message: `Constraint ${domain}.${name} not found`,
					});
				}

				return jsonResult({
					op: "constraint",
					domain,
					name,
					found: true,
					threshold: constraint.max,
					unit: constraint.unit,
					description: constraint.description,
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "constraint",
					status: "error",
					error: "E404_CONTEXT_OPERATION_FAILED",
					message: `Failed to read constraint: ${msg}`,
				});
			}
		}
		case "check": {
			if (!domain || !name || value === undefined) {
				return errorJsonResult(CommonErrors.missingParam("domain, name, value"));
			}

			if (!existsSync(ctxPath)) {
				return jsonResult({
					op: "check",
					status: "error",
					error: "E204_CONTEXT_NOT_INITIALIZED",
					message: "Context not initialized",
				});
			}

			try {
				const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
				const constraint = contextData?.constraints?.[domain]?.[name];

				if (!constraint) {
					return jsonResult({
						op: "check",
						domain,
						name,
						value,
						passes: true, // No constraint = passes
						message: `No constraint defined for ${domain}.${name}`,
					});
				}

				const passes = value <= constraint.max;
				return jsonResult({
					op: "check",
					domain,
					name,
					value,
					threshold: constraint.max,
					unit: constraint.unit,
					passes,
					message: passes
						? `Value ${value}${constraint.unit} is within constraint (max: ${constraint.max}${constraint.unit})`
						: `Value ${value}${constraint.unit} exceeds constraint (max: ${constraint.max}${constraint.unit})`,
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "check",
					status: "error",
					error: "E404_CONTEXT_OPERATION_FAILED",
					message: `Failed to check constraint: ${msg}`,
				});
			}
		}
		case "blockers": {
			if (!existsSync(ctxPath)) {
				return jsonResult({
					op: "blockers",
					blockers: [],
					message: "Context not initialized",
				});
			}

			try {
				const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
				const blockers = contextData?.blockers || [];
				const lastScanned = contextData?.lastScanned;
				const staleAfterDays = contextData?.staleAfterDays || 7;

				// Check staleness
				let isStale = false;
				let daysSinceScanned: number | null = null;
				let stalenessWarning: string | null = null;

				if (lastScanned) {
					const scanTime = new Date(lastScanned).getTime();
					daysSinceScanned = Math.floor((Date.now() - scanTime) / (1000 * 60 * 60 * 24));
					isStale = daysSinceScanned > staleAfterDays;

					if (isStale) {
						stalenessWarning = `Data is ${daysSinceScanned} days stale - consider refreshing`;
					}
				} else {
					// No lastScanned field means old format or never scanned
					stalenessWarning = "No scan timestamp found - data may be stale";
				}

				const result: Record<string, unknown> = {
					op: "blockers",
					blockers,
					count: blockers.length,
					message: blockers.length > 0 ? `${blockers.length} blocker(s) found` : "No blockers",
					lastScanned,
					daysSinceScanned,
					isStale,
				};

				if (stalenessWarning) {
					result.warning = stalenessWarning;
					result.next_actions = [
						{ tool: "context", priority: 1, reason: "Refresh stale data", args: { op: "scan" } },
					];
				}

				return jsonResult(result);
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "blockers",
					status: "error",
					error: "E404_CONTEXT_OPERATION_FAILED",
					message: `Failed to read blockers: ${msg}`,
				});
			}
		}
		case "reset": {
			// Quick Fix: Reset/cleanup stale context
			if (!existsSync(ctxPath)) {
				return jsonResult({
					op: "reset",
					status: "success",
					message: "No context to reset",
				});
			}

			try {
				// Remove stale context file
				await import("node:fs").then((fs) => fs.unlinkSync(ctxPath));

				// Also remove .ctx file if exists
				if (existsSync(ctxFilePath)) {
					await import("node:fs").then((fs) => fs.unlinkSync(ctxFilePath));
				}

				return jsonResult({
					op: "reset",
					status: "success",
					message: "Context reset successfully - run op: init to recreate",
					next_actions: [{ tool: "context", priority: 1, reason: "Recreate context", args: { op: "init" } }],
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "reset",
					status: "error",
					error: "E404_CONTEXT_OPERATION_FAILED",
					message: `Failed to reset context: ${msg}`,
				});
			}
		}
		case "scan": {
			// Best Fix: Real-time scanning of blockers
			if (!existsSync(ctxPath)) {
				return jsonResult({
					op: "scan",
					status: "error",
					error: "E204_CONTEXT_NOT_INITIALIZED",
					message: "Context not initialized - run op: init first",
					next_actions: [
						{ tool: "context", priority: 1, reason: "Initialize context", args: { op: "init" } },
					],
				});
			}

			try {
				// Read existing context
				const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
				const newBlockers: Array<{
					key: string;
					label: string;
					current: number | string;
					target: number | string;
				}> = [];

				// Scan for TypeScript errors
				try {
					const { execSync } = await import("node:child_process");
					const tscOutput = execSync("npx tsc --noEmit --pretty false 2>&1 || true", {
						cwd: context.workspaceRoot,
						encoding: "utf8",
						timeout: 30000,
					});

					// Count TypeScript errors
					const errorMatches = tscOutput.match(/error TS\d+:/g);
					const tsErrorCount = errorMatches ? errorMatches.length : 0;

					if (tsErrorCount > 0) {
						newBlockers.push({
							key: "_ts",
							label: "typescript-errors",
							current: tsErrorCount,
							target: 0,
						});
					}
				} catch (tsError) {
					// TypeScript check failed - non-blocking
					console.error("TypeScript scan failed:", tsError);
				}

				// Scan for bundle size (if extension exists)
				const extensionDistPath = join(context.workspaceRoot, "apps", "vscode", "dist");
				if (existsSync(extensionDistPath)) {
					try {
						const { readdirSync, statSync } = await import("node:fs");
						let totalSize = 0;

						const calculateDirSize = (dir: string): void => {
							const files = readdirSync(dir);
							for (const file of files) {
								const filePath = join(dir, file);
								const stats = statSync(filePath);
								if (stats.isDirectory()) {
									calculateDirSize(filePath);
								} else {
									totalSize += stats.size;
								}
							}
						};

						calculateDirSize(extensionDistPath);
						const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
						const maxSizeMB = contextData.constraints?.extension?.bundle?.max || 150 / 1024; // Convert KB to MB if needed

						if (Number.parseFloat(sizeInMB) > maxSizeMB) {
							newBlockers.push({
								key: "_eb",
								label: "bundle-size",
								current: `${sizeInMB}MB`,
								target: `${maxSizeMB}MB`,
							});
						}
					} catch (bundleError) {
						// Bundle scan failed - non-blocking
						console.error("Bundle size scan failed:", bundleError);
					}
				}

				// Update context with new blockers and scan timestamp
				contextData.blockers = newBlockers;
				contextData.lastScanned = new Date().toISOString();
				contextData.updated_at = new Date().toISOString();

				// Write updated context
				const writeResult = atomicWriteFileSync(ctxPath, JSON.stringify(contextData, null, 2));
				if (!writeResult.success) {
					return jsonResult({
						op: "scan",
						status: "error",
						error: "E404_CONTEXT_OPERATION_FAILED",
						message: writeResult.error,
					});
				}

				return jsonResult({
					op: "scan",
					status: "success",
					scannedAt: contextData.lastScanned,
					blockers: newBlockers,
					blockersFound: newBlockers.length,
					message:
						newBlockers.length > 0
							? `Found ${newBlockers.length} blocker(s) - ${newBlockers.map((b) => b.label).join(", ")}`
							: "No blockers detected",
					next_actions:
						newBlockers.length > 0
							? [{ tool: "context", priority: 2, reason: "Review blockers", args: { op: "blockers" } }]
							: [],
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "scan",
					status: "error",
					error: "E404_CONTEXT_OPERATION_FAILED",
					message: `Scan failed: ${msg}`,
				});
			}
		}
		default:
			return jsonResult({
				op,
				status: "error",
				error: "E103_INVALID_PARAM_VALUE",
				message: `Unknown context operation: ${op}`,
				validOps: ["init", "build", "validate", "status", "constraint", "check", "blockers", "reset", "scan"],
			});
	}
};

/**
 * session - Session management
 * P1-005: Full implementation of session operations
 */
export const handleSession: ToolHandler = async (args, context) => {
	const { op, taskDescription, files, acceptLearnings } = args as {
		op?: string;
		taskDescription?: string;
		files?: string[];
		acceptLearnings?: number[];
	};

	if (!op) {
		return errorJsonResult(CommonErrors.missingParam("op"));
	}

	const sessionDir = join(context.workspaceRoot, ".snapback", "session");
	const sessionPath = join(sessionDir, "current.json");
	const learningsPath = join(context.workspaceRoot, ".snapback", "learnings", "learnings.jsonl");

	switch (op) {
		case "start": {
			// Create session directory if needed
			if (!existsSync(sessionDir)) {
				await import("node:fs").then((fs) => fs.mkdirSync(sessionDir, { recursive: true }));
			}

			// Check for existing session
			if (existsSync(sessionPath)) {
				try {
					const existingSession = JSON.parse(readFileSync(sessionPath, "utf8"));
					return jsonResult({
						op: "start",
						status: "already_active",
						session: existingSession,
						message: "Session already active - end current session first",
						next_actions: [
							{ tool: "session", priority: 1, reason: "End current session", args: { op: "end" } },
						],
					});
				} catch {
					// Continue to create new session if parse fails
				}
			}

			// Create new session
			const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
			const session = {
				id: sessionId,
				startedAt: new Date().toISOString(),
				taskDescription: taskDescription || "MCP session",
				plannedFiles: files || [],
				snapshotCount: 0,
				modifiedFiles: [],
				tier: context.tier,
			};

			// P0-002: Use atomic write for crash safety
			const writeResult = atomicWriteFileSync(sessionPath, JSON.stringify(session, null, 2));
			if (!writeResult.success) {
				return jsonResult({
					op: "start",
					status: "error",
					error: "E405_SESSION_OPERATION_FAILED",
					message: writeResult.error,
				});
			}

			// Get recommendations based on planned files
			const recommendations: string[] = [];
			if (files && files.length > 0) {
				const hasAuthFiles = files.some((f) => f.includes("auth") || f.includes("security"));
				const hasConfigFiles = files.some((f) => f.includes("config") || f.includes(".env"));
				if (hasAuthFiles) {
					recommendations.push("Create snapshot before modifying auth-related files");
				}
				if (hasConfigFiles) {
					recommendations.push("Verify config changes with prepare_workspace after edits");
				}
				if (files.length > 5) {
					recommendations.push("Consider breaking this into smaller focused sessions");
				}
			}

			return jsonResult({
				op: "start",
				status: "success",
				session,
				recommendations,
				message: "Session started",
				next_actions: [
					{ tool: "prepare_workspace", priority: 1, reason: "Check workspace state before starting" },
				],
			});
		}
		case "stats": {
			if (existsSync(sessionPath)) {
				try {
					const session = JSON.parse(readFileSync(sessionPath, "utf8"));
					const startTime = new Date(session.startedAt).getTime();
					const duration = Math.floor((Date.now() - startTime) / 60000); // minutes

					return jsonResult({
						op: "stats",
						session: {
							...session,
							durationMinutes: duration,
						},
						message: "Session active",
					});
				} catch {
					// Fallthrough to no session
				}
			}
			return jsonResult({
				op: "stats",
				session: null,
				message: "No active session",
				hint: "Use op: start to begin a session",
			});
		}
		case "recommendations": {
			if (!existsSync(sessionPath)) {
				return jsonResult({
					op: "recommendations",
					recommendations: ["Start a session to get personalized recommendations"],
					message: "No active session",
				});
			}

			try {
				const session = JSON.parse(readFileSync(sessionPath, "utf8"));
				const recommendations: string[] = [];

				// Time-based recommendations
				const startTime = new Date(session.startedAt).getTime();
				const duration = (Date.now() - startTime) / 60000;
				if (duration > 60) {
					recommendations.push("Session running for over an hour - consider taking a break");
				}
				if (session.snapshotCount === 0 && duration > 15) {
					recommendations.push("No snapshots created yet - consider creating a checkpoint");
				}

				// Load learnings for personalized recommendations
				if (existsSync(learningsPath)) {
					try {
						const learnings = readFileSync(learningsPath, "utf8")
							.split("\n")
							.filter(Boolean)
							.map((line) => JSON.parse(line));
						const recentLearnings = learnings.slice(-3);
						for (const learning of recentLearnings) {
							recommendations.push(`Remember: ${learning.action}`);
						}
					} catch {
						// Ignore learning parse errors
					}
				}

				return jsonResult({
					op: "recommendations",
					sessionId: session.id,
					recommendations: recommendations.length > 0 ? recommendations : ["All clear! Keep coding."],
					message: `${recommendations.length} recommendation(s)`,
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "recommendations",
					status: "error",
					error: "E405_SESSION_OPERATION_FAILED",
					message: `Failed to get recommendations: ${msg}`,
				});
			}
		}
		case "end": {
			if (!existsSync(sessionPath)) {
				return jsonResult({
					op: "end",
					status: "no_session",
					message: "No active session to end",
				});
			}

			try {
				const session = JSON.parse(readFileSync(sessionPath, "utf8"));
				const startTime = new Date(session.startedAt).getTime();
				const duration = Math.floor((Date.now() - startTime) / 60000);

				// Archive session
				const archiveDir = join(sessionDir, "archive");
				if (!existsSync(archiveDir)) {
					await import("node:fs").then((fs) => fs.mkdirSync(archiveDir, { recursive: true }));
				}

				const archivedSession = {
					...session,
					endedAt: new Date().toISOString(),
					durationMinutes: duration,
				};

				const archivePath = join(archiveDir, `${session.id}.json`);
				// P0-002: Use atomic write for crash safety
				const archiveWriteResult = atomicWriteFileSync(archivePath, JSON.stringify(archivedSession, null, 2));
				if (!archiveWriteResult.success) {
					return jsonResult({
						op: "end",
						status: "error",
						error: "E405_SESSION_OPERATION_FAILED",
						message: archiveWriteResult.error,
					});
				}

				// Remove current session
				await import("node:fs").then((fs) => fs.unlinkSync(sessionPath));

				// Suggest learnings to accept
				const suggestedLearnings = [
					{ index: 0, suggestion: "What patterns did you discover?" },
					{ index: 1, suggestion: "Any pitfalls to avoid next time?" },
				];

				return jsonResult({
					op: "end",
					status: "success",
					summary: {
						sessionId: session.id,
						durationMinutes: duration,
						snapshotCount: session.snapshotCount,
						modifiedFiles: session.modifiedFiles?.length || 0,
					},
					archivePath,
					suggestedLearnings: acceptLearnings ? [] : suggestedLearnings,
					message: `Session ended after ${duration} minutes`,
					next_actions: [{ tool: "learn", priority: 1, reason: "Record learnings from this session" }],
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return jsonResult({
					op: "end",
					status: "error",
					error: "E405_SESSION_OPERATION_FAILED",
					message: `Failed to end session: ${msg}`,
				});
			}
		}
		default:
			return jsonResult({
				op,
				status: "error",
				error: "E103_INVALID_PARAM_VALUE",
				message: `Unknown session operation: ${op}`,
				validOps: ["start", "stats", "recommendations", "end"],
			});
	}
};

/**
 * learn - Record learnings
 */
export const handleLearn: ToolHandler = async (args, context) => {
	const { type, trigger, action, source } = args as {
		type?: string;
		trigger?: string;
		action?: string;
		source?: string;
	};

	if (!type || !trigger || !action) {
		return errorJsonResult(CommonErrors.missingParam("type, trigger, action"));
	}

	const learningsPath = join(context.workspaceRoot, ".snapback", "learnings", "learnings.jsonl");

	const learning = {
		type,
		trigger,
		action,
		source: source || "mcp",
		timestamp: new Date().toISOString(),
	};

	try {
		// Ensure directory exists
		const dir = dirname(learningsPath);
		if (!existsSync(dir)) {
			await import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
		}

		// Append to JSONL file
		const line = JSON.stringify(learning) + "\n";
		await import("node:fs").then((fs) => fs.appendFileSync(learningsPath, line));

		return jsonResult({
			status: "success",
			learning,
			message: "Learning recorded",
			storagePath: learningsPath,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Failed to record learning: ${message}`, true);
	}
};

/**
 * acknowledge_risk - Acknowledge risk
 */
export const handleAcknowledgeRisk: ToolHandler = async (args, context) => {
	const { files, reason } = args as { files?: string[]; reason?: string };

	if (!files || !reason) {
		return errorJsonResult(CommonErrors.missingParam("files, reason"));
	}

	const acknowledgment = {
		files,
		reason,
		acknowledgedAt: new Date().toISOString(),
		tier: context.tier,
	};

	// Log to .snapback/audit/
	const auditPath = join(context.workspaceRoot, ".snapback", "audit", "acknowledgments.jsonl");

	try {
		const dir = dirname(auditPath);
		if (!existsSync(dir)) {
			await import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
		}
		const line = JSON.stringify(acknowledgment) + "\n";
		await import("node:fs").then((fs) => fs.appendFileSync(auditPath, line));
	} catch {
		// Non-fatal - continue even if audit fails
	}

	return jsonResult({
		status: "acknowledged",
		acknowledged: true,
		files,
		reason,
		timestamp: acknowledgment.acknowledgedAt,
		message: "Risk acknowledged - proceed with changes",
		next_actions: [
			{
				tool: "snapshot_create",
				priority: 1,
				reason: "Create safety snapshot",
				args: { files, reason: `Pre-risk: ${reason}` },
			},
		],
	});
};

/**
 * get_context - Get workspace context and learnings for a task
 * Uses Intelligence facade for semantic retrieval
 */
export const handleGetContext: ToolHandler = async (args, context) => {
	const { task, files, keywords } = args as {
		task?: string;
		files?: string[];
		keywords?: string[];
	};

	if (!task) {
		return errorJsonResult(CommonErrors.missingParam("task"));
	}

	try {
		const intel = getIntelligence(context.workspaceRoot);

		// Get context from Intelligence
		const ctx = await intel.getContext({
			task,
			files: files || [],
			keywords: keywords || [],
		});

		// Get violations summary
		const violations = intel.getViolationsSummary();

		// Get vitals snapshot
		const vitals = intel.getVitalsSnapshot(context.workspaceRoot);

		return jsonResult({
			workspace: {
				root: context.workspaceRoot,
				tier: context.tier,
			},
			context: {
				patterns: ctx.patterns,
				hardRules: ctx.hardRules,
				contextSections: ctx.contextSections,
				hint: ctx.hint,
			},
			relevantLearnings: ctx.relevantLearnings.slice(0, 10).map((l) => ({
				type: l.type,
				trigger: l.trigger,
				action: l.action,
			})),
			recentViolations: ctx.recentViolations.slice(0, 5).map((v) => ({
				type: v.type,
				file: v.file,
				message: v.message,
				prevention: v.prevention,
			})),
			violationsSummary: {
				total: violations.total,
				readyForPromotion: violations.readyForPromotion,
				readyForAutomation: violations.readyForAutomation,
			},
			vitals: vitals
				? {
						pulse: vitals.pulse.level,
						pressure: vitals.pressure.value,
						trajectory: vitals.trajectory,
					}
				: null,
			next_actions: [{ tool: "check_patterns", priority: 2, reason: "Validate code before commit" }],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Failed to get context: ${message}`, true);
	}
};

/**
 * check_patterns - Validate code against patterns using 7-layer ValidationPipeline
 * Uses Intelligence facade for full validation
 */
export const handleCheckPatterns: ToolHandler = async (args, context) => {
	const { code, filePath } = args as {
		code?: string;
		filePath?: string;
	};

	if (!code || !filePath) {
		return errorJsonResult(CommonErrors.missingParam("code, filePath"));
	}

	try {
		const intel = getIntelligence(context.workspaceRoot);

		// Run full 7-layer validation
		const validation = await intel.checkPatterns(code, filePath);

		return jsonResult({
			passed: validation.overall.passed,
			confidence: validation.overall.confidence,
			totalIssues: validation.overall.totalIssues,
			recommendation: validation.recommendation,
			layers: validation.layers.map((l) => ({
				name: l.layer,
				passed: l.passed,
				issueCount: l.issues.length,
				issues: l.issues.map((i) => ({
					severity: i.severity,
					type: i.type,
					message: i.message,
					line: i.line,
					fix: i.fix,
				})),
				duration: l.duration,
			})),
			focusPoints: validation.focusPoints,
			next_actions: validation.overall.passed
				? []
				: [{ tool: "check_patterns", priority: 1, reason: "Re-validate after fixes" }],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Failed to check patterns: ${message}`, true);
	}
};

/**
 * report_violation - Report a constraint/pattern violation for learning
 * Uses Intelligence facade for violation tracking with auto-promotion
 */
export const handleReportViolation: ToolHandler = async (args, context) => {
	const { type, file, whatHappened, whyItHappened, prevention } = args as {
		type?: string;
		file?: string;
		whatHappened?: string;
		whyItHappened?: string;
		prevention?: string;
	};

	if (!type || !file || !whatHappened || !whyItHappened || !prevention) {
		return errorJsonResult(CommonErrors.missingParam("type, file, whatHappened, whyItHappened, prevention"));
	}

	try {
		const intel = getIntelligence(context.workspaceRoot);

		// Report violation to Intelligence
		const status = await intel.reportViolation({
			type,
			file,
			message: whatHappened,
			reason: whyItHappened,
			prevention,
		});

		return jsonResult({
			recorded: true,
			violationId: status.id,
			type,
			file,
			occurrences: status.count,
			promoted: status.shouldPromote,
			promotedTo: status.shouldPromote ? "pattern" : null,
			automation: status.shouldAutomate ? "pending" : null,
			message: status.shouldPromote
				? `Violation promoted to pattern after ${status.count} occurrences`
				: `Violation recorded (${status.count}/3 for promotion)`,
			next_actions: status.shouldPromote
				? [{ tool: "get_context", priority: 2, reason: "New pattern available in context" }]
				: [],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Failed to report violation: ${message}`, true);
	}
};

/**
 * get_learnings - Query past learnings by keywords
 * Uses Intelligence facade for learning retrieval
 */
export const handleGetLearnings: ToolHandler = async (args, context) => {
	const { keywords, limit = 10 } = args as {
		keywords?: string[];
		limit?: number;
	};

	if (!keywords || keywords.length === 0) {
		return errorJsonResult(CommonErrors.missingParam("keywords"));
	}

	try {
		const intel = getIntelligence(context.workspaceRoot);

		// Query learnings from Intelligence
		const learnings = intel.queryLearnings(keywords);
		const limited = learnings.slice(0, Math.min(limit, 50));

		return jsonResult({
			query: keywords,
			count: limited.length,
			totalMatches: learnings.length,
			learnings: limited.map((l) => ({
				id: l.id,
				type: l.type,
				trigger: l.trigger,
				action: l.action,
				source: l.source,
				timestamp: l.timestamp,
			})),
			message:
				limited.length > 0
					? `Found ${limited.length} learning(s) matching keywords`
					: "No learnings found for these keywords",
			next_actions: limited.length === 0 ? [{ tool: "learn", priority: 2, reason: "Record a new learning" }] : [],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Failed to get learnings: ${message}`, true);
	}
};

/**
 * meta - Tool metadata
 */
export const handleMeta: ToolHandler = async (_args, _context) => {
	return jsonResult({
		version: "0.1.0",
		status: "operational",
		tools: [
			{ name: "analyze", status: "implemented", description: "Risk and package analysis" },
			{ name: "prepare_workspace", status: "implemented", description: "Pre-flight workspace check" },
			{ name: "snapshot_create", status: "implemented", description: "Create file snapshot" },
			{ name: "snapshot_list", status: "implemented", description: "List snapshots" },
			{ name: "snapshot_restore", status: "implemented", description: "Restore from snapshot" },
			{ name: "validate", status: "implemented", description: "Code validation" },
			{ name: "context", status: "implemented", description: "Context management" },
			{ name: "session", status: "implemented", description: "Session management" },
			{ name: "learn", status: "implemented", description: "Record learnings" },
			{ name: "acknowledge_risk", status: "implemented", description: "Acknowledge risk" },
			{
				name: "get_context",
				status: "implemented",
				description: "Get workspace context and learnings for a task",
			},
			{
				name: "check_patterns",
				status: "implemented",
				description: "Validate code against 7-layer ValidationPipeline",
			},
			{ name: "report_violation", status: "implemented", description: "Report violations with auto-promotion" },
			{ name: "get_learnings", status: "implemented", description: "Query past learnings by keywords" },
			{ name: "meta", status: "implemented", description: "Tool metadata" },
			{ name: "cleanup", status: "implemented", description: "Reclaim space by removing stale data" },
		],
	});
};

/**
 * cleanup - Reclaim space by removing stale data
 *
 * Cleans up:
 * - Old snapshots beyond retention policy
 * - Stale learnings (age or architecture mismatch)
 * - Archived sessions
 * - Orphaned blobs (not referenced by any snapshot)
 */
export const handleCleanup: ToolHandler = async (args, context) => {
	const {
		target = "all",
		dryRun = true,
		maxAge,
		keepCount,
	} = args as {
		target?: "snapshots" | "learnings" | "sessions" | "blobs" | "all";
		dryRun?: boolean;
		maxAge?: number;
		keepCount?: number;
	};

	const storage = createStorage(context.workspaceRoot);
	const learningsPath = join(context.workspaceRoot, ".snapback", "learnings", "learnings.jsonl");
	const sessionArchiveDir = join(context.workspaceRoot, ".snapback", "session", "archive");

	const results: CleanupResult = {
		snapshots: { found: 0, stale: 0, deleted: 0 },
		learnings: { found: 0, stale: 0, deleted: 0 },
		sessions: { found: 0, stale: 0, deleted: 0 },
		blobs: { found: 0, stale: 0, deleted: 0, orphaned: 0 },
		totalBytesReclaimed: 0,
	};

	// Clean snapshots
	if (target === "snapshots" || target === "all") {
		const snapshotResult = storage.pruneSnapshots(maxAge || 30, keepCount || 10, dryRun);
		results.snapshots = {
			found: snapshotResult.totalSnapshots,
			stale: snapshotResult.staleSnapshots,
			deleted: snapshotResult.deletedSnapshots,
		};
	}

	// Clean learnings
	if (target === "learnings" || target === "all") {
		const archVersion = getArchitectureVersion(context.workspaceRoot);
		results.learnings = cleanupStaleLearnings(learningsPath, {
			maxAgeDays: maxAge || 90,
			archVersion,
			dryRun,
		});
	}

	// Clean sessions
	if (target === "sessions" || target === "all") {
		results.sessions = cleanupArchivedSessions(sessionArchiveDir, {
			maxAgeDays: maxAge || 30,
			dryRun,
		});
	}

	// Clean blobs (must run after snapshots to know what's orphaned)
	if (target === "blobs" || target === "all") {
		const blobResult = storage.garbageCollectBlobs(dryRun);
		results.blobs = {
			found: blobResult.totalBlobs,
			stale: blobResult.orphanedBlobs,
			deleted: blobResult.deletedBlobs,
			orphaned: blobResult.orphanedBlobs,
			bytesReclaimed: blobResult.bytesReclaimed,
		};
		results.totalBytesReclaimed += blobResult.bytesReclaimed;
	}

	const totalStale =
		results.snapshots.stale + results.learnings.stale + results.sessions.stale + results.blobs.orphaned;
	const totalDeleted =
		results.snapshots.deleted + results.learnings.deleted + results.sessions.deleted + results.blobs.deleted;

	return jsonResult(
		{
			status: "success",
			dryRun,
			target,
			results,
			summary: {
				totalStale,
				totalDeleted,
				bytesReclaimed: results.totalBytesReclaimed,
				bytesReclaimedFormatted: formatBytes(results.totalBytesReclaimed),
			},
			message: dryRun
				? `Would remove ${totalStale} stale item(s) and reclaim ${formatBytes(results.totalBytesReclaimed)}`
				: `Removed ${totalDeleted} item(s) and reclaimed ${formatBytes(results.totalBytesReclaimed)}`,
			_hint: dryRun
				? "This was a dry run. Call with dryRun: false to execute cleanup."
				: "Cleanup complete. Run prepare_workspace to verify workspace health.",
			next_actions: dryRun
				? totalStale > 0
					? [
							{
								tool: "cleanup",
								priority: 1,
								reason: "Execute cleanup",
								args: { target, dryRun: false },
							},
						]
					: []
				: [{ tool: "prepare_workspace", priority: 2, reason: "Verify workspace health" }],
		},
		{ context },
	);
};

/**
 * get_pairing_protocol - Get pairing protocol for AI agent system prompts
 */
export const handleGetPairingProtocol: ToolHandler = async (_args, context) => {
	const protocol = generatePairingProtocol(context.workspaceRoot);
	const contextSummary = getContextSummary(context.workspaceRoot);

	return jsonResult({
		status: "success",
		version: protocol.version,
		currentTask: protocol.currentTask,
		recentObservations: protocol.recentObservations,
		riskAreas: protocol.riskAreas,
		sessionStats: protocol.sessionStats,
		recommendations: protocol.recommendations,
		quickReference: protocol.quickReference,
		protocolText: protocol.protocolText,
		contextSummary,
		message: contextSummary.hasActiveTask
			? `Active task: ${protocol.currentTask?.description}`
			: "No active task - call begin_task to start",
	});
};

/**
 * Map facade names to handlers
 */
export const facadeHandlers: Record<string, ToolHandler> = {
	analyze: handleAnalyze,
	prepare_workspace: handlePrepareWorkspace,
	snapshot_create: handleSnapshotCreate,
	snapshot_list: handleSnapshotList,
	snapshot_restore: handleSnapshotRestore,
	validate: handleValidate,
	context: handleContext,
	session: handleSession,
	learn: handleLearn,
	acknowledge_risk: handleAcknowledgeRisk,
	get_context: handleGetContext,
	check_patterns: handleCheckPatterns,
	report_violation: handleReportViolation,
	get_learnings: handleGetLearnings,
	meta: handleMeta,
	cleanup: handleCleanup,
	// Pair programmer composite tools
	begin_task: handleBeginTask,
	quick_check: handleQuickCheck,
	what_changed: handleWhatChanged,
	review_work: handleReviewWork,
	complete_task: handleCompleteTask,
	get_pairing_protocol: handleGetPairingProtocol,
};
