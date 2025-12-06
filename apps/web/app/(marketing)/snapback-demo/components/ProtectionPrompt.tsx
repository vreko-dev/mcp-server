"use client";

import type { ProtectionLevel } from "../domain/types";

interface ProtectionPromptProps {
	level: ProtectionLevel;
	fileName: string;
	onAction: (action: "create" | "skip" | "cancel") => void;
}

export function ProtectionPrompt({ level, fileName, onAction }: ProtectionPromptProps) {
	const getTitle = () => {
		switch (level) {
			case "warn":
				return "Warning: Protected File";
			case "block":
				return "Blocked: Protected File";
			default:
				return "";
		}
	};

	const getMessage = () => {
		switch (level) {
			case "warn":
				return `You are about to modify "${fileName}" which is protected. Creating a snapshot is recommended before proceeding.`;
			case "block":
				return `Modification of "${fileName}" is blocked. You must create a snapshot before proceeding.`;
			default:
				return "";
		}
	};

	const getButtons = () => {
		switch (level) {
			case "warn":
				return (
					<>
						<button
							type="button"
							onClick={() => onAction("create")}
							className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							Create Snapshot & Continue
						</button>
						<button
							type="button"
							onClick={() => onAction("skip")}
							className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						>
							Skip & Continue
						</button>
						<button
							type="button"
							onClick={() => onAction("cancel")}
							className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						>
							Cancel
						</button>
					</>
				);
			case "block":
				return (
					<>
						<button
							type="button"
							onClick={() => onAction("create")}
							className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							Create Snapshot & Continue
						</button>
						<button
							type="button"
							onClick={() => onAction("cancel")}
							className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						>
							Cancel
						</button>
					</>
				);
			default:
				return null;
		}
	};

	if (level !== "warn" && level !== "block") {
		return null;
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="presentation">
			<div
				className="bg-white rounded-lg p-6 w-96 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="prompt-title"
				aria-describedby="prompt-description"
			>
				<h3 id="prompt-title" className="text-lg font-semibold mb-2">
					{getTitle()}
				</h3>
				<p id="prompt-description" className="mb-6 text-gray-700">
					{getMessage()}
				</p>
				<div className="flex justify-end space-x-3">{getButtons()}</div>
			</div>
		</div>
	);
}
