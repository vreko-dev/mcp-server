"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { ExternalLink } from "lucide-react";
import type React from "react";
import { useState } from "react";

// Define types
type HatType = "watched" | "protected" | "critical" | null;
type FileType = "file" | "folder";

interface FileNode {
	id: string;
	name: string;
	type: FileType;
	hat: HatType;
	children?: FileNode[];
}

// Mock file structure for the demo
const demoProject: FileNode[] = [
	{
		id: "1",
		name: "src",
		type: "folder",
		hat: null,
		children: [
			{
				id: "2",
				name: "components",
				type: "folder",
				hat: null,
				children: [
					{
						id: "3",
						name: "Button.tsx",
						type: "file",
						hat: "watched",
					},
					{
						id: "4",
						name: "Header.tsx",
						type: "file",
						hat: null,
					},
				],
			},
			{
				id: "5",
				name: "utils",
				type: "folder",
				hat: null,
				children: [
					{
						id: "6",
						name: "helpers.ts",
						type: "file",
						hat: "protected",
					},
				],
			},
			{
				id: "7",
				name: "App.tsx",
				type: "file",
				hat: "critical",
			},
			{
				id: "8",
				name: "index.ts",
				type: "file",
				hat: null,
			},
		],
	},
	{
		id: "9",
		name: "config",
		type: "folder",
		hat: null,
		children: [
			{
				id: "10",
				name: "webpack.config.js",
				type: "file",
				hat: "protected",
			},
			{
				id: "11",
				name: "jest.config.js",
				type: "file",
				hat: null,
			},
		],
	},
	{
		id: "12",
		name: "docs",
		type: "folder",
		hat: null,
		children: [
			{
				id: "13",
				name: "README.md",
				type: "file",
				hat: "watched",
			},
			{
				id: "14",
				name: "API.md",
				type: "file",
				hat: null,
			},
		],
	},
	{
		id: "15",
		name: "package.json",
		type: "file",
		hat: "critical",
	},
	{
		id: "16",
		name: "tsconfig.json",
		type: "file",
		hat: "protected",
	},
];

// Icon components
const FileIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
		<polyline points="14 2 14 8 20 8" />
	</svg>
);

const FolderIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
	</svg>
);

const FolderOpenIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
		<path d="M2 10h20" />
	</svg>
);

const ChevronRightIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="12"
		height="12"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<polyline points="9 18 15 12 9 6" />
	</svg>
);

const ChevronDownIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="12"
		height="12"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<polyline points="6 9 12 15 18 9" />
	</svg>
);

// Hat emoji components
const WatchedHat = () => <span className="ml-2 text-sky-400">👁️</span>;
const ProtectedHat = () => <span className="ml-2 text-amber-400">⚠️</span>;
const CriticalHat = () => <span className="ml-2 text-rose-500">🛑</span>;

interface TreeNodeProps {
	node: FileNode;
	depth: number;
	expandedNodes: Set<string>;
	toggleExpand: (id: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, expandedNodes, toggleExpand }) => {
	const isExpanded = expandedNodes.has(node.id);
	const hasChildren = node.children && node.children.length > 0;

	const getHatIcon = () => {
		switch (node.hat) {
			case "watched":
				return <WatchedHat />;
			case "protected":
				return <ProtectedHat />;
			case "critical":
				return <CriticalHat />;
			default:
				return null;
		}
	};

	return (
		<div>
			<div
				className="flex items-center py-1 px-2 hover:bg-slate-800 rounded cursor-pointer"
				style={{ paddingLeft: `${depth * 16 + 8}px` }}
			>
				{hasChildren ? (
					<button
						onClick={() => toggleExpand(node.id)}
						className="mr-1 flex items-center justify-center w-4 h-4"
					>
						{isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
					</button>
				) : (
					<div className="mr-1 w-4 h-4" />
				)}

				<div className="mr-2">
					{node.type === "folder" ? isExpanded ? <FolderOpenIcon /> : <FolderIcon /> : <FileIcon />}
				</div>

				<span className="flex-1 text-sm truncate">{node.name}</span>
				{getHatIcon()}
			</div>

			{hasChildren && isExpanded && (
				<div>
					{node.children?.map((child) => (
						<TreeNode
							key={child.id}
							node={child}
							depth={depth + 1}
							expandedNodes={expandedNodes}
							toggleExpand={toggleExpand}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export function ProtectionHatsDemo() {
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["1", "9", "12"]));
	const [buttonHover, setButtonHover] = useState(false);

	const toggleExpand = (id: string) => {
		setExpandedNodes((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	return (
		<section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950">
			<div className="container max-w-6xl">
				<div className="text-center mb-12">
					<h2 className="font-bold text-3xl md:text-4xl mb-4">Protection Hats Demo</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						See how SnapBack protects your code with visual hats. Right-click files to assign hats and see
						real-time activity logging.
					</p>
				</div>

				<Card className="border-slate-800/70 bg-slate-900/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<span className="text-amber-500">⛑️</span>
							SnapBack Protection Hats Demo
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Files with hats:
							<span className="mx-2">👁️ watched,</span>
							<span className="mx-2">⚠️ protected,</span>
							<span className="mx-2">🛑 critical</span>
						</p>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
							<div className="rounded-lg border border-slate-700 bg-slate-800/50">
								<div className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b border-slate-700">
									<FileIcon />
									EXPLORER
								</div>
								<div className="p-2 h-80 overflow-auto">
									<div className="text-xs text-slate-400 mb-2 px-2">PROJECT FILES</div>
									{demoProject.map((node) => (
										<TreeNode
											key={node.id}
											node={node}
											depth={0}
											expandedNodes={expandedNodes}
											toggleExpand={toggleExpand}
										/>
									))}
								</div>
							</div>

							<div className="rounded-lg border border-slate-700 bg-slate-800/50">
								<div className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b border-slate-700">
									📊 ACTIVITY LOG
								</div>
								<div className="p-2 h-80">
									<div className="space-y-2">
										<div className="text-xs text-slate-400 px-2">RECENT ACTIVITY</div>
										<div className="text-sm p-2 rounded bg-slate-800/50">
											<div className="flex items-center">
												<span className="text-rose-500 mr-2">🛑</span>
												<span>package.json marked as critical</span>
											</div>
											<div className="text-xs text-slate-400 mt-1">2 minutes ago</div>
										</div>
										<div className="text-sm p-2 rounded bg-slate-800/50">
											<div className="flex items-center">
												<span className="text-amber-400 mr-2">⚠️</span>
												<span>webpack.config.js protected</span>
											</div>
											<div className="text-xs text-slate-400 mt-1">5 minutes ago</div>
										</div>
										<div className="text-sm p-2 rounded bg-slate-800/50">
											<div className="flex items-center">
												<span className="text-sky-400 mr-2">👁️</span>
												<span>README.md now watched</span>
											</div>
											<div className="text-xs text-slate-400 mt-1">12 minutes ago</div>
										</div>
										<div className="text-sm p-2 rounded bg-slate-800/50">
											<div className="flex items-center">
												<span className="text-rose-500 mr-2">🛑</span>
												<span>App.tsx marked as critical</span>
											</div>
											<div className="text-xs text-slate-400 mt-1">18 minutes ago</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="text-center">
							<a
								href="vscode:extension/MarcelleLabs.snapback-vscode"
								target="_blank"
								rel="noopener noreferrer"
								className={`inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold transition-colors ${
									buttonHover ? "bg-amber-500 text-slate-900" : "bg-amber-600 text-white"
								}`}
								onMouseOver={() => setButtonHover(true)}
								onMouseOut={() => setButtonHover(false)}
							>
								<span>🧩</span>
								Install Extension to Try For Real
								<ExternalLink className="h-4 w-4" />
							</a>
						</div>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
