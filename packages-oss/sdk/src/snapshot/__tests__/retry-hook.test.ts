/**
 * Unit tests for snapshot retry hook diagnosis types
 */

import { describe, expect, it } from "vitest";
import { diagnoseSnapshotFailure, formatDiagnosis } from "../retry-hook";

describe("diagnoseSnapshotFailure", () => {
	const workspaceRoot = "/test/workspace";
	const testFiles = ["src/file1.ts", "src/file2.ts"];

	describe("FILE_NOT_FOUND diagnosis", () => {
		it("should detect ENOENT error with 95% confidence", () => {
			const error = new Error("ENOENT: no such file or directory");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("FILE_NOT_FOUND");
			expect(diagnosis.confidence).toBe(0.95);
			expect(diagnosis.canAutoFix).toBe(false);
			expect(diagnosis.message).toContain("do not exist");
		});

		it("should detect 'file not found' error", () => {
			const error = new Error("File not found: src/missing.ts");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("FILE_NOT_FOUND");
			expect(diagnosis.confidence).toBe(0.95);
		});

		it("should detect 'no such file' error", () => {
			const error = new Error("no such file: src/missing.ts");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("FILE_NOT_FOUND");
		});
	});

	describe("ABSOLUTE_PATH_REJECTED diagnosis", () => {
		it("should detect absolute path error with 100% confidence", () => {
			const error = new Error("Absolute paths not allowed");
			const files = ["/absolute/path/file.ts"];
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.type).toBe("ABSOLUTE_PATH_REJECTED");
			expect(diagnosis.confidence).toBe(1.0);
			expect(diagnosis.canAutoFix).toBe(true);
			expect(diagnosis.userAction).toContain("Automatic");
			expect(diagnosis.affectedFiles).toEqual(files);
		});

		it("should identify affected absolute paths", () => {
			const error = new Error("absolute paths detected");
			const files = ["/abs1/file.ts", "relative/file.ts", "/abs2/file.ts"];
			const diagnosis = diagnoseSnapshotFailure(error, files, workspaceRoot);

			expect(diagnosis.affectedFiles).toEqual(["/abs1/file.ts", "/abs2/file.ts"]);
		});
	});

	describe("PERMISSION_DENIED diagnosis", () => {
		it("should detect EACCES error with 90% confidence", () => {
			const error = new Error("EACCES: permission denied, open 'file.ts'");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("PERMISSION_DENIED");
			expect(diagnosis.confidence).toBe(0.9);
			expect(diagnosis.canAutoFix).toBe(false);
			expect(diagnosis.userAction).toContain("chmod");
		});

		it("should detect 'permission denied' error", () => {
			const error = new Error("permission denied when reading file");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("PERMISSION_DENIED");
		});
	});

	describe("WORKSPACE_MISMATCH diagnosis", () => {
		it("should detect workspace mismatch with 85% confidence", () => {
			const error = new Error("Files are outside workspace");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("WORKSPACE_MISMATCH");
			expect(diagnosis.confidence).toBe(0.85);
			expect(diagnosis.canAutoFix).toBe(true);
			expect(diagnosis.userAction).toContain("Automatic");
		});

		it("should detect 'outside workspace' error", () => {
			const error = new Error("File outside workspace boundary");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("WORKSPACE_MISMATCH");
		});
	});

	describe("WORKING_DIRECTORY_MISMATCH diagnosis", () => {
		it("should detect working directory mismatch", () => {
			const error = new Error("Wrong working directory");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("WORKING_DIRECTORY_MISMATCH");
			expect(diagnosis.canAutoFix).toBe(true);
		});

		it("should detect cwd error", () => {
			const error = new Error("Current working directory (cwd) mismatch");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("WORKING_DIRECTORY_MISMATCH");
		});
	});

	describe("STORAGE_FULL diagnosis", () => {
		it("should detect ENOSPC error", () => {
			const error = new Error("ENOSPC: no space left on device");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("STORAGE_FULL");
			expect(diagnosis.canAutoFix).toBe(false);
			expect(diagnosis.userAction).toContain("free up space");
		});

		it("should detect 'disk full' error", () => {
			const error = new Error("disk full, cannot write");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("STORAGE_FULL");
		});
	});

	describe("UNKNOWN diagnosis", () => {
		it("should default to UNKNOWN for unrecognized errors", () => {
			const error = new Error("Some random error");
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("UNKNOWN");
			expect(diagnosis.canAutoFix).toBe(false);
			expect(diagnosis.confidence).toBeLessThanOrEqual(0.5);
		});

		it("should handle non-Error objects", () => {
			const error = "string error";
			const diagnosis = diagnoseSnapshotFailure(error, testFiles, workspaceRoot);

			expect(diagnosis.type).toBe("UNKNOWN");
			expect(diagnosis.message).toContain("Unexpected");
		});
	});
});

describe("formatDiagnosis", () => {
	it("should format diagnosis with all fields", () => {
		const diagnosis = {
			type: "FILE_NOT_FOUND" as const,
			message: "Files are missing",
			cause: "The specified paths don't exist",
			suggestedFix: "Create the files",
			userAction: "Run: touch file.ts",
			canAutoFix: false,
			confidence: 0.95,
			affectedFiles: ["src/file1.ts", "src/file2.ts"],
		};

		const formatted = formatDiagnosis(diagnosis);

		expect(formatted).toContain("FILE_NOT_FOUND");
		expect(formatted).toContain("Files are missing");
		expect(formatted).toContain("src/file1.ts");
		expect(formatted).toContain("src/file2.ts");
		expect(formatted).toContain("95%");
	});

	it("should handle diagnosis without affected files", () => {
		const diagnosis = {
			type: "PERMISSION_DENIED" as const,
			message: "Access denied",
			cause: "No read permission",
			suggestedFix: "Change permissions",
			userAction: "chmod +r file",
			canAutoFix: false,
			confidence: 0.9,
		};

		const formatted = formatDiagnosis(diagnosis);

		expect(formatted).toContain("PERMISSION_DENIED");
		expect(formatted).toContain("Access denied");
		expect(formatted).not.toContain("Affected files");
	});

	it("should indicate auto-fixable diagnoses", () => {
		const diagnosis = {
			type: "ABSOLUTE_PATH_REJECTED" as const,
			message: "Paths must be relative",
			cause: "Absolute paths provided",
			suggestedFix: "Convert to relative",
			userAction: "Automatic",
			canAutoFix: true,
			confidence: 1.0,
		};

		const formatted = formatDiagnosis(diagnosis);

		expect(formatted).toContain("Automatic");
		expect(formatted).toContain("100%");
	});
});
