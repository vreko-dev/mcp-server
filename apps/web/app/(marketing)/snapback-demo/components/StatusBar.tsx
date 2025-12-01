"use client";

import { useSnapBack } from "../context/SnapBackContext";
import { cycleProtectionLevel } from "../domain/protection";

interface StatusBarProps {
	onSave?: () => void;
}

export function StatusBar({ onSave }: StatusBarProps) {
	const { state, dispatch } = useSnapBack();

	const handleProtectionCycle = () => {
		const newLevel = cycleProtectionLevel(state.currentProtectionLevel);
		dispatch({ type: "SET_PROTECTION_LEVEL", payload: newLevel });

		// Also update the protected file if we have a current file
		if (state.currentFilePath) {
			if (newLevel === "unprotected") {
				dispatch({
					type: "UNPROTECT_FILE",
					payload: state.currentFilePath,
				});
			} else {
				dispatch({
					type: "PROTECT_FILE",
					payload: { path: state.currentFilePath, level: newLevel },
				});
			}
		}
	};

	const getProtectionStatus = (): { text: string; color: string } => {
		switch (state.currentProtectionLevel) {
			case "watch":
				return { text: "Watching", color: "text-cyan-300" };
			case "warn":
				return { text: "Warning", color: "text-amber-300" };
			case "block":
				return { text: "Blocking", color: "text-red-300" };
			default:
				return { text: "Unprotected", color: "text-gray-300" };
		}
	};

	const protectionStatus = getProtectionStatus();

	return (
		<div className="flex items-center justify-between px-4 py-2 bg-[#007acc] text-white text-sm">
			<div className="flex items-center space-x-4">
				<button
					type="button"
					onClick={handleProtectionCycle}
					className={`px-3 py-1 rounded bg-[#005f9e] hover:bg-[#004f85] ${protectionStatus.color}`}
				>
					Protection: {protectionStatus.text}
				</button>

				<div className="flex items-center">
					<span className="mr-2">AI:</span>
					<button
						type="button"
						onClick={() => dispatch({ type: "TOGGLE_AI_MONITORING" })}
						className={`px-2 py-1 rounded ${
							state.isAiMonitoringEnabled
								? "bg-green-500 text-white"
								: "bg-[#146aa3]"
						}`}
					>
						{state.isAiMonitoringEnabled ? "ON" : "OFF"}
					</button>
				</div>
				{onSave && (
					<button
						type="button"
						onClick={onSave}
						className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
						aria-label="Save current file"
					>
						Save
					</button>
				)}
			</div>

			<div className="flex items-center space-x-4 text-xs">
				{state.policyStatusMessage && (
					<div className="opacity-90">{state.policyStatusMessage}</div>
				)}
				<div>
					Snapshots:{" "}
					{
						state.snapshots.filter((s) => s.fileId === state.currentFileId)
							.length
					}
				</div>
				<div>Protected Files: {state.protectedFiles.length}</div>
			</div>
		</div>
	);
}
