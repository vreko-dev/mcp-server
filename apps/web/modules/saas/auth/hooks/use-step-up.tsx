/**
 * Hook to handle step-up authentication requirements
 * Automatically shows step-up modal when API returns 401 STEPUP_REQUIRED
 */

"use client";

import { useCallback, useState } from "react";
import { StepUpModal } from "../components/StepUpModal";

interface StepUpState {
	isRequired: boolean;
	action?: string;
	retryCallback?: () => Promise<void>;
}

export function useStepUp() {
	const [state, setState] = useState<StepUpState>({
		isRequired: false,
	});

	/**
	 * Wrap an API call with step-up handling
	 * If the API returns 401 with STEPUP_REQUIRED, shows the modal
	 */
	const withStepUp = useCallback(
		async <T,>(
			apiCall: () => Promise<Response>,
			actionDescription?: string,
		): Promise<T> => {
			const response = await apiCall();

			if (response.status === 401) {
				const data = await response.json();

				if (data.code === "STEPUP_REQUIRED") {
					// Show step-up modal
					return new Promise<T>((resolve, reject) => {
						setState({
							isRequired: true,
							action: actionDescription,
							retryCallback: async () => {
								try {
									// Retry the original call after step-up
									const retryResponse = await apiCall();
									if (!retryResponse.ok) {
										throw new Error("Request failed after step-up");
									}
									const result = await retryResponse.json();
									resolve(result);
								} catch (err) {
									reject(err);
								}
							},
						});
					});
				}
			}

			if (!response.ok) {
				throw new Error(`API call failed: ${response.statusText}`);
			}

			return response.json();
		},
		[],
	);

	const handleSuccess = useCallback(async () => {
		if (state.retryCallback) {
			await state.retryCallback();
		}
		setState({ isRequired: false });
	}, [state.retryCallback]);

	const handleClose = useCallback(() => {
		setState({ isRequired: false });
	}, []);

	const StepUpProvider = useCallback(
		() => (
			<StepUpModal
				isOpen={state.isRequired}
				onClose={handleClose}
				onSuccess={handleSuccess}
				action={state.action}
			/>
		),
		[state, handleClose, handleSuccess],
	);

	return {
		withStepUp,
		StepUpProvider,
		isStepUpRequired: state.isRequired,
	};
}

/**
 * Example usage:
 *
 * function BillingComponent() {
 *   const { withStepUp, StepUpProvider } = useStepUp();
 *
 *   const handleUpgrade = async () => {
 *     await withStepUp(
 *       () => fetch('/api/billing/create-checkout', { method: 'POST', credentials: 'include' }),
 *       'upgrade your plan'
 *     );
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleUpgrade}>Upgrade</button>
 *       <StepUpProvider />
 *     </>
 *   );
 * }
 */
