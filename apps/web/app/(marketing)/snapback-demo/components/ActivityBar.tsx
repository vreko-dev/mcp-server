"use client";

import { useSnapBack } from "../context/SnapBackContext";

interface ActivityBarProps {
	activeView: "snapshots" | "protected-files" | "getting-started";
	onViewChange: (view: "snapshots" | "protected-files" | "getting-started") => void;
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
	const { state } = useSnapBack();

	return (
		<div className="flex flex-col items-center w-12 bg-gray-900 text-white p-2 space-y-4">
			<button
				type="button"
				onClick={() => onViewChange("snapshots")}
				className={`p-2 rounded-lg ${activeView === "snapshots" ? "bg-blue-600" : "hover:bg-gray-700"}`}
				title="Snapshots"
			>
				<SnapshotIcon />
				{state.snapshots.length > 0 && (
					<span className="absolute top-1 right-1 bg-red-500 text-xs rounded-full h-4 w-4 flex items-center justify-center">
						{state.snapshots.length}
					</span>
				)}
			</button>

			<button
				type="button"
				onClick={() => onViewChange("protected-files")}
				className={`p-2 rounded-lg ${activeView === "protected-files" ? "bg-blue-600" : "hover:bg-gray-700"}`}
				title="Protected Files"
			>
				<ProtectedFilesIcon />
				{state.protectedFiles.length > 0 && (
					<span className="absolute top-1 right-1 bg-red-500 text-xs rounded-full h-4 w-4 flex items-center justify-center">
						{state.protectedFiles.length}
					</span>
				)}
			</button>

			<button
				type="button"
				onClick={() => onViewChange("getting-started")}
				className={`p-2 rounded-lg ${activeView === "getting-started" ? "bg-blue-600" : "hover:bg-gray-700"}`}
				title="Getting Started"
			>
				<HelpIcon />
			</button>
		</div>
	);
}

// Simple SVG icons for the activity bar
function SnapshotIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<title>Snapshot</title>
			<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
			<path d="M21 3v5h-5" />
			<path d="M3 12a9 9 0 0 0 2 5.5" />
		</svg>
	);
}

function ProtectedFilesIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<title>Protected Files</title>
			<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
			<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		</svg>
	);
}

function HelpIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<title>Help</title>
			<circle cx="12" cy="12" r="10" />
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
			<path d="M12 17h.01" />
		</svg>
	);
}
