/**
 * Test Setup - Loosely coupled testing utilities
 *
 * Design principles:
 * - No tight coupling to implementation details
 * - Reusable mocks and helpers
 * - Clear separation of concerns
 */

import * as path from "path";

// ============================================================================
// FILE SYSTEM MOCKING
// ============================================================================

export interface MockFileSystem {
	files: Map<string, string>;
	reset(): void;
	setFile(filePath: string, content: string): void;
	getFile(filePath: string): string | undefined;
	exists(filePath: string): boolean;
	readFileSync(filePath: string): string;
	writeFileSync(filePath: string, content: string): void;
	appendFileSync(filePath: string, content: string): void;
	existsSync(filePath: string): boolean;
}

export function createMockFileSystem(): MockFileSystem {
	const files = new Map<string, string>();

	return {
		files,
		reset() {
			files.clear();
		},
		setFile(filePath: string, content: string) {
			files.set(path.normalize(filePath), content);
		},
		getFile(filePath: string) {
			return files.get(path.normalize(filePath));
		},
		exists(filePath: string) {
			return files.has(path.normalize(filePath));
		},
		readFileSync(filePath: string) {
			const content = files.get(path.normalize(filePath));
			if (content === undefined) {
				throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
			}
			return content;
		},
		writeFileSync(filePath: string, content: string) {
			files.set(path.normalize(filePath), content);
		},
		appendFileSync(filePath: string, content: string) {
			const existing = files.get(path.normalize(filePath)) || "";
			files.set(path.normalize(filePath), existing + content);
		},
		existsSync(filePath: string) {
			return files.has(path.normalize(filePath));
		},
	};
}

// ============================================================================
// TEST ENVIRONMENT
// ============================================================================

export interface TestEnvironment {
	mockFs: MockFileSystem;
	tempDir: string;
	cleanup(): void;
	setupTestFiles(): void;
}

export function createTestEnvironment(): TestEnvironment {
	const mockFs = createMockFileSystem();
	const tempDir = path.join(process.cwd(), ".test-temp");

	return {
		mockFs,
		tempDir,
		cleanup() {
			mockFs.reset();
		},
		setupTestFiles() {
			// Setup default test file structure
			mockFs.setFile("patterns/violations.jsonl", "");
			mockFs.setFile("patterns/codebase-patterns.md", "# SnapBack Codebase Patterns\n\n---\n\n## Recent Fixes\n");
			mockFs.setFile("feedback/learnings.jsonl", "");
			mockFs.setFile("feedback/interactions.jsonl", "");
			mockFs.setFile("feedback/golden.jsonl", "");
			mockFs.setFile(
				"state/current-task.json",
				JSON.stringify({
					task: "Test task",
					taskType: "BUG_FIX",
					phase: "audit",
				}),
			);
			mockFs.setFile("ROUTER.md", "# Task Router\n");
			mockFs.setFile("ARCHITECTURE.md", "# Architecture\n## Layer Responsibilities\n");
			mockFs.setFile("CONSTRAINTS.md", "# Constraints\n## Hard Rules\n");
		},
	};
}

// ============================================================================
// DETERMINISTIC TIME
// ============================================================================

export class DeterministicTime {
	private currentTime: number;

	constructor(initialTime: string | number = "2025-01-15T10:00:00Z") {
		this.currentTime = typeof initialTime === "string" ? new Date(initialTime).getTime() : initialTime;
	}

	now(): number {
		return this.currentTime;
	}

	toISOString(): string {
		return new Date(this.currentTime).toISOString();
	}

	advance(ms: number): void {
		this.currentTime += ms;
	}

	advanceMinutes(minutes: number): void {
		this.advance(minutes * 60 * 1000);
	}

	advanceHours(hours: number): void {
		this.advance(hours * 60 * 60 * 1000);
	}

	advanceDays(days: number): void {
		this.advance(days * 24 * 60 * 60 * 1000);
	}
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export function expectViolation(result: any, type: string) {
	// Handle both direct violations and layer-based results
	const allIssues = result.violations || result.layers?.flatMap((l: any) => l.issues) || [];

	const found = allIssues.find((v: any) => v.type === type);
	expect(found).toBeDefined();
	return found;
}

export function expectNoViolation(result: any, type?: string) {
	if (!result.violations || result.violations.length === 0) {
		return; // No violations, pass
	}
	if (type) {
		const found = result.violations.find((v: any) => v.type === type);
		expect(found).toBeUndefined();
	} else {
		expect(result.violations).toEqual([]);
	}
}

export function expectContextContains(context: any, section: string) {
	const stringified = JSON.stringify(context).toLowerCase();
	expect(stringified).toContain(section.toLowerCase());
}

// ============================================================================
// MOCK GENERATORS
// ============================================================================

export function createMockViolation(overrides: Partial<any> = {}): any {
	return {
		date: new Date().toISOString(),
		phase: "test",
		type: "TEST_VIOLATION",
		file: "test/file.ts",
		message: "Test violation message",
		prevention: "How to prevent this",
		...overrides,
	};
}

export function createMockLearning(overrides: Partial<any> = {}): any {
	return {
		id: `L${Date.now()}`,
		type: "pattern",
		trigger: "test trigger",
		action: "test action",
		source: "test-source",
		added: new Date().toISOString().split("T")[0],
		...overrides,
	};
}

export function createMockInteraction(overrides: Partial<any> = {}): any {
	return {
		id: `INT-${Date.now()}-test`,
		timestamp: new Date().toISOString(),
		query: "Test query",
		contextUsed: ["ARCHITECTURE.md"],
		toolsCalled: ["get_context"],
		output: "Test output",
		...overrides,
	};
}

// ============================================================================
// PERFORMANCE HELPERS
// ============================================================================

export async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
	const start = performance.now();
	const result = await fn();
	const duration = performance.now() - start;
	return { result, duration };
}

export function expectPerformance(durationMs: number, maxMs: number): void {
	expect(durationMs).toBeLessThan(maxMs);
}
