"use client";

import { Card3D } from "@marketing/components/ui/3d-card";
import { FileTree } from "@marketing/components/ui/file-tree";

interface FileTreeItem {
	id: string;
	name: string;
	type: "file" | "folder";
	children?: FileTreeItem[];
}

export function TechnicalArchitecture() {
	const fileTreeData: FileTreeItem[] = [
		{
			id: "1",
			name: "snapback",
			type: "folder",
			children: [
				{
					id: "2",
					name: "packages",
					type: "folder",
					children: [
						{
							id: "3",
							name: "core",
							type: "folder",
							children: [
								{
									id: "4",
									name: "ai-detection-engine.ts",
									type: "file",
								},
								{
									id: "5",
									name: "dependency-analyzer.ts",
									type: "file",
								},
								{
									id: "6",
									name: "risk-assessment.ts",
									type: "file",
								},
								{
									id: "7",
									name: "guardian-system.ts",
									type: "file",
								},
							],
						},
						{
							id: "8",
							name: "adapters",
							type: "folder",
							children: [
								{
									id: "9",
									name: "vscode-extension.ts",
									type: "file",
								},
								{ id: "10", name: "cli-tool.ts", type: "file" },
								{
									id: "11",
									name: "mcp-server.ts",
									type: "file",
								},
							],
						},
						{
							id: "12",
							name: "storage",
							type: "folder",
							children: [
								{
									id: "13",
									name: "git-checkpoints.ts",
									type: "file",
								},
								{
									id: "14",
									name: "encrypted-storage.ts",
									type: "file",
								},
								{
									id: "15",
									name: "file-system-adapters.ts",
									type: "file",
								},
							],
						},
					],
				},
				{
					id: "16",
					name: "apps",
					type: "folder",
					children: [
						{
							id: "17",
							name: "vscode-extension",
							type: "folder",
							children: [],
						},
						{ id: "18", name: "cli", type: "folder", children: [] },
						{
							id: "19",
							name: "mcp-server",
							type: "folder",
							children: [],
						},
					],
				},
			],
		},
	];

	const techStack = [
		"TypeScript",
		"Zod",
		"Event Bus",
		"pnpm Workspaces",
		"GitHub Actions",
		"VS Code API",
		"Vitest",
		"E2E Testing",
	];

	return (
		<section className="py-16 bg-muted/50">
			<div className="container max-w-5xl">
				<div className="text-center mb-12">
					<h2 className="font-bold text-3xl md:text-4xl">Built for Developers, By Developers</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						Technical architecture designed for performance and extensibility
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<Card3D className="h-full">
						<div className="p-6">
							<h3 className="font-semibold text-xl mb-4">Architecture Highlights</h3>
							<div className="space-y-4">
								<div>
									<h4 className="font-medium text-lg text-primary">Core Package (Pure Logic)</h4>
									<ul className="mt-2 space-y-1 text-sm">
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											AI Detection Engine
										</li>
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											Dependency Analyzer
										</li>
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											Risk Assessment
										</li>
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											Guardian System
										</li>
									</ul>
								</div>

								<div>
									<h4 className="font-medium text-lg text-primary">Platform Adapters</h4>
									<ul className="mt-2 space-y-1 text-sm">
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											VS Code Extension (TypeScript)
										</li>
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											CLI Tool (Commander.js)
										</li>
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											MCP Server (Model Context Protocol)
										</li>
									</ul>
								</div>

								<div>
									<h4 className="font-medium text-lg text-primary">Storage Layer</h4>
									<ul className="mt-2 space-y-1 text-sm">
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											Git-based checkpoints
										</li>
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											Encrypted .snapback directory
										</li>
										<li className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 bg-primary rounded-full" />
											File system adapters
										</li>
									</ul>
								</div>
							</div>
						</div>
					</Card3D>

					<div>
						<Card3D className="h-full">
							<div className="p-6">
								<h3 className="font-semibold text-xl mb-4">Repository Structure</h3>
								<FileTree items={fileTreeData} className="max-h-80 overflow-y-auto" />
							</div>
						</Card3D>
					</div>
				</div>

				<div className="mt-12">
					<h3 className="font-semibold text-center text-xl mb-6">Tech Stack</h3>
					<div className="flex flex-wrap justify-center gap-3">
						{techStack.map((tech, index) => (
							<div
								key={index}
								className="px-4 py-2 bg-card border rounded-full text-sm font-medium hover:shadow-md transition-shadow"
							>
								{tech}
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
