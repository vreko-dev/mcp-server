"use client";

import { useSnapBack } from "../context/SnapBackContext";

interface SnapshotTimelineProps {
	onRestore: (snapshotId: string) => void;
	onViewDetails: (snapshotId: string) => void;
	onCompare: (snapshotId: string) => void;
	onRename: (snapshotId: string) => void;
	onDelete: (snapshotId: string) => void;
	onCreateManual?: () => void;
	canCreateManual?: boolean;
	onRestoreLatest?: () => void;
}

export function SnapshotTimeline({
	onRestore,
	onViewDetails,
	onCompare,
	onRename,
	onDelete,
	onCreateManual,
	canCreateManual,
	onRestoreLatest,
}: SnapshotTimelineProps) {
	const { state } = useSnapBack();

	// Get snapshots for current file, sorted newest first
	const currentFileSnapshots = state.snapshots
		.filter((s) => s.fileId === state.currentFileId)
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

	if (!state.currentFileId) {
		return (
			<div className="p-4 text-center text-gray-500">
				Select a file to view its snapshot timeline
			</div>
		);
	}

	if (currentFileSnapshots.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">
				No snapshots available for this file
			</div>
		);
	}

	return (
		<div className="p-4">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<h3 className="font-semibold">Snapshot Timeline</h3>
				<div className="flex flex-wrap gap-2">
					{onRestoreLatest && (
						<button
							type="button"
							onClick={onRestoreLatest}
							disabled={!canCreateManual}
							className="rounded bg-gray-100 px-3 py-1 text-sm font-medium hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-300"
							title="Show restore instructions for the latest snapshot"
						>
							Restore Latest (Agents Only)
						</button>
					)}
					{onCreateManual && (
						<button
							type="button"
							onClick={onCreateManual}
							disabled={!canCreateManual}
							className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
						>
							Create Snapshot
						</button>
					)}
				</div>
			</div>
			<div className="space-y-3">
				{currentFileSnapshots.map((snapshot) => (
					<div
						key={snapshot.id}
						className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
					>
						<div className="flex justify-between items-start">
							<div>
								<div className="font-medium">{snapshot.name}</div>
								<div className="text-sm text-gray-500">
									{snapshot.timestamp.toLocaleString()}
								</div>
							</div>
							<div className="flex flex-wrap items-center justify-end gap-2">
								<button
									type="button"
									onClick={() => onRestore(snapshot.id)}
									className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
									title="Restore via VS Code extension or CLI. Copy snapshot ID to use in your local agent."
								>
									Restore (Agents Only)
								</button>
								<button
									type="button"
									onClick={() => onViewDetails(snapshot.id)}
									className="px-2 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
								>
									Details
								</button>
								<button
									type="button"
									onClick={() => onCompare(snapshot.id)}
									className="px-2 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600"
								>
									Compare
								</button>
								<button
									type="button"
									onClick={() => onRename(snapshot.id)}
									className="px-2 py-1 bg-gray-100 text-sm rounded hover:bg-gray-200"
								>
									Rename
								</button>
								<button
									type="button"
									onClick={() => onDelete(snapshot.id)}
									className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
								>
									Delete
								</button>
							</div>
						</div>
						<div className="mt-2 text-sm text-gray-600 line-clamp-2">
							{snapshot.content.substring(0, 100)}...
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
