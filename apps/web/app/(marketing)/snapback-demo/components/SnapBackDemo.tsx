"use client";

/**
 * SnapBack Demo Component
 *
 * This is an interactive demo showing how SnapBack works.
 * It demonstrates the snapshot creation and management workflow.
 *
 * Architecture note:
 * - Snapshot creation and metadata: Handled locally in this demo
 * - Restore functionality: Shows instructions for using local agents (VS Code, CLI, MCP)
 * - In production: Cloud stores metadata, local agents restore content from better-sqlite3
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { snapBackCommands } from "../commands";
import { useSnapBack } from "../context/SnapBackContext";
import type { ProtectionLevel, Snapshot } from "../domain/types";
import { useAiMonitoring } from "../hooks/useAiMonitoring";
import { usePolicyApplication } from "../hooks/usePolicyApplication";
import { ActivityBar } from "./ActivityBar";
import { FallbackEditor } from "./FallbackEditor";
import { FileExplorer } from "./FileExplorer";
import { NotificationSystem } from "./NotificationSystem";
import { PolicyWatcher } from "./PolicyWatcher";
import { ProtectionPrompt } from "./ProtectionPrompt";
import { SnapshotTimeline } from "./SnapshotTimeline";
import { StatusBar } from "./StatusBar";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
	ssr: false,
	loading: () => <div>Loading editor...</div>,
});

// Dynamically import Sandpack to avoid SSR issues
const SandpackEditor = dynamic(
	() =>
		import("@codesandbox/sandpack-react").then((mod) => {
			const { SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview } = mod;
			return function SandpackWrapper({ files, activeFile }: any) {
				return (
					<SandpackProvider
						template="react-ts"
						files={files}
						theme="dark"
						options={{
							visibleFiles: [activeFile],
							activeFile: activeFile,
						}}
					>
						<SandpackLayout>
							<SandpackCodeEditor showTabs={true} showLineNumbers={true} showInlineErrors={true} />
							<SandpackPreview />
						</SandpackLayout>
					</SandpackProvider>
				);
			};
		}),
	{ ssr: false, loading: () => <div>Loading editor...</div> },
);

// Flag to use Sandpack instead of Monaco (helpful for tests)
const USE_SANDBOX_EDITOR =
	(typeof window !== "undefined" && (window as any).__USE_SANDBACK_EDITOR__ === true) ||
	process.env.NEXT_PUBLIC_USE_SANDBACK_EDITOR === "true";

const generateId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11));

interface SnapBackDemoProps {
	useSimpleEditor?: boolean;
}

export function SnapBackDemo({ useSimpleEditor = false }: SnapBackDemoProps = {}) {
	const { state, dispatch } = useSnapBack();
	const [activeView, setActiveView] = useState<"snapshots" | "protected-files" | "getting-started">("snapshots");
	const [showProtectionPrompt, setShowProtectionPrompt] = useState(false);
	const [promptLevel, setPromptLevel] = useState<ProtectionLevel>("warn");
	const [isEditorReady, setIsEditorReady] = useState(false);
	// State to control when to load heavy editors
	const [editorLoaded, setEditorLoaded] = useState(false);

	// Apply policies and monitor with AI
	usePolicyApplication();
	useAiMonitoring();

	// Refs for debounced save
	const editorRef = useRef<any>(null);
	const monacoRef = useRef<any>(null);
	const decorationRef = useRef<string[]>([]);
	const stateRef = useRef(state);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const applyProtectionLevel = useCallback(
		(level: ProtectionLevel) => {
			const currentState = stateRef.current;
			dispatch({ type: "SET_PROTECTION_LEVEL", payload: level });

			if (!currentState.currentFilePath) {
				return;
			}

			if (level === "unprotected") {
				dispatch({
					type: "UNPROTECT_FILE",
					payload: currentState.currentFilePath,
				});
			} else {
				dispatch({
					type: "PROTECT_FILE",
					payload: { path: currentState.currentFilePath, level },
				});
			}

			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "info",
					title: "Protection Level Updated",
					message:
						level === "unprotected"
							? `Removed protection from ${currentState.currentFilePath}`
							: `Set ${currentState.currentFilePath} to ${level.toUpperCase()} protection`,
					timestamp: new Date(),
				},
			});
		},
		[dispatch],
	);

	const updateEditorDecorations = useCallback(
		(level: ProtectionLevel) => {
			if (!editorRef.current || typeof editorRef.current.deltaDecorations !== "function" || !monacoRef.current) {
				return;
			}

			const model = editorRef.current.getModel();
			if (!model) {
				return;
			}

			const lineCount = model.getLineCount();
			if (lineCount === 0) {
				return;
			}

			const levelToClass: Record<ProtectionLevel, string | null> = {
				watch: "watch",
				warn: "warn",
				block: "block",
				unprotected: null,
			};

			const classSuffix = levelToClass[level];
			const decorations = classSuffix
				? [
						{
							range: new monacoRef.current.Range(1, 1, lineCount, 1),
							options: {
								isWholeLine: true,
								linesDecorationsClassName: `snapback-line-${classSuffix}`,
								glyphMarginClassName: `snapback-glyph-${classSuffix}`,
								glyphMarginHoverMessage: [
									{
										value: `SnapBack protection: **${level.toUpperCase()}**`,
									},
								],
							},
						},
					]
				: [];

			decorationRef.current = editorRef.current.deltaDecorations(decorationRef.current, decorations);
		},
		[editorRef, monacoRef],
	);

	useEffect(() => {
		if (!isEditorReady) {
			return;
		}
		updateEditorDecorations(state.currentProtectionLevel);
	}, [state.currentProtectionLevel, state.currentFileId, isEditorReady, updateEditorDecorations]);

	// Handle file selection from explorer
	const handleFileSelect = useCallback(
		(fileId: string, filePath: string, content: string) => {
			dispatch({
				type: "SET_CURRENT_FILE",
				payload: { fileId, filePath, content },
			});
			// When a file is selected, load the editor if not already loaded
			if (!editorLoaded) {
				setEditorLoaded(true);
			}
		},
		[dispatch, editorLoaded],
	);

	// Handle editor content change - only update buffer
	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			if (value !== undefined) {
				dispatch({ type: "UPDATE_FILE_CONTENT", payload: value });
			}
		},
		[dispatch],
	);

	// Handle editor mount
	const handleEditorDidMount = useCallback(
		(editor: any, monaco: any) => {
			editorRef.current = editor;
			monacoRef.current = monaco;
			setIsEditorReady(true);

			// Add save command (Ctrl/Cmd + S)
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
				handleSave();
			});

			const quickActions: Array<{ level: ProtectionLevel; label: string }> = [
				{ level: "watch", label: "Set protection to Watch" },
				{ level: "warn", label: "Set protection to Warn" },
				{ level: "block", label: "Set protection to Block" },
			];

			quickActions.forEach(({ level, label }) => {
				editor.addAction({
					id: `snapback-set-${level}`,
					label: `SnapBack: ${label}`,
					contextMenuGroupId: "snapback",
					run: () => applyProtectionLevel(level),
				});
			});

			editor.addAction({
				id: "snapback-unprotect-file",
				label: "SnapBack: Remove protection",
				contextMenuGroupId: "snapback",
				run: () => applyProtectionLevel("unprotected"),
			});

			editor.updateOptions({
				glyphMargin: true,
			});

			updateEditorDecorations(stateRef.current.currentProtectionLevel);
		},
		[applyProtectionLevel, updateEditorDecorations],
	);

	// Handle save action
	const handleSave = useCallback(async () => {
		if (!state.currentFileId || !state.currentFilePath) {
			return;
		}

		// Check protection level
		const protectionLevel = state.currentProtectionLevel;

		// Handle different protection levels
		switch (protectionLevel) {
			case "warn":
				setPromptLevel("warn");
				setShowProtectionPrompt(true);
				break;
			case "block":
				setPromptLevel("block");
				setShowProtectionPrompt(true);
				break;
			default:
				// For watch or unprotected, just save
				await performSave();
				break;
		}
	}, [state.currentFileId, state.currentFilePath, state.currentProtectionLevel]);

	type SaveOptions = {
		forceSnapshot?: boolean;
		skipSnapshot?: boolean;
		message?: string;
	};

	// Perform actual save operation
	const performSave = useCallback(
		async (options: SaveOptions = {}) => {
			if (!state.currentFileId || !state.currentFilePath) {
				return;
			}

			let snapshotCreated: Snapshot | null = null;

			if (!options.skipSnapshot) {
				snapshotCreated = await snapBackCommands.createCheckpoint(
					state.currentFileId,
					state.currentFilePath,
					state.currentFileContent,
					state.currentProtectionLevel,
					undefined,
					{
						...(options.forceSnapshot !== undefined && {
							force: options.forceSnapshot,
						}),
					},
				);

				if (snapshotCreated) {
					dispatch({ type: "ADD_SNAPSHOT", payload: snapshotCreated });
				}
			}

			const notificationMessage =
				options.message ??
				(options.skipSnapshot
					? `Saved ${state.currentFilePath} without creating a checkpoint`
					: snapshotCreated
						? `Checkpoint ${snapshotCreated.name} created for ${state.currentFilePath}`
						: `Saved ${state.currentFilePath}. No new checkpoint needed.`);

			const notificationType = snapshotCreated ? "success" : "info";

			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: notificationType,
					title: "Save Pipeline",
					message: notificationMessage,
					timestamp: new Date(),
				},
			});
		},
		[state.currentFileId, state.currentFilePath, state.currentFileContent, state.currentProtectionLevel, dispatch],
	);

	// Handle protection prompt actions
	const handlePromptAction = useCallback(
		async (action: "create" | "skip" | "cancel") => {
			setShowProtectionPrompt(false);

			switch (action) {
				case "create":
					// Create checkpoint and continue (force snapshot for guarded levels)
					await performSave({ forceSnapshot: true });
					break;
				case "skip":
					// Continue without creating checkpoint
					await performSave({ skipSnapshot: true });
					break;
				case "cancel":
					// Do nothing, just close prompt
					break;
			}
		},
		[performSave],
	);

	const handleManualSnapshot = useCallback(async () => {
		if (!state.currentFileId || !state.currentFilePath) {
			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "warning",
					title: "Select a file",
					message: "Choose a file before creating a manual checkpoint.",
					timestamp: new Date(),
				},
			});
			return;
		}

		const snapshot = await snapBackCommands.createCheckpoint(
			state.currentFileId,
			state.currentFilePath,
			state.currentFileContent,
			state.currentProtectionLevel,
			undefined,
			{ force: true },
		);

		if (snapshot) {
			dispatch({ type: "ADD_SNAPSHOT", payload: snapshot });
			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "success",
					title: "Manual Checkpoint",
					message: `Created checkpoint ${snapshot.name}`,
					timestamp: new Date(),
				},
			});
		} else {
			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "info",
					title: "Manual Checkpoint",
					message: "No changes detected; checkpoint not created.",
					timestamp: new Date(),
				},
			});
		}
	}, [state.currentFileId, state.currentFilePath, state.currentFileContent, state.currentProtectionLevel, dispatch]);

	const handleRestoreLatestSnapshot = useCallback(async () => {
		if (!state.currentFileId) {
			return;
		}

		const latest = state.snapshots
			.filter((snapshot) => snapshot.fileId === state.currentFileId)
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

		if (!latest) {
			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "info",
					title: "Restore Snapshot",
					message: "No checkpoints available for the current file.",
					timestamp: new Date(),
				},
			});
			return;
		}

		await handleRestoreSnapshot(latest.id);
	}, [state.currentFileId, state.snapshots, dispatch]);

	// Handle snapshot restore
	const handleRestoreSnapshot = useCallback(
		async (snapshotId: string) => {
			// In the real SnapBack system:
			// - Web UI shows snapshot metadata only
			// - Restore is performed by local agents (VS Code, CLI, MCP)
			// - Local agent uses better-sqlite3 for content restore
			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "info",
					title: "Snapshot Restore Instructions",
					message: `Snapshot ID: ${snapshotId}

To restore this snapshot, use one of these methods:

1. **VS Code Extension**: Open the SnapBack extension, find this snapshot, and click restore.

2. **CLI**: Run 'snapback restore ${snapshotId}'

3. **MCP**: Use the SnapBack MCP tool to restore this snapshot.

The cloud stores your snapshot metadata. Actual file restoration happens on your local machine using the snapshot content.`,
					timestamp: new Date(),
				},
			});
		},
		[dispatch],
	);

	// Handle snapshot details view
	const handleViewSnapshotDetails = useCallback(
		async (snapshotId: string) => {
			const snapshot = await snapBackCommands.viewCheckpoint(snapshotId);
			if (snapshot) {
				// In a real implementation, we would show a details modal
				// For demo, we'll just show a notification
				dispatch({
					type: "ADD_NOTIFICATION",
					payload: {
						id: generateId(),
						type: "info",
						title: "Snapshot Details",
						message: `Snapshot: ${
							snapshot.name
						}\nCreated: ${snapshot.timestamp.toLocaleString()}\nContent length: ${
							snapshot.content.length
						} characters`,
						timestamp: new Date(),
					},
				});
			}
		},
		[dispatch],
	);

	const handleCompareSnapshot = useCallback(
		async (snapshotId: string) => {
			if (!state.currentFileId) {
				return;
			}

			const result = await snapBackCommands.compareWithCheckpoint(state.currentFileContent, snapshotId);

			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: result.hasChanges ? "warning" : "info",
					title: "Comparison Result",
					message: result.diff,
					timestamp: new Date(),
				},
			});
		},
		[state.currentFileId, state.currentFileContent, dispatch],
	);

	const handleRenameSnapshot = useCallback(
		async (snapshotId: string) => {
			const target = state.snapshots.find((snapshot) => snapshot.id === snapshotId);
			const currentName = target?.name ?? "";

			const newName = typeof window !== "undefined" ? window.prompt("Rename checkpoint", currentName) : null;

			if (!newName || newName.trim() === currentName.trim()) {
				return;
			}

			const updated = await snapBackCommands.renameCheckpoint(snapshotId, newName);
			if (updated) {
				dispatch({
					type: "UPDATE_SNAPSHOT",
					payload: { id: snapshotId, data: { name: updated.name } },
				});
			}
		},
		[state.snapshots, dispatch],
	);

	const handleDeleteSnapshot = useCallback(
		async (snapshotId: string) => {
			const target = state.snapshots.find((snapshot) => snapshot.id === snapshotId);
			const confirmed =
				typeof window !== "undefined"
					? window.confirm(
							`Delete checkpoint${target ? ` "${target.name}"` : ""}? This action cannot be undone.`,
						)
					: false;

			if (!confirmed) {
				return;
			}

			await snapBackCommands.deleteCheckpoint(snapshotId);
			dispatch({ type: "REMOVE_SNAPSHOT", payload: snapshotId });
		},
		[state.snapshots, dispatch],
	);

	// Render active view
	const renderActiveView = useCallback(() => {
		switch (activeView) {
			case "snapshots":
				return (
					<SnapshotTimeline
						onRestore={handleRestoreSnapshot}
						onViewDetails={handleViewSnapshotDetails}
						onCompare={handleCompareSnapshot}
						onRename={handleRenameSnapshot}
						onDelete={handleDeleteSnapshot}
						onCreateManual={handleManualSnapshot}
						canCreateManual={Boolean(state.currentFileId)}
						onRestoreLatest={handleRestoreLatestSnapshot}
					/>
				);
			case "protected-files":
				return (
					<div className="p-4">
						<h3 className="font-semibold mb-4">Protected Files</h3>
						{state.protectedFiles.length === 0 ? (
							<p className="text-gray-500">No protected files</p>
						) : (
							<ul className="space-y-2">
								{state.protectedFiles.map((file) => (
									<li key={file.id} className="flex justify-between items-center p-2 border-b">
										<span>{file.path}</span>
										<span className="px-2 py-1 bg-gray-200 rounded text-sm">
											{file.protectionLevel}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				);
			case "getting-started":
				return (
					<div className="p-4">
						<h3 className="font-semibold mb-4">Getting Started with SnapBack</h3>
						<div className="space-y-4">
							<div>
								<h4 className="font-medium">1. Protection Levels</h4>
								<p className="text-sm text-gray-600">
									Set protection levels (Watch, Warn, Block) on files to control how changes are
									handled.
								</p>
							</div>
							<div>
								<h4 className="font-medium">2. Snapshots</h4>
								<p className="text-sm text-gray-600">
									Automatic or manual snapshots capture your code state for safe rollback.
								</p>
							</div>
							<div>
								<h4 className="font-medium">3. AI Monitoring</h4>
								<p className="text-sm text-gray-600">
									Ambient AI detects risky changes and suggests protection upgrades.
								</p>
							</div>
							<div>
								<h4 className="font-medium">4. Policies</h4>
								<p className="text-sm text-gray-600">
									Use .snapbackprotected and .snapbackignore files to apply protection rules.
								</p>
							</div>
						</div>
					</div>
				);
			default:
				return null;
		}
	}, [
		activeView,
		handleRestoreSnapshot,
		handleViewSnapshotDetails,
		handleCompareSnapshot,
		handleRenameSnapshot,
		handleDeleteSnapshot,
		handleManualSnapshot,
		handleRestoreLatestSnapshot,
		state.currentFileId,
		state.protectedFiles,
	]);

	return (
		<div className="flex flex-col h-screen bg-[#1e1e1e] text-gray-200">
			{/* Notification System */}
			<NotificationSystem />

			{/* Policy Watcher */}
			<PolicyWatcher />

			{/* Protection Prompt */}
			{showProtectionPrompt && (
				<ProtectionPrompt
					level={promptLevel}
					fileName={state.currentFilePath || "Unknown file"}
					onAction={handlePromptAction}
				/>
			)}

			<div className="flex flex-1 overflow-hidden">
				{/* Activity Bar */}
				<ActivityBar activeView={activeView} onViewChange={setActiveView} />

				{/* File Explorer */}
				<div className="w-64 border-r border-gray-800 bg-[#252526]">
					<FileExplorer onFileSelect={handleFileSelect} />
				</div>

				{/* Main Content Area */}
				<div className="flex-1 flex flex-col bg-[#1e1e1e]">
					{/* Editor Area */}
					<div className="flex-1 relative">
						{state.currentFileId ? (
							useSimpleEditor ? (
								<FallbackEditor
									value={state.currentFileContent}
									onChange={(value) =>
										dispatch({
											type: "UPDATE_FILE_CONTENT",
											payload: value,
										})
									}
									onMount={(editorInstance: any) => {
										editorRef.current = editorInstance;
										setIsEditorReady(true);
										updateEditorDecorations(state.currentProtectionLevel);
									}}
								/>
							) : editorLoaded ? ( // Only load heavy editors when editorLoaded is true
								USE_SANDBOX_EDITOR ? (
									<SandpackEditor
										files={{
											[state.currentFilePath || "/example.tsx"]: state.currentFileContent,
										}}
										activeFile={state.currentFilePath || "/example.tsx"}
										onFileChange={(_file: string, content: string) => {
											dispatch({
												type: "UPDATE_FILE_CONTENT",
												payload: content,
											});
										}}
									/>
								) : (
									<MonacoEditor
										height="100%"
										language="typescript"
										theme="vs-dark"
										value={state.currentFileContent}
										onChange={handleEditorChange}
										onMount={handleEditorDidMount}
										options={{
											minimap: { enabled: true },
											fontSize: 14,
											scrollBeyondLastLine: false,
											automaticLayout: true,
											glyphMargin: true,
											lineDecorationsWidth: 4,
										}}
									/>
								)
							) : (
								// Show a lightweight preview with a button to load the editor
								<div className="flex flex-col items-center justify-center h-full text-gray-400 bg-[#1e1e1e]">
									<div className="text-center p-8 max-w-md">
										<h3 className="text-xl font-semibold mb-4">File Selected</h3>
										<p className="mb-6 text-gray-500">{state.currentFilePath || "Selected file"}</p>
										<button
											type="button"
											onClick={() => setEditorLoaded(true)}
											className="px-6 py-3 bg-[#34D399] hover:bg-[#00cc33] text-black font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#34D399] focus:ring-offset-2 focus:ring-offset-[#1e1e1e]"
										>
											Load Editor
										</button>
										<p className="mt-4 text-sm text-gray-500">
											Click above to load the full editor experience
										</p>
									</div>
								</div>
							)
						) : (
							<div className="flex items-center justify-center h-full text-gray-400 bg-[#1e1e1e]">
								Select a file to edit
							</div>
						)}
					</div>

					{/* Bottom Panel */}
					<div className="h-64 border-t border-gray-800 bg-[#1e1e1e]">{renderActiveView()}</div>
				</div>
			</div>

			{/* Status Bar */}
			<StatusBar onSave={handleSave} />
		</div>
	);
}
