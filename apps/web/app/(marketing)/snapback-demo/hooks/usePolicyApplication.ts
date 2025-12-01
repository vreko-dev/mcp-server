import { useEffect } from "react";
import { snapBackCommands } from "../commands";
import { useSnapBack } from "../context/SnapBackContext.js";

/**
 * Hook to apply policies to files when they change
 */
export function usePolicyApplication() {
	const { state, dispatch } = useSnapBack();

	useEffect(() => {
		const applyPoliciesToFile = async () => {
			if (!state.currentFilePath) {
				return;
			}

			try {
				// Check if file should be protected based on policies
				const protectionLevel = await snapBackCommands.checkFileProtection(
					state.currentFilePath,
				);
				if (protectionLevel) {
					if (state.currentProtectionLevel === protectionLevel) {
						return;
					}
					// Apply protection level
					dispatch({
						type: "PROTECT_FILE",
						payload: {
							path: state.currentFilePath,
							level: protectionLevel,
						},
					});

					// Update current protection level
					dispatch({
						type: "SET_PROTECTION_LEVEL",
						payload: protectionLevel,
					});
				} else {
					if (state.currentProtectionLevel !== "unprotected") {
						dispatch({
							type: "SET_PROTECTION_LEVEL",
							payload: "unprotected",
						});
					}
					dispatch({
						type: "UNPROTECT_FILE",
						payload: state.currentFilePath,
					});
				}
			} catch (error) {
				console.error("Failed to apply policies to file:", { error });
			}
		};

		applyPoliciesToFile();
	}, [state.currentFilePath, state.policies]);
}
