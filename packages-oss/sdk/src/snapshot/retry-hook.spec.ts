/**
 * Unit Tests for Snapshot Retry Hook with Auto-Fix
 *
 * Verifies diagnosis types, auto-fix logic, and error recovery patterns.
 */

import { describe, expect, it } from "vitest";
import { type DiagnosisType, diagnoseSnapshotFailure, formatDiagnosis, type SnapshotDiagnosis } from "./retry-hook";

describe("Snapshot Retry Hook - Diagnosis Types", () => {
	const workspaceRoot = "/workspace";
	const files = ["src/file.ts", "src/components/Button.tsx"];

	describe("DiagnosisType Detection", () => {
		it("should diagnose FILE_NOT_FOUND errors", () => {
			const error = new Error("ENOENT: no such file or directory");
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("FILE_NOT_FOUND");
			expect(diagnosis.confidence).toBeGreaterThan(0.8);
			expect(diagnosis.canAutoFix).toBe(false);
			expect(diagnosis.affectedFiles).toEqual(files);
		});

		it("should diagnose ABSOLUTE_PATH_REJECTED errors", () => {
			const error = new Error("absolute paths not allowed: /Users/user/file.ts");
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("ABSOLUTE_PATH_REJECTED");
			expect(diagnosis.confidence).toBeGreaterThan(0.9);
			expect(diagnosis.canAutoFix).toBe(true);
			expect(diagnosis.suggestedFix).toContain("relative");
		});

		it("should diagnose PERMISSION_DENIED errors", () => {
			const error = new Error("EACCES: permission denied");
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("PERMISSION_DENIED");
			expect(diagnosis.confidence).toBeGreaterThan(0.85);
			expect(diagnosis.canAutoFix).toBe(false);
		});

		it("should diagnose WORKSPACE_MISMATCH errors", () => {
			const error = new Error("file outside workspace: /external/file.ts");
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("WORKSPACE_MISMATCH");
			expect(diagnosis.confidence).toBeGreaterThan(0.85);
			expect(diagnosis.canAutoFix).toBe(true);
		});

		it("should diagnose WORKING_DIRECTORY_MISMATCH errors", () => {
			const error = new Error("working directory mismatch: expected /workspace, got /other");
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("WORKING_DIRECTORY_MISMATCH");
			expect(diagnosis.confidence).toBeGreaterThan(0.8);
			expect(diagnosis.canAutoFix).toBe(false);
		});

		it("should diagnose STORAGE_FULL errors", () => {
			const error = new Error("ENOSPC: no space left on device");
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("STORAGE_FULL");
			expect(diagnosis.confidence).toBeGreaterThan(0.95);
			expect(diagnosis.canAutoFix).toBe(false);
		});

		it("should return UNKNOWN for unrecognized errors", () => {
			const error = new Error("Something unexpected happened");
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("UNKNOWN");
			expect(diagnosis.confidence).toBeLessThan(0.5);
			expect(diagnosis.canAutoFix).toBe(false);
		});
	});

	describe("Diagnosis Formatting", () => {
		it("should format diagnosis with all fields", () => {
			const diagnosis: SnapshotDiagnosis = {
				type: "ABSOLUTE_PATH_REJECTED",
				message: "Absolute path rejected",
				cause: "File path started with /",
				suggestedFix: "Convert to relative path",
				userAction: "Use workspace-relative paths",
				canAutoFix: true,
				confidence: 0.95,
				affectedFiles: files,
			};

			const formatted = formatDiagnosis(diagnosis);

			expect(formatted).toContain("ABSOLUTE_PATH_REJECTED");
			expect(formatted).toContain("Absolute path rejected");
			expect(formatted).toContain("Convert to relative path");
			expect(formatted).toContain("95%");
			expect(formatted).toContain(files[0]);
			expect(formatted).toContain(files[1]);
		});

		it("should format diagnosis without affected files", () => {
			const diagnosis: SnapshotDiagnosis = {
				type: "STORAGE_FULL",
				message: "No space left",
				cause: "Disk full",
				suggestedFix: "Free up disk space",
				userAction: "Delete unused files",
				canAutoFix: false,
				confidence: 0.95,
			};

			const formatted = formatDiagnosis(diagnosis);

			expect(formatted).toContain("STORAGE_FULL");
			expect(formatted).toContain("No space left");
			expect(formatted).not.toContain("Affected files");
		});
	});

	describe("Error Pattern Matching", () => {
		it("should match ENOENT error patterns", () => {
			const patterns = ["ENOENT: no such file or directory", "Error: ENOENT", "file not found"];

			for (const pattern of patterns) {
				const diagnosis = diagnoseSnapshotFailure(new Error(pattern), files, workspaceRoot);
				expect(diagnosis.type).toBe("FILE_NOT_FOUND");
			}
		});

		it("should match absolute path error patterns", () => {
			const patterns = [
				"absolute paths not allowed",
				"absolute path rejected: /Users/file.ts",
				"path must be relative",
			];

			for (const pattern of patterns) {
				const diagnosis = diagnoseSnapshotFailure(new Error(pattern), files, workspaceRoot);
				expect(diagnosis.type).toBe("ABSOLUTE_PATH_REJECTED");
			}
		});

		it("should match permission denied error patterns", () => {
			const patterns = ["EACCES: permission denied", "Error: EACCES", "access denied"];

			for (const pattern of patterns) {
				const diagnosis = diagnoseSnapshotFailure(new Error(pattern), files, workspaceRoot);
				expect(diagnosis.type).toBe("PERMISSION_DENIED");
			}
		});
	});

	describe("Confidence Scoring", () => {
		it("should assign high confidence to clear error patterns", () => {
			const clearErrors: Array<[string, DiagnosisType]> = [
				["ENOSPC: no space left on device", "STORAGE_FULL"],
				["absolute paths not allowed: /file.ts", "ABSOLUTE_PATH_REJECTED"],
			];

			for (const [errorMsg, expectedType] of clearErrors) {
				const diagnosis = diagnoseSnapshotFailure(new Error(errorMsg), files, workspaceRoot);
				expect(diagnosis.type).toBe(expectedType);
				expect(diagnosis.confidence).toBeGreaterThan(0.9);
			}
		});

		it("should assign lower confidence to ambiguous errors", () => {
			const diagnosis = diagnoseSnapshotFailure(new Error("Something went wrong"), files, workspaceRoot);

			expect(diagnosis.type).toBe("UNKNOWN");
			expect(diagnosis.confidence).toBeLessThan(0.5);
		});
	});

	describe("Auto-Fix Capability", () => {
		it("should mark fixable errors as canAutoFix=true", () => {
			const fixableErrors = ["absolute paths not allowed", "file outside workspace"];

			for (const errorMsg of fixableErrors) {
				const diagnosis = diagnoseSnapshotFailure(new Error(errorMsg), files, workspaceRoot);
				expect(diagnosis.canAutoFix).toBe(true);
			}
		});

		it("should mark non-fixable errors as canAutoFix=false", () => {
			const nonFixableErrors = ["ENOENT: no such file", "EACCES: permission denied", "ENOSPC: no space left"];

			for (const errorMsg of nonFixableErrors) {
				const diagnosis = diagnoseSnapshotFailure(new Error(errorMsg), files, workspaceRoot);
				expect(diagnosis.canAutoFix).toBe(false);
			}
		});
	});
});
