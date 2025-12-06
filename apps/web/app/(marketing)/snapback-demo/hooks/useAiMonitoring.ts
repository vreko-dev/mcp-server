import { useEffect, useRef } from "react";
import { snapBackCommands } from "../commands";
import { useSnapBack } from "../context/SnapBackContext";
import { debounce } from "../domain/protection";

const generateId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11));

/**
 * Hook to monitor code changes with AI and provide suggestions
 */
export function useAiMonitoring() {
	const { state, dispatch } = useSnapBack();
	const previousContentRef = useRef(state.currentFileContent);

	// Debounced AI analysis function
	const analyzeWithAi = debounce(async () => {
		if (!state.isAiMonitoringEnabled || !state.currentFilePath) {
			return;
		}

		try {
			// Get AI suggestions
			const suggestions = await snapBackCommands.getAiSuggestions({
				content: state.currentFileContent,
				previousContent: previousContentRef.current,
				filePath: state.currentFilePath,
				protectionLevel: state.currentProtectionLevel,
			});

			// Process suggestions
			for (const suggestion of suggestions) {
				if (suggestion.suggestLevelUpgrade) {
					// Suggest protection level upgrade
					dispatch({
						type: "ADD_NOTIFICATION",
						payload: {
							id: generateId(),
							type: "warning",
							title: "Protection Suggestion",
							message: `Consider upgrading protection to ${suggestion.suggestLevelUpgrade} for this file due to detected risks.`,
							timestamp: new Date(),
							actions: [
								{
									label: "Upgrade",
									action: () => {
										if (state.currentFilePath) {
											dispatch({
												type: "PROTECT_FILE",
												payload: {
													path: state.currentFilePath,
													level: suggestion.suggestLevelUpgrade ?? "watch",
												},
											});
										}
									},
								},
							],
						},
					});
				}

				if (suggestion.requireCheckpoint && suggestion.confidence >= 0.8) {
					// Suggest creating a checkpoint
					dispatch({
						type: "ADD_NOTIFICATION",
						payload: {
							id: generateId(),
							type: "info",
							title: "Checkpoint Suggestion",
							message: "AI detected significant changes. Consider creating a checkpoint.",
							timestamp: new Date(),
							actions: [
								{
									label: "Create Checkpoint",
									action: async () => {
										if (state.currentFileId && state.currentFilePath) {
											const snapshot = await snapBackCommands.createCheckpoint(
												state.currentFileId,
												state.currentFilePath,
												state.currentFileContent,
												state.currentProtectionLevel,
											);

											if (snapshot) {
												dispatch({
													type: "ADD_SNAPSHOT",
													payload: snapshot,
												});
											}
										}
									},
								},
							],
						},
					});
				}
			}

			// Update previous content reference
			previousContentRef.current = state.currentFileContent;
		} catch (error) {
			console.error("AI analysis failed:", { error });
		}
	}, 2000); // Analyze every 2 seconds at most

	// Run AI analysis when content changes
	useEffect(() => {
		analyzeWithAi();
	}, [state.currentFileContent, state.isAiMonitoringEnabled]);
}
