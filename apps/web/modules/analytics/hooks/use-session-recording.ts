/**
 * Session Recording Hook
 *
 * React hook for managing session recording with smart sampling.
 * Provides controls to start/stop recording and check recording status.
 */

// Note: SessionReplayManager imports disabled - not exported from infrastructure package
// TODO: Export these from @snapback/infrastructure or create dedicated session-replay package
import { useEffect, useState } from "react";

// Stub types until infrastructure exports are available
interface SamplingContext {
	userId?: string;
	plan?: string;
	hasErrors?: boolean;
}

declare global {
	interface Window {
		posthog?: any;
	}
}

export interface UseSessionRecordingProps {
	/**
	 * Whether to automatically start recording based on sampling logic
	 */
	autoStart?: boolean;

	/**
	 * User context for sampling decisions
	 */
	context?: Partial<SamplingContext>;

	/**
	 * Whether to record sessions with errors regardless of sampling
	 */
	recordErrors?: boolean;
}

export interface UseSessionRecordingReturn {
	/**
	 * Whether session recording is currently active
	 */
	isRecording: boolean;

	/**
	 * Start session recording
	 */
	startRecording: () => void;

	/**
	 * Stop session recording
	 */
	stopRecording: () => void;

	/**
	 * Current sampling rate
	 */
	samplingRate: number;

	/**
	 * Budget utilization
	 */
	budgetUtilization: number;
}

/**
 * React hook for managing session recording
 *
 * @param props - Configuration options
 * @returns Session recording controls and status
 */
export function useSessionRecording(props: UseSessionRecordingProps = {}): UseSessionRecordingReturn {
	const { autoStart = false, recordErrors = true } = props;
	// const context = props.context || {};  // Disabled until SessionReplayManager is available

	const [isRecording, setIsRecording] = useState(false);
	const [samplingRate] = useState(0.3); // Default from BALANCED_SAMPLING
	const [budgetUtilization] = useState(0);

	// SessionReplayManager disabled until infrastructure exports are available
	// const sessionReplayManager = SessionReplayManager.getInstance();

	// Update context when it changes (disabled until SessionReplayManager is available)
	// useEffect(() => {
	// 	if (Object.keys(context).length > 0) {
	// 		sessionReplayManager.updateContext(context);
	// 		setSamplingRate(sessionReplayManager.getSamplingRate());
	// 		setBudgetUtilization(sessionReplayManager.getBudgetUtilization());
	// 	}
	// }, [context, sessionReplayManager]);

	// Auto-start recording based on sampling logic
	useEffect(() => {
		if (autoStart && window.posthog) {
			// Simple random sampling for demo purposes
			// In a real implementation, this would use the sessionReplayManager logic
			const shouldRecord = Math.random() <= samplingRate;

			if (shouldRecord) {
				window.posthog.startSessionRecording();
				setIsRecording(true);
				// sessionReplayManager.recordSession();  // Disabled until exports available
			}
		}

		// Cleanup on unmount
		return () => {
			if (isRecording && window.posthog) {
				window.posthog.stopSessionRecording();
			}
		};
	}, [autoStart, samplingRate]);

	// Set up error recording if enabled
	useEffect(() => {
		if (recordErrors && window.posthog) {
			const handleError = () => {
				// Always record sessions with errors
				if (!isRecording) {
					window.posthog.startSessionRecording();
					setIsRecording(true);
					// sessionReplayManager.recordSession();  // Disabled until exports available
				}
			};

			window.addEventListener("error", handleError);
			window.addEventListener("unhandledrejection", handleError);

			return () => {
				window.removeEventListener("error", handleError);
				window.removeEventListener("unhandledrejection", handleError);
			};
		}
	}, [recordErrors, isRecording]);

	const startRecording = () => {
		if (window.posthog) {
			window.posthog.startSessionRecording();
			setIsRecording(true);
			// sessionReplayManager.recordSession();  // Disabled until exports available
		}
	};

	const stopRecording = () => {
		if (window.posthog) {
			window.posthog.stopSessionRecording();
			setIsRecording(false);
		}
	};

	return {
		isRecording,
		startRecording,
		stopRecording,
		samplingRate,
		budgetUtilization,
	};
}
