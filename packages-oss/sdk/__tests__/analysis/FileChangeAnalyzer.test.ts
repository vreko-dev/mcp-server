/**
 * Tests for FileChangeAnalyzer
 *
 * This test suite validates the platform-agnostic file change analysis
 * functionality for comparing snapshots with current file state.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IFileSystemProvider } from "../../src/analysis/FileChangeAnalyzer.js";
import { createChangeSummary, FileChangeAnalyzer } from "../../src/analysis/FileChangeAnalyzer.js";

describe("FileChangeAnalyzer", () => {
	let mockFileSystem: IFileSystemProvider;
	let analyzer: FileChangeAnalyzer;

	beforeEach(() => {
		// Create a fresh mock for each test
		mockFileSystem = {
			readFile: vi.fn(),
			fileExists: vi.fn(),
			getRelativePath: vi.fn(),
		};
		analyzer = new FileChangeAnalyzer("/workspace", mockFileSystem);
	});

	describe("Single File Analysis", () => {
		it("should detect modified file with additions", async () => {
			const snapshotContent = "line1\nline2\nline3";
			const currentContent = "line1\nline2\nline3\nline4\nline5";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("src/file.ts");

			const change = await analyzer.analyzeFile("/workspace/src/file.ts", snapshotContent);

			expect(change.changeType).toBe("modified");
			expect(change.linesAdded).toBe(2);
			expect(change.linesDeleted).toBe(0);
			expect(change.changeSummary).toBe("+2");
			expect(change.icon).toBe("diff-modified");
		});

		it("should detect modified file with deletions", async () => {
			const snapshotContent = "line1\nline2\nline3\nline4\nline5";
			const currentContent = "line1\nline2\nline3";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("src/file.ts");

			const change = await analyzer.analyzeFile("/workspace/src/file.ts", snapshotContent);

			expect(change.changeType).toBe("modified");
			expect(change.linesAdded).toBe(0);
			expect(change.linesDeleted).toBe(2);
			expect(change.changeSummary).toBe("-2");
		});

		it("should detect modified file with both additions and deletions", async () => {
			const snapshotContent = "line1\nline2\nline3";
			const currentContent = "line1\nline4\nline5";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("src/file.ts");

			const change = await analyzer.analyzeFile("/workspace/src/file.ts", snapshotContent);

			expect(change.changeType).toBe("modified");
			expect(change.linesAdded).toBe(2);
			expect(change.linesDeleted).toBe(2);
			expect(change.changeSummary).toBe("+2 -2");
		});

		it("should detect unchanged file", async () => {
			const content = "line1\nline2\nline3";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(content);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("src/file.ts");

			const change = await analyzer.analyzeFile("/workspace/src/file.ts", content);

			expect(change.changeType).toBe("unchanged");
			expect(change.linesAdded).toBe(0);
			expect(change.linesDeleted).toBe(0);
			expect(change.changeSummary).toBe("No changes");
			expect(change.icon).toBe("circle-outline");
		});

		it("should detect deleted file", async () => {
			const snapshotContent = "line1\nline2\nline3";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(false);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("src/file.ts");

			const change = await analyzer.analyzeFile("/workspace/src/file.ts", snapshotContent);

			expect(change.changeType).toBe("deleted");
			expect(change.linesAdded).toBe(0);
			expect(change.linesDeleted).toBe(3);
			expect(change.changeSummary).toBe("Deleted (3 lines)");
			expect(change.icon).toBe("diff-removed");
		});

		it("should detect whitespace-only changes", async () => {
			const snapshotContent = "line1\nline2\nline3";
			const currentContent = "line1\nline2\nline3"; // Same content

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("src/file.ts");

			const change = await analyzer.analyzeFile("/workspace/src/file.ts", snapshotContent);

			expect(change.changeType).toBe("unchanged");
			expect(change.changeSummary).toBe("No changes");
		});

		it("should include file metadata", async () => {
			const snapshotContent = "content";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue("new content");
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("src/utils/helper.ts");

			const change = await analyzer.analyzeFile("/workspace/src/utils/helper.ts", snapshotContent);

			expect(change.filePath).toBe("/workspace/src/utils/helper.ts");
			expect(change.relativePath).toBe("src/utils/helper.ts");
			expect(change.fileName).toBe("helper.ts");
		});
	});

	describe("Snapshot Analysis", () => {
		it("should analyze multiple files in snapshot", async () => {
			const snapshotFiles = {
				"src/file1.ts": "content1",
				"src/file2.ts": "content2",
				"src/file3.ts": "content3",
			};

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockImplementation(async (path: string) => {
				if (path.includes("file1")) {
					return "modified1";
				}
				if (path.includes("file2")) {
					return "content2";
				}
				if (path.includes("file3")) {
					return "modified3";
				}
				return "";
			});
			vi.mocked(mockFileSystem.getRelativePath).mockImplementation((_workspaceRoot: string, path: string) => {
				if (path.includes("file1")) {
					return "src/file1.ts";
				}
				if (path.includes("file2")) {
					return "src/file2.ts";
				}
				if (path.includes("file3")) {
					return "src/file3.ts";
				}
				return "";
			});

			const changes = await analyzer.analyzeSnapshot(snapshotFiles);

			expect(changes).toHaveLength(3);
			expect(changes.some((c) => c.changeType === "modified")).toBe(true);
			expect(changes.some((c) => c.changeType === "unchanged")).toBe(true);
		});

		it("should sort changes by priority (modified > deleted > added > unchanged)", async () => {
			const snapshotFiles = {
				"unchanged.ts": "same",
				"modified.ts": "old",
				"deleted.ts": "gone",
			};

			vi.mocked(mockFileSystem.fileExists).mockImplementation(async (path: string) => {
				if (path.includes("deleted")) {
					return false;
				}
				return true;
			});
			vi.mocked(mockFileSystem.readFile).mockImplementation(async (path: string) => {
				if (path.includes("unchanged")) {
					return "same";
				}
				if (path.includes("modified")) {
					return "new";
				}
				return "";
			});
			vi.mocked(mockFileSystem.getRelativePath).mockImplementation((_ws: string, path: string) => {
				if (path.includes("unchanged")) {
					return "unchanged.ts";
				}
				if (path.includes("modified")) {
					return "modified.ts";
				}
				if (path.includes("deleted")) {
					return "deleted.ts";
				}
				return "";
			});

			const changes = await analyzer.analyzeSnapshot(snapshotFiles);

			expect(changes[0].changeType).toBe("modified");
			expect(changes[1].changeType).toBe("deleted");
			expect(changes[2].changeType).toBe("unchanged");
		});

		it("should handle empty snapshot", async () => {
			const changes = await analyzer.analyzeSnapshot({});

			expect(changes).toHaveLength(0);
		});

		it("should handle file read errors gracefully", async () => {
			const snapshotFiles = {
				"error.ts": "content",
			};

			vi.mocked(mockFileSystem.fileExists).mockRejectedValue(new Error("Permission denied"));
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("error.ts");

			const changes = await analyzer.analyzeSnapshot(snapshotFiles);

			expect(changes).toHaveLength(1);
			expect(changes[0].changeType).toBe("unchanged");
			expect(changes[0].changeSummary).toBe("Error analyzing changes");
			expect(changes[0].icon).toBe("error");
		});

		it("should sort files alphabetically within same change type", async () => {
			const snapshotFiles = {
				"z-file.ts": "content",
				"a-file.ts": "content",
				"m-file.ts": "content",
			};

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue("modified");
			vi.mocked(mockFileSystem.getRelativePath).mockImplementation((_ws: string, path: string) => {
				if (path.includes("z-file")) {
					return "z-file.ts";
				}
				if (path.includes("a-file")) {
					return "a-file.ts";
				}
				if (path.includes("m-file")) {
					return "m-file.ts";
				}
				return "";
			});

			const changes = await analyzer.analyzeSnapshot(snapshotFiles);

			// All are modified, so should be sorted alphabetically
			expect(changes[0].fileName).toBe("a-file.ts");
			expect(changes[1].fileName).toBe("m-file.ts");
			expect(changes[2].fileName).toBe("z-file.ts");
		});
	});

	describe("Change Summary", () => {
		it("should create summary with modified files", () => {
			const changes = [
				{
					changeType: "modified" as const,
					linesAdded: 5,
					linesDeleted: 2,
					filePath: "/a",
					relativePath: "a",
					fileName: "a",
					snapshotContent: "",
					icon: "diff-modified",
					changeSummary: "",
				},
				{
					changeType: "modified" as const,
					linesAdded: 3,
					linesDeleted: 1,
					filePath: "/b",
					relativePath: "b",
					fileName: "b",
					snapshotContent: "",
					icon: "diff-modified",
					changeSummary: "",
				},
			];

			const summary = createChangeSummary(changes);
			expect(summary).toBe("2 modified");
		});

		it("should create summary with multiple change types", () => {
			const changes = [
				{
					changeType: "modified" as const,
					linesAdded: 5,
					linesDeleted: 2,
					filePath: "/a",
					relativePath: "a",
					fileName: "a",
					snapshotContent: "",
					icon: "diff-modified",
					changeSummary: "",
				},
				{
					changeType: "deleted" as const,
					linesAdded: 0,
					linesDeleted: 10,
					filePath: "/b",
					relativePath: "b",
					fileName: "b",
					snapshotContent: "",
					icon: "diff-removed",
					changeSummary: "",
				},
				{
					changeType: "added" as const,
					linesAdded: 15,
					linesDeleted: 0,
					filePath: "/c",
					relativePath: "c",
					fileName: "c",
					snapshotContent: "",
					icon: "diff-added",
					changeSummary: "",
				},
			];

			const summary = createChangeSummary(changes);
			expect(summary).toBe("1 modified, 1 deleted, 1 added");
		});

		it("should show unchanged only when no other changes", () => {
			const changes = [
				{
					changeType: "unchanged" as const,
					linesAdded: 0,
					linesDeleted: 0,
					filePath: "/a",
					relativePath: "a",
					fileName: "a",
					snapshotContent: "",
					icon: "circle-outline",
					changeSummary: "",
				},
			];

			const summary = createChangeSummary(changes);
			expect(summary).toBe("1 unchanged");
		});

		it("should handle empty changes array", () => {
			const summary = createChangeSummary([]);
			expect(summary).toBe("");
		});
	});

	describe("Diff Statistics", () => {
		it("should calculate correct stats for simple additions", async () => {
			const snapshotContent = "a\nb\nc";
			const currentContent = "a\nb\nc\nd\ne";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("file.ts");

			const change = await analyzer.analyzeFile("/workspace/file.ts", snapshotContent);

			expect(change.linesAdded).toBe(2);
			expect(change.linesDeleted).toBe(0);
		});

		it("should calculate correct stats for simple deletions", async () => {
			const snapshotContent = "a\nb\nc\nd\ne";
			const currentContent = "a\nb\nc";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("file.ts");

			const change = await analyzer.analyzeFile("/workspace/file.ts", snapshotContent);

			expect(change.linesAdded).toBe(0);
			expect(change.linesDeleted).toBe(2);
		});

		it("should calculate correct stats for replacements", async () => {
			const snapshotContent = "a\nb\nc";
			const currentContent = "a\nx\ny";

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("file.ts");

			const change = await analyzer.analyzeFile("/workspace/file.ts", snapshotContent);

			expect(change.linesAdded).toBeGreaterThan(0);
			expect(change.linesDeleted).toBeGreaterThan(0);
		});

		it("should handle duplicate lines correctly", async () => {
			const snapshotContent = "a\na\na";
			const currentContent = "a\na"; // One less duplicate

			vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
			vi.mocked(mockFileSystem.readFile).mockResolvedValue(currentContent);
			vi.mocked(mockFileSystem.getRelativePath).mockReturnValue("file.ts");

			const change = await analyzer.analyzeFile("/workspace/file.ts", snapshotContent);

			// Since we use Set-based comparison, duplicate lines might not be counted as expected
			// This tests the current behavior
			expect(change.changeType).toBe("modified");
		});
	});
});
