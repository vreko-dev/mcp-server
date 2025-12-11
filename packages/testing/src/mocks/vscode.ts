/**
 * Centralized VSCode API Mocks
 *
 * Provides comprehensive mocks for the VS Code extension API.
 * Use these mocks in unit tests to avoid loading the real VS Code runtime.
 *
 * @example
 * ```typescript
 * import { vi } from 'vitest';
 * import { createVscodeMock, mockVscode } from '@snapback/testing/mocks/vscode';
 *
 * // Option 1: Use pre-built mock
 * vi.mock('vscode', () => mockVscode);
 *
 * // Option 2: Create custom mock with overrides
 * vi.mock('vscode', () => createVscodeMock({
 *   window: {
 *     showInformationMessage: vi.fn().mockResolvedValue('Yes'),
 *   },
 * }));
 * ```
 */

/**
 * Mock VS Code EventEmitter that actually works with event subscriptions
 */
export class MockEventEmitter<T> {
	private listeners: Array<(e: T) => unknown> = [];

	get event() {
		return (listener: (e: T) => unknown) => {
			this.listeners.push(listener);
			return {
				dispose: () => {
					const index = this.listeners.indexOf(listener);
					if (index > -1) {
						this.listeners.splice(index, 1);
					}
				},
			};
		};
	}

	fire(data: T): void {
		for (const listener of this.listeners) {
			listener(data);
		}
	}

	dispose(): void {
		this.listeners = [];
	}
}

/**
 * Mock VS Code Position class
 */
export class MockPosition {
	constructor(
		public readonly line: number,
		public readonly character: number,
	) {}

	isEqual(other: MockPosition): boolean {
		return this.line === other.line && this.character === other.character;
	}

	isBefore(other: MockPosition): boolean {
		return this.line < other.line || (this.line === other.line && this.character < other.character);
	}

	isAfter(other: MockPosition): boolean {
		return this.line > other.line || (this.line === other.line && this.character > other.character);
	}

	translate(lineDelta = 0, characterDelta = 0): MockPosition {
		return new MockPosition(this.line + lineDelta, this.character + characterDelta);
	}
}

/**
 * Mock VS Code Range class
 */
export class MockRange {
	constructor(
		public readonly start: MockPosition,
		public readonly end: MockPosition,
	) {}

	static fromNumbers(startLine: number, startChar: number, endLine: number, endChar: number): MockRange {
		return new MockRange(new MockPosition(startLine, startChar), new MockPosition(endLine, endChar));
	}

	get isEmpty(): boolean {
		return this.start.isEqual(this.end);
	}

	get isSingleLine(): boolean {
		return this.start.line === this.end.line;
	}

	contains(positionOrRange: MockPosition | MockRange): boolean {
		if (positionOrRange instanceof MockPosition) {
			return !positionOrRange.isBefore(this.start) && !positionOrRange.isAfter(this.end);
		}
		return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
	}
}

/**
 * Mock VS Code WorkspaceEdit class
 */
export class MockWorkspaceEdit {
	private edits: Array<{ uri: unknown; range: MockRange; text: string }> = [];

	replace(uri: unknown, range: MockRange, text: string): void {
		this.edits.push({ uri, range, text });
	}

	insert(uri: unknown, position: MockPosition, text: string): void {
		this.replace(uri, new MockRange(position, position), text);
	}

	delete(uri: unknown, range: MockRange): void {
		this.replace(uri, range, "");
	}

	getEdits(): Array<{ uri: unknown; range: MockRange; text: string }> {
		return this.edits;
	}

	get size(): number {
		return this.edits.length;
	}
}

/**
 * Mock VS Code TreeItem class
 */
export class MockTreeItem {
	label?: string;
	collapsibleState?: number;
	iconPath?: unknown;
	command?: unknown;
	contextValue?: string;
	tooltip?: string;
	description?: string;

	constructor(labelOrResourceUri: string | unknown, collapsibleState?: number) {
		if (typeof labelOrResourceUri === "string") {
			this.label = labelOrResourceUri;
		}
		this.collapsibleState = collapsibleState;
	}
}

/**
 * Mock VS Code Disposable class
 */
export class MockDisposable {
	static from(...disposables: Array<{ dispose: () => unknown }>): MockDisposable {
		return new MockDisposable(() => {
			for (const d of disposables) {
				d?.dispose?.();
			}
		});
	}

	constructor(private callOnDispose?: () => unknown) {}

	dispose(): void {
		this.callOnDispose?.();
	}
}

/**
 * Mock VS Code CancellationError class
 */
export class MockCancellationError extends Error {
	constructor() {
		super("Operation cancelled");
		this.name = "CancellationError";
	}
}

/**
 * Mock VS Code RelativePattern class
 */
export class MockRelativePattern {
	constructor(
		public readonly base: string,
		public readonly pattern: string,
	) {}
}

/**
 * Create mock output channel
 */
export function createMockOutputChannel(name = "Test") {
	return {
		name,
		append: createMockFn(),
		appendLine: createMockFn(),
		clear: createMockFn(),
		show: createMockFn(),
		hide: createMockFn(),
		dispose: createMockFn(),
		replace: createMockFn(),
	};
}

/**
 * Create mock status bar item
 */
export function createMockStatusBarItem() {
	return {
		text: "",
		tooltip: "",
		command: undefined as string | undefined,
		alignment: 1,
		priority: 100,
		show: createMockFn(),
		hide: createMockFn(),
		dispose: createMockFn(),
	};
}

/**
 * Create mock diagnostic collection
 */
export function createMockDiagnosticCollection(name = "default") {
	return {
		name,
		set: createMockFn(),
		delete: createMockFn(),
		clear: createMockFn(),
		forEach: createMockFn(),
		get: createMockFn(),
		has: createMockFn(),
		dispose: createMockFn(),
	};
}

/**
 * Create mock text document
 */
export function createMockTextDocument(options: Partial<{ uri: unknown; content: string; languageId: string }> = {}) {
	const content = options.content ?? "";
	const lines = content.split("\n");

	return {
		uri: options.uri ?? { fsPath: "/test/file.ts", scheme: "file" },
		fileName: "/test/file.ts",
		isUntitled: false,
		languageId: options.languageId ?? "typescript",
		version: 1,
		isDirty: false,
		isClosed: false,
		save: createMockFn().mockResolvedValue(true),
		eol: 1,
		lineCount: lines.length,
		lineAt: vi.fn((lineNumber: number) => ({
			text: lines[lineNumber] ?? "",
			lineNumber,
			range: MockRange.fromNumbers(lineNumber, 0, lineNumber, (lines[lineNumber] ?? "").length),
			rangeIncludingLineBreak: MockRange.fromNumbers(lineNumber, 0, lineNumber + 1, 0),
			firstNonWhitespaceCharacterIndex: (lines[lineNumber] ?? "").search(/\S/),
			isEmptyOrWhitespace: (lines[lineNumber] ?? "").trim() === "",
		})),
		offsetAt: createMockFn(),
		positionAt: createMockFn(),
		getText: vi.fn(() => content),
		getWordRangeAtPosition: createMockFn(),
		validateRange: vi.fn((range: MockRange) => range),
		validatePosition: vi.fn((pos: MockPosition) => pos),
	};
}

/**
 * Create mock file system watcher
 */
export function createMockFileSystemWatcher() {
	return {
		onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
		onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
		onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
		dispose: createMockFn(),
	};
}

// Import vi from vitest at the top for type safety
import { type Mock, vi } from "vitest";

/**
 * Helper to create mock functions
 */
function createMockFn(): Mock {
	return vi.fn();
}

/**
 * Complete VS Code mock object
 *
 * This is the default mock that covers most testing scenarios.
 * Use createVscodeMock() for customization.
 */
export const mockVscode = {
	commands: {
		registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
		executeCommand: vi.fn().mockResolvedValue(undefined),
		getCommands: vi.fn().mockResolvedValue([]),
	},
	window: {
		showInformationMessage: vi.fn().mockResolvedValue(undefined),
		showWarningMessage: vi.fn().mockResolvedValue(undefined),
		showErrorMessage: vi.fn().mockResolvedValue(undefined),
		showQuickPick: vi.fn().mockResolvedValue(undefined),
		showInputBox: vi.fn().mockResolvedValue(undefined),
		showWorkspaceFolderPick: vi.fn().mockResolvedValue(undefined),
		createOutputChannel: vi.fn(() => createMockOutputChannel()),
		createStatusBarItem: vi.fn(() => createMockStatusBarItem()),
		withProgress: vi.fn().mockImplementation((_options, task) => task({ report: vi.fn() })),
		registerTreeDataProvider: vi.fn(() => ({ dispose: vi.fn() })),
		registerFileDecorationProvider: vi.fn(() => ({ dispose: vi.fn() })),
		showTextDocument: vi.fn().mockImplementation(async (document) => ({
			document,
			edit: vi.fn().mockImplementation(async (callback) => {
				const editBuilder = {
					insert: vi.fn(),
					delete: vi.fn(),
					replace: vi.fn(),
				};
				callback(editBuilder);
				return true;
			}),
		})),
		setStatusBarMessage: vi.fn(() => ({ dispose: vi.fn() })),
		createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })),
		onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
		onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		visibleTextEditors: [],
		activeTextEditor: undefined,
	},
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
			update: vi.fn().mockResolvedValue(undefined),
			has: vi.fn(() => false),
			inspect: vi.fn(),
		})),
		workspaceFolders: [{ uri: { fsPath: "/test/workspace" }, name: "test", index: 0 }],
		getWorkspaceFolder: vi.fn((uri: { scheme?: string }) => {
			if (uri?.scheme === "file") {
				return { uri: { fsPath: "/test/workspace" }, name: "test", index: 0 };
			}
			return undefined;
		}),
		asRelativePath: vi.fn((pathOrUri: string | { fsPath: string }) => {
			const path = typeof pathOrUri === "string" ? pathOrUri : pathOrUri.fsPath;
			return path.replace(/^.*workspace\//, "");
		}),
		findFiles: vi.fn().mockResolvedValue([]),
		fs: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			stat: vi.fn(),
			delete: vi.fn(),
			rename: vi.fn(),
			readDirectory: vi.fn().mockResolvedValue([]),
			createDirectory: vi.fn(),
			copy: vi.fn(),
		},
		onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
		onWillSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
		onDidCreateFiles: vi.fn(() => ({ dispose: vi.fn() })),
		onDidDeleteFiles: vi.fn(() => ({ dispose: vi.fn() })),
		onDidRenameFiles: vi.fn(() => ({ dispose: vi.fn() })),
		registerTextDocumentContentProvider: vi.fn(() => ({ dispose: vi.fn() })),
		registerTimelineProvider: vi.fn(() => ({ dispose: vi.fn() })),
		createFileSystemWatcher: vi.fn(() => createMockFileSystemWatcher()),
		applyEdit: vi.fn().mockResolvedValue(true),
		openTextDocument: vi.fn().mockImplementation(async (uri) => createMockTextDocument({ uri })),
		onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidCloseTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
	},
	languages: {
		registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
		createDiagnosticCollection: vi.fn((name?: string) => createMockDiagnosticCollection(name)),
		registerCodeActionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
		registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
	},
	Uri: {
		file: vi.fn((path: string) => ({
			fsPath: path,
			path,
			scheme: "file",
			authority: "",
			query: "",
			fragment: "",
			toString: () => `file://${path}`,
			with: vi.fn(),
		})),
		parse: vi.fn((value: string) => {
			const match = value.match(/^([a-z][a-z0-9+.-]*):\/\/([^/]*)(.*)$/i);
			if (match) {
				const [, scheme, authority, path] = match;
				return {
					scheme,
					authority,
					path: path || "/",
					query: "",
					fragment: "",
					fsPath: path || "/",
					toString: () => value,
					with: vi.fn(),
				};
			}
			return {
				scheme: "file",
				authority: "",
				path: value,
				query: "",
				fragment: "",
				fsPath: value,
				toString: () => value,
				with: vi.fn(),
			};
		}),
		joinPath: vi.fn((base, ...pathSegments: string[]) => ({
			fsPath: [base.fsPath, ...pathSegments].join("/"),
			path: [base.path, ...pathSegments].join("/"),
			scheme: base.scheme || "file",
			authority: base.authority || "",
			query: "",
			fragment: "",
			toString: () => `${base.scheme}://${base.authority || ""}${[base.path, ...pathSegments].join("/")}`,
			with: vi.fn(),
		})),
	},
	FileType: {
		Unknown: 0,
		File: 1,
		Directory: 2,
		SymbolicLink: 64,
	},
	extensions: {
		all: [],
		getExtension: vi.fn((extensionId: string) => {
			// Return mock extension for snapback
			if (extensionId === "snapback.snapback" || extensionId.includes("snapback")) {
				return {
					id: extensionId,
					extensionUri: { fsPath: "/test/extension", scheme: "file" },
					extensionPath: "/test/extension",
					isActive: true,
					packageJSON: {
						name: "snapback",
						displayName: "SnapBack",
						version: "1.0.0",
						publisher: "snapback",
						description: "Test extension",
					},
					exports: undefined,
					activate: vi.fn().mockResolvedValue(undefined),
				};
			}
			return undefined;
		}),
		onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
	},
	EventEmitter: MockEventEmitter,
	Position: MockPosition,
	Range: MockRange,
	WorkspaceEdit: MockWorkspaceEdit,
	ThemeColor: vi.fn((id: string) => ({ id })),
	ThemeIcon: vi.fn((id: string) => ({ id })),
	FileDecoration: vi.fn((badge, tooltip, color) => ({ badge, tooltip, color })),
	ConfigurationTarget: {
		Global: 1,
		Workspace: 2,
		WorkspaceFolder: 3,
	},
	LogLevel: {
		Off: 0,
		Trace: 1,
		Debug: 2,
		Info: 3,
		Warning: 4,
		Error: 5,
	},
	TreeItem: MockTreeItem,
	TreeItemCollapsibleState: {
		None: 0,
		Collapsed: 1,
		Expanded: 2,
	},
	ProgressLocation: {
		Notification: 15,
		SourceControl: 1,
		Window: 10,
	},
	StatusBarAlignment: {
		Left: 1,
		Right: 2,
	},
	Disposable: MockDisposable,
	RelativePattern: MockRelativePattern,
	OverviewRulerLane: {
		Left: 0,
		Center: 1,
		Right: 2,
		Full: 3,
	},
	CancellationError: MockCancellationError,
	CancellationTokenSource: vi.fn(() => ({
		token: { isCancellationRequested: false, onCancellationRequested: vi.fn() },
		cancel: vi.fn(),
		dispose: vi.fn(),
	})),
	Selection: vi.fn(),
	DiagnosticSeverity: {
		Error: 0,
		Warning: 1,
		Information: 2,
		Hint: 3,
	},
	env: {
		appName: "VS Code",
		appRoot: "/app",
		language: "en",
		machineId: "test-machine-id",
		sessionId: "test-session-id",
		clipboard: {
			readText: vi.fn().mockResolvedValue(""),
			writeText: vi.fn().mockResolvedValue(undefined),
		},
		openExternal: vi.fn().mockResolvedValue(true),
	},
};

/**
 * Create a customized VS Code mock with overrides
 *
 * @param overrides - Partial mock object to merge with defaults
 * @returns Complete VS Code mock with overrides applied
 *
 * @example
 * ```typescript
 * const customMock = createVscodeMock({
 *   window: {
 *     showInformationMessage: vi.fn().mockResolvedValue('Yes'),
 *   },
 * });
 * vi.mock('vscode', () => customMock);
 * ```
 */
export function createVscodeMock(overrides: DeepPartial<typeof mockVscode> = {}): typeof mockVscode {
	return deepMerge(mockVscode, overrides) as typeof mockVscode;
}

/**
 * Deep partial type helper
 */
type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;

/**
 * Deep merge utility
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
	const result = { ...target } as Record<string, unknown>;

	for (const key of Object.keys(source)) {
		const sourceValue = (source as Record<string, unknown>)[key];
		const targetValue = target[key];

		if (sourceValue !== undefined) {
			if (
				typeof sourceValue === "object" &&
				sourceValue !== null &&
				!Array.isArray(sourceValue) &&
				typeof targetValue === "object" &&
				targetValue !== null
			) {
				result[key] = deepMerge(
					targetValue as Record<string, unknown>,
					sourceValue as DeepPartial<Record<string, unknown>>,
				);
			} else {
				result[key] = sourceValue;
			}
		}
	}

	return result as T;
}

/**
 * Setup VSCode mock globally for all tests
 *
 * DEPRECATED: Use vi.mock() in your test setup file instead (see setup.ts pattern).
 * This function cannot work with vitest hoisting rules since it tries to call vi.mock()
 * with a closure over locally-scoped variables.
 *
 * @example
 * ```typescript
 * // In test/setup.ts - DO THIS INSTEAD:
 * import { mockVscode } from '@snapback/testing/mocks/vscode';
 * vi.mock("vscode", () => mockVscode);
 * (globalThis as Record<string, unknown>).vscode = mockVscode;
 * ```
 *
 * @deprecated Use module-level vi.mock() instead
 */
export function setupVscodeMock(customMock?: DeepPartial<typeof mockVscode>): void {
	// This function is kept for backward compatibility but cannot be implemented
	// due to vitest hoisting rules. Use vi.mock() at module level instead.
	console.warn("setupVscodeMock() is deprecated. Use vi.mock() at module level instead (see setup.ts pattern).");

	// Set globally for direct access in tests (this part still works)
	const mock = customMock ? createVscodeMock(customMock) : mockVscode;
	(globalThis as Record<string, unknown>).vscode = mock;
}
