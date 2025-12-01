"use client";

import React, {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useReducer,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { DEFAULT_SETTINGS } from "../domain/settings";
import type {
	Notification,
	Policy,
	ProtectedFile,
	ProtectionLevel,
	SnapBackSettings,
	Snapshot,
} from "../domain/types";
import { storageManager } from "../lib/idb-fallback";
import { NotificationRepo } from "../persistence/NotificationRepo";
import { PolicyRepo } from "../persistence/PolicyRepo";
import { ProtectionRepo } from "../persistence/ProtectionRepo";
import { SnapshotRepo } from "../persistence/SnapshotRepo";

// Repository instances
const snapshotRepo = new SnapshotRepo();
const protectionRepo = new ProtectionRepo();
const notificationRepo = new NotificationRepo();
const policyRepo = new PolicyRepo();

const generateId = () =>
	crypto?.randomUUID
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2, 11);

// State interface
export interface SnapBackState {
	currentFileId: string | null;
	currentFilePath: string | null;
	currentFileContent: string;
	currentProtectionLevel: ProtectionLevel;
	snapshots: Snapshot[];
	protectedFiles: ProtectedFile[];
	notifications: Notification[];
	policies: Policy[];
	settings: SnapBackSettings;
	isAiMonitoringEnabled: boolean;
	isLoading: boolean;
	error: string | null;
	policyStatusMessage: string | null;
	policyLastUpdated: Date | null;
}

// Action types
export type SnapBackAction =
	| { type: "INITIALIZE"; payload: Partial<SnapBackState> }
	| {
			type: "SET_CURRENT_FILE";
			payload: { fileId: string; filePath: string; content: string };
	  }
	| { type: "UPDATE_FILE_CONTENT"; payload: string }
	| { type: "SET_PROTECTION_LEVEL"; payload: ProtectionLevel }
	| {
			type: "PROTECT_FILE";
			payload: { path: string; level: ProtectionLevel };
	  }
	| { type: "UNPROTECT_FILE"; payload: string }
	| { type: "ADD_SNAPSHOT"; payload: Snapshot }
	| { type: "REMOVE_SNAPSHOT"; payload: string }
	| {
			type: "UPDATE_SNAPSHOT";
			payload: { id: string; data: Partial<Snapshot> };
	  }
	| { type: "SET_SNAPSHOTS"; payload: Snapshot[] }
	| { type: "ADD_NOTIFICATION"; payload: Notification }
	| { type: "REMOVE_NOTIFICATION"; payload: string }
	| { type: "CLEAR_NOTIFICATIONS" }
	| { type: "SET_POLICIES"; payload: Policy[] }
	| { type: "UPDATE_SETTINGS"; payload: Partial<SnapBackSettings> }
	| { type: "TOGGLE_AI_MONITORING" }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| {
			type: "SET_POLICY_STATUS";
			payload: { message: string; timestamp: Date } | null;
	  };

// Initial state
const initialState: SnapBackState = {
	currentFileId: null,
	currentFilePath: null,
	currentFileContent: "",
	currentProtectionLevel: "unprotected",
	snapshots: [],
	protectedFiles: [],
	notifications: [],
	policies: [],
	settings: DEFAULT_SETTINGS,
	isAiMonitoringEnabled: true,
	isLoading: false,
	error: null,
	policyStatusMessage: null,
	policyLastUpdated: null,
};

// Reducer
export function snapBackReducer(
	state: SnapBackState,
	action: SnapBackAction,
): SnapBackState {
	switch (action.type) {
		case "INITIALIZE":
			return { ...state, ...action.payload };

		case "SET_CURRENT_FILE":
			return {
				...state,
				currentFileId: action.payload.fileId,
				currentFilePath: action.payload.filePath,
				currentFileContent: action.payload.content,
				currentProtectionLevel:
					state.protectedFiles.find((f) => f.path === action.payload.filePath)
						?.protectionLevel || "unprotected",
			};

		case "UPDATE_FILE_CONTENT":
			return {
				...state,
				currentFileContent: action.payload,
			};

		case "SET_PROTECTION_LEVEL":
			return {
				...state,
				currentProtectionLevel: action.payload,
			};

		case "PROTECT_FILE": {
			const existing = state.protectedFiles.find(
				(f) => f.path === action.payload.path,
			);

			const record: ProtectedFile = existing
				? { ...existing, protectionLevel: action.payload.level }
				: {
						id: generateId(),
						path: action.payload.path,
						protectionLevel: action.payload.level,
					};

			// Queue save for batch operation (don't await)
			// The actual save will be handled by the debounced callback in the provider
			return {
				...state,
				protectedFiles: existing
					? state.protectedFiles.map((file) =>
							file.path === record.path ? record : file,
						)
					: [...state.protectedFiles, record],
			};
		}

		case "UNPROTECT_FILE":
			// Queue removal for batch operation (don't await)
			// The actual removal will be handled by the debounced callback in the provider
			return {
				...state,
				protectedFiles: state.protectedFiles.filter(
					(f) => f.path !== action.payload,
				),
			};

		case "ADD_SNAPSHOT": {
			const exists = state.snapshots.some(
				(snapshot) => snapshot.id === action.payload.id,
			);
			return {
				...state,
				snapshots: exists
					? state.snapshots
					: [action.payload, ...state.snapshots],
			};
		}

		case "REMOVE_SNAPSHOT":
			return {
				...state,
				snapshots: state.snapshots.filter((s) => s.id !== action.payload),
			};

		case "UPDATE_SNAPSHOT":
			return {
				...state,
				snapshots: state.snapshots.map((snapshot) =>
					snapshot.id === action.payload.id
						? { ...snapshot, ...action.payload.data }
						: snapshot,
				),
			};

		case "SET_SNAPSHOTS":
			return {
				...state,
				snapshots: action.payload,
			};

		case "ADD_NOTIFICATION":
			// Queue creation for batch operation (don't await)
			// The actual creation will be handled by the debounced callback in the provider
			return {
				...state,
				notifications: [action.payload, ...state.notifications],
			};

		case "REMOVE_NOTIFICATION":
			return {
				...state,
				notifications: state.notifications.filter(
					(n) => n.id !== action.payload,
				),
			};

		case "CLEAR_NOTIFICATIONS":
			return {
				...state,
				notifications: [],
			};

		case "SET_POLICIES":
			// Queue save for batch operation (don't await)
			// The actual save will be handled by the debounced callback in the provider
			return {
				...state,
				policies: action.payload,
			};

		case "UPDATE_SETTINGS":
			return {
				...state,
				settings: { ...state.settings, ...action.payload },
			};

		case "TOGGLE_AI_MONITORING":
			return {
				...state,
				isAiMonitoringEnabled: !state.isAiMonitoringEnabled,
			};

		case "SET_LOADING":
			return {
				...state,
				isLoading: action.payload,
			};

		case "SET_ERROR":
			return {
				...state,
				error: action.payload,
			};

		case "SET_POLICY_STATUS":
			if (!action.payload) {
				return {
					...state,
					policyStatusMessage: null,
					policyLastUpdated: null,
				};
			}
			return {
				...state,
				policyStatusMessage: action.payload.message,
				policyLastUpdated: action.payload.timestamp,
			};

		default:
			return state;
	}
}

// Context
interface SnapBackContextType {
	state: SnapBackState;
	dispatch: React.Dispatch<SnapBackAction>;
}

const SnapBackContext = createContext<SnapBackContextType | undefined>(
	undefined,
);

// Provider component
export function SnapBackProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(snapBackReducer, initialState);

	// Debounced batch saves for performance
	const debouncedSaveProtectedFiles = useDebouncedCallback(
		async (files: ProtectedFile[]) => {
			try {
				await protectionRepo.saveMany(files);
			} catch (error) {
				console.error("Failed to save protected files", error);
			}
		},
		1000, // Save after 1s of no changes
	);

	const debouncedSaveNotifications = useDebouncedCallback(
		async (notifications: Notification[]) => {
			try {
				// Save recent notifications (last 50)
				const recentNotifications = notifications.slice(0, 50);
				await notificationRepo.saveMany(recentNotifications);
			} catch (error) {
				console.error("Failed to save notifications", error);
			}
		},
		1000, // Save after 1s of no changes
	);

	const debouncedSavePolicies = useDebouncedCallback(
		async (policies: Policy[]) => {
			try {
				await policyRepo.saveAll(policies);
			} catch (error) {
				console.error("Failed to save policies", error);
			}
		},
		1000, // Save after 1s of no changes
	);

	// Effect to handle batch saves when state changes
	useEffect(() => {
		if (state.protectedFiles.length > 0) {
			debouncedSaveProtectedFiles(state.protectedFiles);
		}
	}, [state.protectedFiles, debouncedSaveProtectedFiles]);

	useEffect(() => {
		if (state.notifications.length > 0) {
			debouncedSaveNotifications(state.notifications);
		}
	}, [state.notifications, debouncedSaveNotifications]);

	useEffect(() => {
		if (state.policies.length > 0) {
			debouncedSavePolicies(state.policies);
		}
	}, [state.policies, debouncedSavePolicies]);

	// Load data from storage on initialization
	useEffect(() => {
		const initialize = async () => {
			dispatch({ type: "SET_LOADING", payload: true });

			try {
				// Check IndexedDB availability
				const isIDBAvailable = await storageManager.initialize();

				// Load data from repositories
				const [snapshots, protectedFiles, notifications, policies] =
					await Promise.all([
						snapshotRepo.getAll(),
						protectionRepo.getAll(),
						notificationRepo.getRecent(50), // Load last 50 notifications
						policyRepo.getAll(),
					]);

				dispatch({
					type: "INITIALIZE",
					payload: {
						snapshots,
						protectedFiles,
						notifications,
						policies,
					},
				});

				if (policies.length > 0) {
					dispatch({
						type: "SET_POLICY_STATUS",
						payload: {
							message: "Policies synced",
							timestamp: new Date(),
						},
					});
				}

				// Show warning if IndexedDB is not available
				if (!isIDBAvailable) {
					dispatch({
						type: "ADD_NOTIFICATION",
						payload: {
							id: "idb-warning",
							type: "warning",
							title: "Storage Warning",
							message:
								"IndexedDB is not available. Data will not be persisted across sessions.",
							timestamp: new Date(),
							duration: 0, // Don't auto-dismiss
						},
					});
				}
			} catch (error) {
				dispatch({
					type: "SET_ERROR",
					payload:
						error instanceof Error ? error.message : "Failed to initialize",
				});
			} finally {
				dispatch({ type: "SET_LOADING", payload: false });
			}
		};

		initialize();
	}, []);

	return (
		<SnapBackContext.Provider value={{ state, dispatch }}>
			{children}
		</SnapBackContext.Provider>
	);
}

// Hook to use the context
export function useSnapBack() {
	const context = useContext(SnapBackContext);

	if (context === undefined) {
		throw new Error("useSnapBack must be used within a SnapBackProvider");
	}

	return context;
}
