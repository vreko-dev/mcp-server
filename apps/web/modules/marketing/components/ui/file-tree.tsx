"use client";

import { cn } from "@ui/lib";
import { ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";

interface FileTreeItem {
	id: string;
	name: string;
	type: "file" | "folder";
	children?: FileTreeItem[];
	icon?: React.ReactNode;
}

interface FileTreeProps {
	items: FileTreeItem[];
	className?: string;
}

export const FileTree = ({ items, className }: FileTreeProps) => {
	return (
		<div className={cn("rounded-lg bg-card border p-4", className)}>
			<div className="space-y-1">
				{items.map((item) => (
					<FileTreeItem key={item.id} item={item} depth={0} />
				))}
			</div>
		</div>
	);
};

interface FileTreeItemProps {
	item: FileTreeItem;
	depth: number;
}

const FileTreeItem = ({ item, depth }: FileTreeItemProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const hasChildren = item.children && item.children.length > 0;

	return (
		<div>
			<div
				className={cn(
					"flex items-center gap-2 py-1 px-2 rounded hover:bg-accent cursor-pointer",
					depth > 0 && "ml-4",
				)}
				style={{ paddingLeft: `${depth * 16 + 8}px` }}
				onClick={() => hasChildren && setIsOpen(!isOpen)}
			>
				{hasChildren ? (
					<ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
				) : (
					<div className="w-4" />
				)}
				{item.type === "folder" ? (
					<Folder className="h-4 w-4 text-blue-500" />
				) : (
					<File className="h-4 w-4 text-gray-500" />
				)}
				<span className="text-sm">{item.name}</span>
			</div>
			{hasChildren && isOpen && (
				<div className="space-y-1">
					{item.children?.map((child) => (
						<FileTreeItem key={child.id} item={child} depth={depth + 1} />
					))}
				</div>
			)}
		</div>
	);
};
