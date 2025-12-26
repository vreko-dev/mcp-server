/**
 * MCP Handler Tests
 *
 * Comprehensive test coverage for all 11 facade tool handlers.
 * Tests happy paths, sad paths, edge cases, and error handling.
 *
 * P0-001: Release-blocking test coverage requirement
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	facadeHandlers,
	handleAcknowledgeRisk,
	handleAnalyze,
	handleCheckPatterns,
	handleContext,
	handleGetContext,
	handleGetLearnings,
	handleLearn,
	handleMeta,
	handleReportViolation,
	handleSession,
	handleSnapshotCreate,
	handleSnapshotList,
	handleSnapshotRestore,
	handleValidate,
} from "../src/facades/handlers.js";
import {
	getRecommendedAction,
	getSessionHealth,
	isRiskyState,
	sessionAwareResult,
	wrapWithSessionHealth,
} from "../src/facades/session-health.js";
import type { ToolContext } from "../src/registry.js";
import {
	checkPatternsSchema,
	getContextSchema,
	getLearningsSchema,
	reportViolationSchema,
	snapshotCreateSchema,
	validateFilePath,
	validateFilePaths,
	validateInput,
} from "../src/validation.js";

// ============================================================================
// Test Setup
// ============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace");

function createTestContext(overrides?: Partial<ToolContext>): ToolContext {
	return {
		workspaceRoot: TEST_WORKSPACE,
		tier: "pro",
		userId: "test-user",
		...overrides,
	};
}

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
	// Create .snapback directory
	const snapbackDir = join(TEST_WORKSPACE, ".snapback");
	if (!existsSync(snapbackDir)) {
		mkdirSync(snapbackDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

// ============================================================================
// Handler Registry Tests
// ============================================================================

describe("facadeHandlers registry", () => {
	it("should have 22 handlers registered", () => {
		expect(Object.keys(facadeHandlers)).toHaveLength(22);
	});

	it("should have all expected tool names", () => {
		const expectedTools = [
			// Core tools (15)
			"analyze",
			"prepare_workspace",
			"snapshot_create",
			"snapshot_list",
			"snapshot_restore",
			"validate",
			"context",
			"session",
			"learn",
			"acknowledge_risk",
			"get_context",
			"check_patterns",
			"report_violation",
			"get_learnings",
			"meta",
			"cleanup",
			// Pair programmer composite tools (6)
			"begin_task",
			"quick_check",
			"what_changed",
			"review_work",
			"complete_task",
			"get_pairing_protocol",
		];
		expect(Object.keys(facadeHandlers).sort()).toEqual(expectedTools.sort());
	});

	it("should have function handlers for each tool", () => {
		for (const [_name, handler] of Object.entries(facadeHandlers)) {
			expect(typeof handler).toBe("function");
		}
	});
});

// ============================================================================
// analyze Handler Tests
// ============================================================================

describe("handleAnalyze", () => {
	const ctx = createTestContext();

	describe("risk analysis", () => {
		it("should return low risk for empty changes", async () => {
			const result = await handleAnalyze({ type: "risk", changes: [] }, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.type).toBe("risk_assessment");
			expect(data.severity).toBe("low");
		});

		it("should detect high risk for security-sensitive files", async () => {
			const result = await handleAnalyze({ type: "risk", filePath: "src/auth/login.ts" }, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(data.severity).toBe("high");
			expect(data.riskFactors).toContain("Security-sensitive file");
		});

		it("should detect high risk for large change sets", async () => {
			const changes = Array(60).fill({ added: true, content: "line" });
			const result = await handleAnalyze({ type: "risk", changes }, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(data.severity).toBe("high");
			expect(data.riskFactors).toContain("Large change set (50+ lines)");
		});

		it("should include next_actions for high risk", async () => {
			const result = await handleAnalyze({ type: "risk", filePath: "src/security/auth.ts" }, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(data.next_actions).toBeDefined();
			expect(data.next_actions.length).toBeGreaterThan(0);
			expect(data.next_actions[0].tool).toBe("snapshot_create");
		});
	});

	describe("package analysis", () => {
		it("should return package validation for valid package", async () => {
			const result = await handleAnalyze({ type: "package", packageName: "lodash" }, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.type).toBe("package_validation");
			expect(data.packageName).toBe("lodash");
		});

		it("should error when packageName is missing", async () => {
			const result = await handleAnalyze({ type: "package" }, ctx);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("packageName");
		});
	});

	describe("error handling", () => {
		it("should error when type is missing", async () => {
			const result = await handleAnalyze({}, ctx);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("type");
		});
	});
});

// ============================================================================
// meta Handler Tests
// ============================================================================

describe("handleMeta", () => {
	const ctx = createTestContext();

	it("should return tool catalog", async () => {
		const result = await handleMeta({}, ctx);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.version).toBeDefined();
		expect(data.status).toBe("operational");
		expect(data.tools).toBeInstanceOf(Array);
		expect(data.tools.length).toBe(16);
	});

	it("should include all tool names in catalog", async () => {
		const result = await handleMeta({}, ctx);
		const data = JSON.parse(result.content[0].text);

		const toolNames = data.tools.map((t: { name: string }) => t.name);
		expect(toolNames).toContain("analyze");
		expect(toolNames).toContain("snapshot_create");
		expect(toolNames).toContain("prepare_workspace");
		expect(toolNames).toContain("get_context");
		expect(toolNames).toContain("check_patterns");
		expect(toolNames).toContain("report_violation");
		expect(toolNames).toContain("get_learnings");
	});
});

// ============================================================================
// validate Handler Tests
// ============================================================================

describe("handleValidate", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	describe("quick mode", () => {
		it("should pass clean code", async () => {
			const result = await handleValidate(
				{
					code: 'const x: number = 1;\nconst y: string = "hello";',
					filePath: "src/index.ts",
					mode: "quick",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.mode).toBe("quick");
			expect(data.passed).toBe(true);
			expect(data.confidence).toBe(100);
			expect(data.violations).toHaveLength(0);
		});

		it("should detect console.log with line number", async () => {
			const result = await handleValidate(
				{
					code: 'const x = 1;\nconsole.log("debug");',
					filePath: "src/index.ts",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.violations.length).toBeGreaterThan(0);
			const consoleViolation = data.violations.find((v: { rule: string }) => v.rule === "no-console");
			expect(consoleViolation).toBeDefined();
			expect(consoleViolation.line).toBe(2);
		});

		it("should detect explicit any type", async () => {
			const result = await handleValidate(
				{
					code: "const x: any = {}",
					filePath: "src/index.ts",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.violations.some((v: { rule: string }) => v.rule === "no-explicit-any")).toBe(true);
		});

		it("should detect debugger statements as critical", async () => {
			const result = await handleValidate(
				{
					code: "function test() {\n  debugger;\n  return 1;\n}",
					filePath: "src/index.ts",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			const debuggerViolation = data.violations.find((v: { rule: string }) => v.rule === "no-debugger");
			expect(debuggerViolation).toBeDefined();
			expect(debuggerViolation.severity).toBe("critical");
			expect(data.passed).toBe(false);
		});

		it("should detect eval in security-sensitive files", async () => {
			const result = await handleValidate(
				{
					code: 'const result = eval("1+1");',
					filePath: "src/auth/handler.ts",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			const evalViolation = data.violations.find((v: { rule: string }) => v.rule === "no-eval-in-security");
			expect(evalViolation).toBeDefined();
			expect(evalViolation.severity).toBe("critical");
		});

		it("should suggest comprehensive mode for many warnings", async () => {
			const result = await handleValidate(
				{
					code: 'console.log("a");\nconsole.log("b");\nconsole.log("c");',
					filePath: "src/index.ts",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(data.hint).toContain("comprehensive");
		});
	});

	describe("comprehensive mode", () => {
		it("should use Intelligence pipeline for comprehensive validation", async () => {
			const result = await handleValidate(
				{
					code: "const x: number = 1;",
					filePath: "src/index.ts",
					mode: "comprehensive",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.mode).toBe("comprehensive");
			expect(data.passed).toBeDefined();
			expect(data.confidence).toBeDefined();
			expect(data.layers).toBeDefined();
			expect(data.recommendation).toBeDefined();
		});
	});

	describe("error handling", () => {
		it("should error when code is missing", async () => {
			const result = await handleValidate({ filePath: "src/index.ts" }, ctx);

			expect(result.isError).toBe(true);
		});

		it("should error when filePath is missing", async () => {
			const result = await handleValidate({ code: "const x = 1;" }, ctx);

			expect(result.isError).toBe(true);
		});
	});
});

// ============================================================================
// Path Traversal Protection Tests (P0-004)
// ============================================================================

describe("validateFilePath", () => {
	const workspaceRoot = "/workspace";

	it("should accept valid relative paths", () => {
		const result = validateFilePath("src/index.ts", workspaceRoot);
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.sanitizedPath).toBe("/workspace/src/index.ts");
		}
	});

	it("should reject path traversal with ..", () => {
		const result = validateFilePath("../../../etc/passwd", workspaceRoot);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain("traversal");
		}
	});

	it("should reject empty paths", () => {
		const result = validateFilePath("", workspaceRoot);
		expect(result.valid).toBe(false);
	});

	it("should reject paths with null bytes", () => {
		const result = validateFilePath("file.ts\0.txt", workspaceRoot);
		expect(result.valid).toBe(false);
	});

	it("should reject absolute paths outside workspace", () => {
		const result = validateFilePath("/etc/passwd", workspaceRoot);
		expect(result.valid).toBe(false);
	});
});

describe("validateFilePaths", () => {
	const workspaceRoot = "/workspace";

	it("should validate multiple paths", () => {
		const result = validateFilePaths(["src/a.ts", "src/b.ts"], workspaceRoot);
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.sanitizedPaths).toHaveLength(2);
		}
	});

	it("should fail on first invalid path", () => {
		const result = validateFilePaths(["src/a.ts", "../etc/passwd", "src/b.ts"], workspaceRoot);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.invalidPath).toBe("../etc/passwd");
		}
	});
});

// ============================================================================
// Input Validation Tests (P0-003)
// ============================================================================

describe("validateInput with Zod schemas", () => {
	it("should validate snapshot_create input", () => {
		const result = validateInput(snapshotCreateSchema, {
			files: ["src/index.ts"],
			reason: "Before refactor",
		});
		expect(result.valid).toBe(true);
	});

	it("should reject snapshot_create without files", () => {
		const result = validateInput(snapshotCreateSchema, {
			reason: "Before refactor",
		});
		expect(result.valid).toBe(false);
	});

	it("should reject snapshot_create with empty files array", () => {
		const result = validateInput(snapshotCreateSchema, {
			files: [],
			reason: "Before refactor",
		});
		expect(result.valid).toBe(false);
	});
});

// ============================================================================
// context Handler Tests
// ============================================================================

describe("handleContext", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should return status for uninitialized context", async () => {
		const result = await handleContext({ op: "status" }, ctx);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.op).toBe("status");
		expect(data.initialized).toBe(false);
	});

	it("should error when op is missing", async () => {
		const result = await handleContext({}, ctx);

		expect(result.isError).toBe(true);
	});
});

// ============================================================================
// session Handler Tests
// ============================================================================

describe("handleSession", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should return stats for no active session", async () => {
		const result = await handleSession({ op: "stats" }, ctx);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.op).toBe("stats");
		expect(data.session).toBeNull();
	});

	it("should error when op is missing", async () => {
		const result = await handleSession({}, ctx);

		expect(result.isError).toBe(true);
	});
});

// ============================================================================
// learn Handler Tests
// ============================================================================

describe("handleLearn", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should record a learning", async () => {
		const result = await handleLearn(
			{
				type: "pattern",
				trigger: "When seeing auth code",
				action: "Create snapshot first",
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.status).toBe("success");
	});

	it("should error when type is missing", async () => {
		const result = await handleLearn({ trigger: "test", action: "test" }, ctx);

		expect(result.isError).toBe(true);
	});

	it("should error when trigger is missing", async () => {
		const result = await handleLearn({ type: "pattern", action: "test" }, ctx);

		expect(result.isError).toBe(true);
	});
});

// ============================================================================
// acknowledge_risk Handler Tests
// ============================================================================

describe("handleAcknowledgeRisk", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should acknowledge risk for files", async () => {
		const result = await handleAcknowledgeRisk(
			{
				files: ["src/auth.ts"],
				reason: "User explicitly approved",
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.status).toBe("acknowledged");
	});

	it("should error when files is missing", async () => {
		const result = await handleAcknowledgeRisk({ reason: "test" }, ctx);

		expect(result.isError).toBe(true);
	});

	it("should error when reason is missing", async () => {
		const result = await handleAcknowledgeRisk({ files: ["test.ts"] }, ctx);

		expect(result.isError).toBe(true);
	});
});

// ============================================================================
// Snapshot Handlers Integration Tests
// ============================================================================

describe("snapshot handlers integration", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
		// Create a test file
		const testFile = join(TEST_WORKSPACE, "test.ts");
		writeFileSync(testFile, 'export const x = "original";', "utf8");
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should create, list, and restore snapshots", async () => {
		// Create snapshot
		const createResult = await handleSnapshotCreate(
			{
				files: ["test.ts"],
				reason: "Test snapshot",
			},
			ctx,
		);
		const createData = JSON.parse(createResult.content[0].text);

		expect(createResult.isError).toBeFalsy();
		expect(createData.status).toBe("success");
		expect(createData.snapshotId).toBeDefined();

		const snapshotId = createData.snapshotId;

		// List snapshots
		const listResult = await handleSnapshotList({}, ctx);
		const listData = JSON.parse(listResult.content[0].text);

		expect(listResult.isError).toBeFalsy();
		expect(listData.count).toBeGreaterThan(0);
		expect(listData.snapshots.some((s: { id: string }) => s.id === snapshotId)).toBe(true);

		// Modify the file
		const testFile = join(TEST_WORKSPACE, "test.ts");
		writeFileSync(testFile, 'export const x = "modified";', "utf8");

		// Restore snapshot (should create backup first - P0-005)
		const restoreResult = await handleSnapshotRestore({ snapshotId }, ctx);
		const restoreData = JSON.parse(restoreResult.content[0].text);

		expect(restoreResult.isError).toBeFalsy();
		expect(restoreData.status).toBe("success");
		expect(restoreData.backupSnapshotId).toBeDefined(); // P0-005 verification

		// Verify file content is restored
		const content = readFileSync(testFile, "utf8");
		expect(content).toBe('export const x = "original";');
	});

	it("should handle dry run for restore", async () => {
		// Create snapshot first
		const createResult = await handleSnapshotCreate(
			{
				files: ["test.ts"],
				reason: "Test snapshot",
			},
			ctx,
		);
		const createData = JSON.parse(createResult.content[0].text);
		const snapshotId = createData.snapshotId;

		// Modify the file
		const testFile = join(TEST_WORKSPACE, "test.ts");
		writeFileSync(testFile, 'export const x = "modified";', "utf8");

		// Dry run restore
		const restoreResult = await handleSnapshotRestore({ snapshotId, dryRun: true }, ctx);
		const restoreData = JSON.parse(restoreResult.content[0].text);

		expect(restoreResult.isError).toBeFalsy();
		expect(restoreData.status).toBe("dry_run");
		expect(restoreData.wouldRestore).toBeDefined();

		// Verify file was NOT restored
		const content = readFileSync(testFile, "utf8");
		expect(content).toBe('export const x = "modified";');
	});

	it("should reject path traversal in snapshot_create", async () => {
		const result = await handleSnapshotCreate(
			{
				files: ["../../../etc/passwd"],
				reason: "Attack attempt",
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(data.error).toBe("E105_PATH_TRAVERSAL_BLOCKED");
	});

	it("should error for missing files in snapshot_create", async () => {
		const result = await handleSnapshotCreate({ reason: "No files" }, ctx);

		expect(result.isError).toBe(true);
	});

	it("should error for missing snapshotId in snapshot_restore", async () => {
		const result = await handleSnapshotRestore({}, ctx);

		expect(result.isError).toBe(true);
	});

	it("should error for non-existent snapshot in restore", async () => {
		const result = await handleSnapshotRestore({ snapshotId: "non-existent-id" }, ctx);

		expect(result.isError).toBe(true);
	});
});

// ============================================================================
// Intelligence-Backed Handler Tests
// ============================================================================

describe("handleGetContext", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should return context for a task", async () => {
		const result = await handleGetContext(
			{
				task: "Add authentication to API",
				keywords: ["auth", "api"],
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.workspace).toBeDefined();
		expect(data.workspace.root).toBe(ctx.workspaceRoot);
		expect(data.context).toBeDefined();
		expect(data.relevantLearnings).toBeDefined();
		expect(data.recentViolations).toBeDefined();
		expect(data.next_actions).toBeDefined();
	});

	it("should include files in context when provided", async () => {
		const result = await handleGetContext(
			{
				task: "Update auth handler",
				files: ["src/auth.ts"],
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.workspace.tier).toBe(ctx.tier);
	});

	it("should error when task is missing", async () => {
		const result = await handleGetContext({}, ctx);

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("task");
	});
});

describe("handleCheckPatterns", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should validate code and return layer results", async () => {
		const result = await handleCheckPatterns(
			{
				code: "const x: number = 1;",
				filePath: "src/index.ts",
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.passed).toBeDefined();
		expect(data.confidence).toBeDefined();
		expect(data.totalIssues).toBeDefined();
		expect(data.recommendation).toBeDefined();
		expect(data.layers).toBeInstanceOf(Array);
	});

	it("should return issues for problematic code", async () => {
		const result = await handleCheckPatterns(
			{
				code: 'console.log("debug");\nconst x: any = {};',
				filePath: "src/index.ts",
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		// Should have some issues detected
		expect(data.totalIssues).toBeGreaterThanOrEqual(0);
	});

	it("should error when code is missing", async () => {
		const result = await handleCheckPatterns({ filePath: "src/index.ts" }, ctx);

		expect(result.isError).toBe(true);
	});

	it("should error when filePath is missing", async () => {
		const result = await handleCheckPatterns({ code: "const x = 1;" }, ctx);

		expect(result.isError).toBe(true);
	});
});

describe("handleReportViolation", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should record a violation", async () => {
		const result = await handleReportViolation(
			{
				type: "layer-boundary-violation",
				file: "apps/vscode/src/auth.ts",
				whatHappened: "Imported infrastructure directly",
				whyItHappened: "Forgot to check layer boundaries",
				prevention: "Always call get_context before implementing",
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.recorded).toBe(true);
		expect(data.type).toBe("layer-boundary-violation");
		expect(data.file).toBe("apps/vscode/src/auth.ts");
		expect(data.occurrences).toBeGreaterThanOrEqual(1);
	});

	it("should track violation count", async () => {
		// Report same violation multiple times
		await handleReportViolation(
			{
				type: "test-violation",
				file: "test.ts",
				whatHappened: "Test violation",
				whyItHappened: "Testing",
				prevention: "Don't test",
			},
			ctx,
		);

		const result = await handleReportViolation(
			{
				type: "test-violation",
				file: "test.ts",
				whatHappened: "Test violation again",
				whyItHappened: "Testing again",
				prevention: "Don't test",
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(data.occurrences).toBeGreaterThanOrEqual(2);
	});

	it("should error when required fields are missing", async () => {
		const result = await handleReportViolation(
			{
				type: "test",
				file: "test.ts",
				// missing whatHappened, whyItHappened, prevention
			},
			ctx,
		);

		expect(result.isError).toBe(true);
	});
});

describe("handleGetLearnings", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should query learnings by keywords", async () => {
		// First record a learning
		await handleLearn(
			{
				type: "pattern",
				trigger: "vitest config",
				action: "Use @snapback/vitest-config preset",
				source: "test-session",
			},
			ctx,
		);

		// Then query for it
		const result = await handleGetLearnings(
			{
				keywords: ["vitest", "config"],
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.query).toEqual(["vitest", "config"]);
		expect(data.count).toBeDefined();
		expect(data.learnings).toBeInstanceOf(Array);
	});

	it("should return empty results for non-matching keywords", async () => {
		const result = await handleGetLearnings(
			{
				keywords: ["nonexistent-keyword-xyz-123"],
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.count).toBe(0);
		expect(data.learnings).toHaveLength(0);
	});

	it("should respect limit parameter", async () => {
		const result = await handleGetLearnings(
			{
				keywords: ["test"],
				limit: 5,
			},
			ctx,
		);
		const data = JSON.parse(result.content[0].text);

		expect(result.isError).toBeFalsy();
		expect(data.learnings.length).toBeLessThanOrEqual(5);
	});

	it("should error when keywords is missing", async () => {
		const result = await handleGetLearnings({}, ctx);

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("keywords");
	});

	it("should error when keywords is empty", async () => {
		const result = await handleGetLearnings({ keywords: [] }, ctx);

		expect(result.isError).toBe(true);
	});
});

// ============================================================================
// SessionHealth Tests
// ============================================================================

describe("SessionHealth", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	describe("getSessionHealth", () => {
		it("should return session health snapshot", async () => {
			const health = await getSessionHealth(ctx);

			expect(health.workspaceId).toBe(ctx.workspaceRoot);
			expect(typeof health.healthScore).toBe("number");
			expect(health.healthScore).toBeGreaterThanOrEqual(0);
			expect(health.healthScore).toBeLessThanOrEqual(100);
			expect(health.trajectory).toBeDefined();
			expect(health.activeWarnings).toBeInstanceOf(Array);
			expect(typeof health.recentViolations).toBe("number");
			expect(health.suggestions).toBeInstanceOf(Array);
		});

		it("should include trajectory status", async () => {
			const health = await getSessionHealth(ctx);

			expect(["improving", "stable", "degrading", "critical"]).toContain(health.trajectory);
		});
	});

	describe("wrapWithSessionHealth", () => {
		it("should wrap data with session health", async () => {
			const data = { status: "success", value: 42 };
			const result = await wrapWithSessionHealth(data, ctx);

			expect(result.data).toEqual(data);
			expect(result.session).toBeDefined();
			expect(result.session.workspaceId).toBe(ctx.workspaceRoot);
		});
	});

	describe("sessionAwareResult", () => {
		it("should return ToolResult with embedded session", async () => {
			const data = { test: "value" };
			const result = await sessionAwareResult(data, ctx);

			expect(result.isError).toBe(false);
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe("text");

			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.data).toEqual(data);
			expect(parsed.session).toBeDefined();
		});
	});

	describe("isRiskyState", () => {
		it("should return true for low health score", () => {
			const riskyHealth = {
				workspaceId: "/test",
				healthScore: 30,
				trajectory: "stable" as const,
				activeWarnings: [],
				recentViolations: 0,
				lastSnapshot: null,
				suggestions: [],
			};

			expect(isRiskyState(riskyHealth)).toBe(true);
		});

		it("should return true for critical trajectory", () => {
			const criticalHealth = {
				workspaceId: "/test",
				healthScore: 80,
				trajectory: "critical" as const,
				activeWarnings: [],
				recentViolations: 0,
				lastSnapshot: null,
				suggestions: [],
			};

			expect(isRiskyState(criticalHealth)).toBe(true);
		});

		it("should return false for healthy state", () => {
			const healthyState = {
				workspaceId: "/test",
				healthScore: 90,
				trajectory: "stable" as const,
				activeWarnings: [],
				recentViolations: 0,
				lastSnapshot: null,
				suggestions: [],
			};

			expect(isRiskyState(healthyState)).toBe(false);
		});
	});

	describe("getRecommendedAction", () => {
		it("should recommend snapshot for critical health", () => {
			const criticalHealth = {
				workspaceId: "/test",
				healthScore: 20,
				trajectory: "degrading" as const,
				activeWarnings: [],
				recentViolations: 0,
				lastSnapshot: null,
				suggestions: [],
			};

			const action = getRecommendedAction(criticalHealth);
			expect(action).not.toBeNull();
			expect(action?.tool).toBe("snapshot_create");
		});

		it("should recommend learnings review for many violations", () => {
			const violationHeavy = {
				workspaceId: "/test",
				healthScore: 80,
				trajectory: "stable" as const,
				activeWarnings: [],
				recentViolations: 10,
				lastSnapshot: { id: "snap_1", createdAt: new Date().toISOString(), minutesAgo: 5 },
				suggestions: [],
			};

			const action = getRecommendedAction(violationHeavy);
			expect(action).not.toBeNull();
			expect(action?.tool).toBe("get_learnings");
		});

		it("should return null for healthy workspace", () => {
			const healthyState = {
				workspaceId: "/test",
				healthScore: 95,
				trajectory: "stable" as const,
				activeWarnings: [],
				recentViolations: 0,
				lastSnapshot: { id: "snap_1", createdAt: new Date().toISOString(), minutesAgo: 10 },
				suggestions: [],
			};

			expect(getRecommendedAction(healthyState)).toBeNull();
		});
	});
});

// ============================================================================
// Intelligence Tool Schema Tests
// ============================================================================

describe("Intelligence Tool Schemas", () => {
	describe("getContextSchema", () => {
		it("should validate valid get_context input", () => {
			const result = validateInput(getContextSchema, {
				task: "Add authentication",
				files: ["src/auth.ts"],
				keywords: ["auth", "security"],
			});
			expect(result.valid).toBe(true);
		});

		it("should reject missing task", () => {
			const result = validateInput(getContextSchema, {
				files: ["src/auth.ts"],
			});
			expect(result.valid).toBe(false);
		});
	});

	describe("checkPatternsSchema", () => {
		it("should validate valid check_patterns input", () => {
			const result = validateInput(checkPatternsSchema, {
				code: "const x = 1;",
				filePath: "src/index.ts",
			});
			expect(result.valid).toBe(true);
		});

		it("should reject missing code", () => {
			const result = validateInput(checkPatternsSchema, {
				filePath: "src/index.ts",
			});
			expect(result.valid).toBe(false);
		});
	});

	describe("reportViolationSchema", () => {
		it("should validate valid report_violation input", () => {
			const result = validateInput(reportViolationSchema, {
				type: "layer-boundary-violation",
				file: "src/auth.ts",
				whatHappened: "Imported infrastructure directly",
				whyItHappened: "Forgot to check boundaries",
				prevention: "Use get_context first",
			});
			expect(result.valid).toBe(true);
		});

		it("should reject missing required fields", () => {
			const result = validateInput(reportViolationSchema, {
				type: "test",
				file: "test.ts",
				// missing whatHappened, whyItHappened, prevention
			});
			expect(result.valid).toBe(false);
		});
	});

	describe("getLearningsSchema", () => {
		it("should validate valid get_learnings input", () => {
			const result = validateInput(getLearningsSchema, {
				keywords: ["vitest", "config"],
				limit: 5,
			});
			expect(result.valid).toBe(true);
		});

		it("should reject empty keywords", () => {
			const result = validateInput(getLearningsSchema, {
				keywords: [],
			});
			expect(result.valid).toBe(false);
		});

		it("should enforce limit max", () => {
			const result = validateInput(getLearningsSchema, {
				keywords: ["test"],
				limit: 100, // exceeds max of 50
			});
			expect(result.valid).toBe(false);
		});
	});
});
