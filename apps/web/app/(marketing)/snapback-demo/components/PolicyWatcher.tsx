"use client";

import { useEffect, useRef } from "react";
import { snapBackCommands } from "../commands";
import { useSnapBack } from "../context/SnapBackContext";
import { debounce } from "../domain/protection";

const generateId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11));

interface PolicyWatcherProps {
	onPolicyChange?: () => void;
}

export function PolicyWatcher({ onPolicyChange }: PolicyWatcherProps) {
	const { dispatch } = useSnapBack();
	const policyCheckRef = useRef<NodeJS.Timeout | null>(null);

	// Debounced policy reload function
	const loadAndDispatch = async () => {
		try {
			// Load policies and update context
			const policies = await snapBackCommands.loadPolicies();
			dispatch({ type: "SET_POLICIES", payload: policies });
			dispatch({
				type: "SET_POLICY_STATUS",
				payload: {
					message: `Policies updated at ${new Date().toLocaleTimeString()}`,
					timestamp: new Date(),
				},
			});

			// Show notification about policy reload
			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "info",
					title: "Policies Reloaded",
					message: "SnapBack policies have been updated",
					timestamp: new Date(),
				},
			});

			// Notify parent component if needed
			if (onPolicyChange) {
				onPolicyChange();
			}
		} catch (error) {
			console.error("Failed to reload policies:", { error });

			dispatch({
				type: "SET_POLICY_STATUS",
				payload: {
					message: "Policy reload failed",
					timestamp: new Date(),
				},
			});

			dispatch({
				type: "ADD_NOTIFICATION",
				payload: {
					id: generateId(),
					type: "error",
					title: "Policy Reload Failed",
					message: "Failed to reload SnapBack policies",
					timestamp: new Date(),
				},
			});
		}
	};

	const reloadPolicies = debounce(loadAndDispatch, 5000); // 5 second debounce for policy changes

	// Simulate watching for policy file changes
	useEffect(() => {
		// In a real implementation, we would watch actual files
		// For demo, we'll simulate periodic checks

		const startPolicyWatcher = () => {
			if (process.env.NODE_ENV === "test") {
				return;
			}
			policyCheckRef.current = setInterval(() => {
				// Randomly trigger policy reload for demo purposes
				if (Math.random() > 0.7) {
					reloadPolicies();
				}
			}, 10000); // Check every 10 seconds
		};

		// Initial load
		loadAndDispatch().catch((error) => {
			console.error("Initial policy load failed:", { error });
		});

		startPolicyWatcher();

		// Cleanup interval on unmount
		return () => {
			if (policyCheckRef.current) {
				clearInterval(policyCheckRef.current);
			}
		};
	}, []);

	return null; // This component doesn't render anything
}
