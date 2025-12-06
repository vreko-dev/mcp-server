"use client";

import { useState } from "react";
import { useSnapBack } from "../context/SnapBackContext";
import { getProtectionBadgeColor, getProtectionBadgeText } from "../domain/protection";
import type { ProtectionLevel } from "../domain/types";

interface FileExplorerProps {
	onFileSelect: (fileId: string, filePath: string, content: string) => void;
}

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
	const { state, dispatch } = useSnapBack();
	const [_expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

	// Mock file structure for demo purposes
	const mockFiles = [
		{ id: "1", path: "src/index.ts", type: "file" },
		{ id: "2", path: "src/components/Button.tsx", type: "file" },
		{ id: "3", path: "src/utils/helpers.ts", type: "file" },
		{ id: "4", path: "public/index.html", type: "file" },
		{ id: "5", path: "package.json", type: "file" },
	];

	const toggleFolder = (folderPath: string) => {
		setExpandedFolders((prev) => ({
			...prev,
			[folderPath]: !prev[folderPath],
		}));
	};

	const handleFileSelect = (fileId: string, filePath: string) => {
		// In a real implementation, we would load the file content
		// For demo, we'll use mock content
		const mockContent = `// Mock content for ${filePath}\nlogger.info('Hello, SnapBack!');`;
		onFileSelect(fileId, filePath, mockContent);
	};

	const handleProtectionChange = (filePath: string, level: ProtectionLevel) => {
		dispatch({ type: "PROTECT_FILE", payload: { path: filePath, level } });
	};

	const getProtectionLevel = (filePath: string): ProtectionLevel => {
		const protectedFile = state.protectedFiles.find((f) => f.path === filePath);
		return protectedFile ? protectedFile.protectionLevel : "unprotected";
	};

	const renderFileTree = (files: typeof mockFiles, _prefix = "") => {
		return (
			<ul className="pl-4">
				{files.map((file) => {
					const protectionLevel = getProtectionLevel(file.path);
					const badgeText = getProtectionBadgeText(protectionLevel);
					const badgeColor = getProtectionBadgeColor(protectionLevel);

					return (
						<li key={file.id} className="flex items-center py-1 text-sm text-gray-200">
							{file.type === "file" ? (
								<FileIcon className="mr-2 text-gray-400" />
							) : (
								<FolderIcon
									className="mr-2 text-blue-400 cursor-pointer"
									onClick={() => toggleFolder(file.path)}
								/>
							)}

							<button
								type="button"
								className="flex-1 text-left cursor-pointer hover:bg-[#2d2d2d] px-2 py-1 rounded transition-colors"
								onClick={() => file.type === "file" && handleFileSelect(file.id, file.path)}
							>
								{file.path.split("/").pop()}
							</button>

							{file.type === "file" && badgeText && (
								<span
									className={`ml-2 px-2 py-0.5 text-xs rounded-full text-white bg-${badgeColor}-500`}
									title={`Protection level: ${protectionLevel}`}
								>
									{badgeText}
								</span>
							)}

							{file.type === "file" && (
								<ProtectionMenu
									filePath={file.path}
									currentLevel={protectionLevel}
									onChange={handleProtectionChange}
								/>
							)}
						</li>
					);
				})}
			</ul>
		);
	};

	return (
		<div className="border-r border-[#2d2d2d] h-full bg-[#252526]">
			<div className="p-3 border-b border-[#2d2d2d] font-semibold text-gray-100">Explorer</div>
			<div className="p-2">{renderFileTree(mockFiles)}</div>
		</div>
	);
}

interface ProtectionMenuProps {
	filePath: string;
	currentLevel: ProtectionLevel;
	onChange: (filePath: string, level: ProtectionLevel) => void;
}

function ProtectionMenu({ filePath, currentLevel, onChange }: ProtectionMenuProps) {
	const levels: ProtectionLevel[] = ["unprotected", "watch", "warn", "block"];

	return (
		<div className="relative inline-block">
			<select
				value={currentLevel}
				onChange={(e) => onChange(filePath, e.target.value as ProtectionLevel)}
				className="ml-2 p-1 text-xs border border-[#3a3d41] rounded bg-[#1e1e1e] text-gray-100"
			>
				{levels.map((level) => (
					<option key={level} value={level}>
						{level.charAt(0).toUpperCase() + level.slice(1)}
					</option>
				))}
			</select>
		</div>
	);
}

function FileIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<title>File</title>
			<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	);
}

function FolderIcon({ className, onClick }: { className?: string; onClick?: () => void }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			onClick={onClick}
		>
			<title>Folder</title>
			<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
		</svg>
	);
}
