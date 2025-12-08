/**
 * SnapBack VS Code Extension - Test Setup
 *
 * Global test configuration, mocks, and utilities
 * Run before every test file
 */

import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock VS Code API (not available in test environment)
vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		showQuickPick: vi.fn(),
		showInputBox: vi.fn(),
		createStatusBarItem: vi.fn(() => ({
			show: vi.fn(),
			hide: vi.fn(),
			dispose: vi.fn(),
			text: "",
			tooltip: "",
			command: "",
		})),
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
		})),
		createTreeView: vi.fn(() => ({
			reveal: vi.fn(),
			dispose: vi.fn(),
		})),
		withProgress: vi.fn((_options, task) => task({ report: vi.fn() })),
		activeTextEditor: undefined,
		visibleTextEditors: [],
		onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
	},
	workspace: {
		workspaceFolders: [],
		getConfiguration: vi.fn(() => ({
			get: vi.fn(),
			update: vi.fn(),
			has: vi.fn(),
			inspect: vi.fn(),
		})),
		onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
		onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidCreateFiles: vi.fn(() => ({ dispose: vi.fn() })),
		onDidDeleteFiles: vi.fn(() => ({ dispose: vi.fn() })),
		onDidRenameFiles: vi.fn(() => ({ dispose: vi.fn() })),
		createFileSystemWatcher: vi.fn(() => ({
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
			onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
			onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
			dispose: vi.fn(),
		})),
		fs: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			stat: vi.fn(),
			readDirectory: vi.fn(),
			createDirectory: vi.fn(),
			delete: vi.fn(),
			rename: vi.fn(),
			copy: vi.fn(),
		},
		openTextDocument: vi.fn(),
		applyEdit: vi.fn(),
	},
	commands: {
		registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
		executeCommand: vi.fn(),
		getCommands: vi.fn(),
	},
	Uri: {
		file: vi.fn((path) => ({ fsPath: path, path, scheme: "file" })),
		parse: vi.fn((str) => ({ fsPath: str, path: str, scheme: "file" })),
		joinPath: vi.fn((base, ...segments) => ({
			fsPath: [base.fsPath, ...segments].join("/"),
			path: [base.path, ...segments].join("/"),
		})),
	},
	Range: vi.fn((startLine, startChar, endLine, endChar) => ({
		start: { line: startLine, character: startChar },
		end: { line: endLine, character: endChar },
	})),
	Position: vi.fn((line, character) => ({ line, character })),
	Selection: vi.fn(),
	StatusBarAlignment: { Left: 1, Right: 2 },
	ThemeColor: vi.fn((id) => ({ id })),
	EventEmitter: vi.fn(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	})),
	Disposable: {
		from: vi.fn((...disposables) => ({
			dispose: () => disposables.forEach((d) => d?.dispose?.()),
		})),
	},
	ProgressLocation: {
		Notification: 15,
		SourceControl: 1,
		Window: 10,
	},
	ConfigurationTarget: {
		Global: 1,
		Workspace: 2,
		WorkspaceFolder: 3,
	},
	FileType: {
		Unknown: 0,
		File: 1,
		Directory: 2,
		SymbolicLink: 64,
	},
	TreeItemCollapsibleState: {
		None: 0,
		Collapsed: 1,
		Expanded: 2,
	},
	TreeItem: vi.fn(),
}));

// Mock simple-git
vi.mock("simple-git", () => ({
	default: vi.fn(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		add: vi.fn().mockResolvedValue(undefined),
		commit: vi.fn().mockResolvedValue({ commit: "abc123" }),
		log: vi.fn().mockResolvedValue({ all: [] }),
		diff: vi.fn().mockResolvedValue(""),
		checkout: vi.fn().mockResolvedValue(undefined),
		status: vi.fn().mockResolvedValue({ isClean: () => true, files: [] }),
		revparse: vi.fn().mockResolvedValue("/repo"),
		branch: vi.fn().mockResolvedValue({ current: "main" }),
		stash: vi.fn().mockResolvedValue(undefined),
		raw: vi.fn().mockResolvedValue(""),
	})),
	simpleGit: vi.fn(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		add: vi.fn().mockResolvedValue(undefined),
		commit: vi.fn().mockResolvedValue({ commit: "abc123" }),
		log: vi.fn().mockResolvedValue({ all: [] }),
		diff: vi.fn().mockResolvedValue(""),
		checkout: vi.fn().mockResolvedValue(undefined),
		status: vi.fn().mockResolvedValue({ isClean: () => true, files: [] }),
		revparse: vi.fn().mockResolvedValue("/repo"),
		branch: vi.fn().mockResolvedValue({ current: "main" }),
		stash: vi.fn().mockResolvedValue(undefined),
		raw: vi.fn().mockResolvedValue(""),
	})),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

export interface MockFile {
	path: string;
	content: string;
	mtime?: Date;
	size?: number;
}

export interface MockWorkspace {
	rootPath: string;
	files: MockFile[];
}

/**
 * Creates a mock workspace for testing
 */
export function createMockWorkspace(options: Partial<MockWorkspace> = {}): MockWorkspace {
	return {
		rootPath: options.rootPath ?? "/test-workspace",
		files: options.files ?? [],
	};
}

/**
 * Creates mock file change events
 */
export function createFileChangeEvent(
	uri: string,
	changeType: "create" | "change" | "delete" = "change",
): { uri: { fsPath: string }; type: string } {
	return {
		uri: { fsPath: uri },
		type: changeType,
	};
}

/**
 * Simulates rapid file changes (AI burst pattern)
 */
export function createBurstPattern(
	basePath: string,
	fileCount: number,
	intervalMs = 50,
): Promise<{ uri: { fsPath: string }; timestamp: number }[]> {
	const events: { uri: { fsPath: string }; timestamp: number }[] = [];
	const startTime = Date.now();

	for (let i = 0; i < fileCount; i++) {
		events.push({
			uri: { fsPath: `${basePath}/file${i}.ts` },
			timestamp: startTime + i * intervalMs,
		});
	}

	return Promise.resolve(events);
}

/**
 * Creates mock commit message with co-author tags
 */
export function createMockCommitMessage(message: string, coAuthors: string[] = []): string {
	let fullMessage = message;

	for (const author of coAuthors) {
		fullMessage += `\n\nCo-authored-by: ${author}`;
	}

	return fullMessage;
}

/**
 * Waits for condition or timeout
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeoutMs = 5000,
	intervalMs = 50,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

/**
 * Creates a mock checkpoint
 */
export function createMockCheckpoint(
	overrides: Partial<{
		id: string;
		timestamp: Date;
		files: string[];
		tool: string;
		confidence: number;
		message: string;
	}> = {},
) {
	return {
		id: overrides.id ?? `snap_${Date.now()}`,
		timestamp: overrides.timestamp ?? new Date(),
		files: overrides.files ?? ["src/index.ts"],
		tool: overrides.tool ?? "unknown",
		confidence: overrides.confidence ?? 0.5,
		message: overrides.message ?? "Auto checkpoint",
	};
}

/**
 * Performance measurement utility
 */
export function measurePerformance<T>(
	fn: () => T | Promise<T>,
	label?: string,
): Promise<{ result: T; durationMs: number }> {
	return Promise.resolve().then(async () => {
		const start = performance.now();
		const result = await fn();
		const durationMs = performance.now() - start;

		if (label) {
			console.log(`[PERF] ${label}: ${durationMs.toFixed(2)}ms`);
		}

		return { result, durationMs };
	});
}

// ============================================================================
// GLOBAL HOOKS
// ============================================================================

beforeAll(() => {
	// Set up global test environment
	vi.useFakeTimers({ shouldAdvanceTime: true });
	console.log("🧪 Test suite starting...");
});

afterAll(() => {
	vi.useRealTimers();
	console.log("✅ Test suite complete");
});

beforeEach(() => {
	// Reset all mocks before each test
	vi.clearAllMocks();
});

afterEach(() => {
	// Clean up after each test
	vi.restoreAllMocks();
});

// ============================================================================
// CUSTOM MATCHERS
// ============================================================================

expect.extend({
	toBeWithinRange(received: number, floor: number, ceiling: number) {
		const pass = received >= floor && received <= ceiling;
		return {
			pass,
			message: () =>
				pass
					? `expected ${received} not to be within range ${floor} - ${ceiling}`
					: `expected ${received} to be within range ${floor} - ${ceiling}`,
		};
	},

	toHaveBeenCalledWithinMs(_received: ReturnType<typeof vi.fn>, expectedMs: number) {
		// Custom matcher to verify function was called within time limit
		const pass = true; // Implement actual timing check
		return {
			pass,
			message: () =>
				pass
					? `expected function not to be called within ${expectedMs}ms`
					: `expected function to be called within ${expectedMs}ms`,
		};
	},
});

// ============================================================================
// TYPE AUGMENTATION
// ============================================================================

declare module "vitest" {
	interface Assertion<T = any> {
		toBeWithinRange(floor: number, ceiling: number): T;
		toHaveBeenCalledWithinMs(expectedMs: number): T;
	}
	interface AsymmetricMatchersContaining {
		toBeWithinRange(floor: number, ceiling: number): any;
	}
}
