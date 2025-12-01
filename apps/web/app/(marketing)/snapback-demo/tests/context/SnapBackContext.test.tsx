import { describe, expect, it } from "vitest";
import { snapBackReducer } from "../../context/SnapBackContext";
import type {
	Notification,
	ProtectedFile,
	ProtectionLevel,
	Snapshot,
} from "../../domain/types";

describe("SnapBackContext", () => {
	describe("snapBackReducer", () => {
		const initialState = {
			currentFileId: null,
			currentFilePath: null,
			currentFileContent: "",
			currentProtectionLevel: "unprotected" as ProtectionLevel,
			snapshots: [] as Snapshot[],
			protectedFiles: [] as ProtectedFile[],
			notifications: [] as Notification[],
			policies: [],
			settings: {
				protectionLevels: {
					defaultLevel: "watch" as ProtectionLevel,
				},
				notifications: {
					showCheckpointCreated: true,
					duration: 3000,
				},
				showAutoCheckpointNotifications: true,
				checkpoint: {
					naming: {
						useGit: true,
						gitTimeout: 5000,
					},
					deletion: {
						autoCleanup: {
							enabled: false,
						},
					},
				},
				aiDetectionEnabled: true,
				checkpointInterval: 300000,
			},
			isAiMonitoringEnabled: true,
			isLoading: false,
			error: null,
			policyStatusMessage: null,
			policyLastUpdated: null,
		};

		it("should handle INITIALIZE action", () => {
			const action = {
				type: "INITIALIZE" as const,
				payload: {
					snapshots: [
						{
							id: "1",
							fileId: "file1",
							content: "test",
							timestamp: new Date(),
							name: "test",
							protectionLevel: "watch",
						},
					],
					protectedFiles: [
						{ id: "1", path: "file1", protectionLevel: "watch" },
					],
				},
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.snapshots).toEqual(action.payload.snapshots);
			expect(newState.protectedFiles).toEqual(action.payload.protectedFiles);
		});

		it("should handle SET_CURRENT_FILE action", () => {
			const action = {
				type: "SET_CURRENT_FILE" as const,
				payload: {
					fileId: "file1",
					filePath: "src/index.ts",
					content: "test content",
				},
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.currentFileId).toBe("file1");
			expect(newState.currentFilePath).toBe("src/index.ts");
			expect(newState.currentFileContent).toBe("test content");
		});

		it("should handle UPDATE_FILE_CONTENT action", () => {
			const action = {
				type: "UPDATE_FILE_CONTENT" as const,
				payload: "new content",
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.currentFileContent).toBe("new content");
		});

		it("should handle SET_PROTECTION_LEVEL action", () => {
			const action = {
				type: "SET_PROTECTION_LEVEL" as const,
				payload: "block" as ProtectionLevel,
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.currentProtectionLevel).toBe("block");
		});

		it("should handle PROTECT_FILE action for new file", () => {
			const action = {
				type: "PROTECT_FILE" as const,
				payload: {
					path: "src/index.ts",
					level: "warn" as ProtectionLevel,
				},
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.protectedFiles).toHaveLength(1);
			expect(newState.protectedFiles[0].path).toBe("src/index.ts");
			expect(newState.protectedFiles[0].protectionLevel).toBe("warn");
		});

		it("should handle PROTECT_FILE action for existing file", () => {
			const initialStateWithFile = {
				...initialState,
				protectedFiles: [
					{ id: "1", path: "src/index.ts", protectionLevel: "watch" },
				],
			};

			const action = {
				type: "PROTECT_FILE" as const,
				payload: {
					path: "src/index.ts",
					level: "block" as ProtectionLevel,
				},
			};

			const newState = snapBackReducer(initialStateWithFile, action);

			expect(newState.protectedFiles).toHaveLength(1);
			expect(newState.protectedFiles[0].protectionLevel).toBe("block");
		});

		it("should handle UNPROTECT_FILE action", () => {
			const initialStateWithFiles = {
				...initialState,
				protectedFiles: [
					{ id: "1", path: "src/index.ts", protectionLevel: "watch" },
					{ id: "2", path: "src/utils.ts", protectionLevel: "warn" },
				],
			};

			const action = {
				type: "UNPROTECT_FILE" as const,
				payload: "src/index.ts",
			};

			const newState = snapBackReducer(initialStateWithFiles, action);

			expect(newState.protectedFiles).toHaveLength(1);
			expect(newState.protectedFiles[0].path).toBe("src/utils.ts");
		});

		it("should handle ADD_SNAPSHOT action", () => {
			const snapshot: Snapshot = {
				id: "1",
				fileId: "file1",
				content: "test",
				timestamp: new Date(),
				name: "test",
				protectionLevel: "watch",
			};

			const action = {
				type: "ADD_SNAPSHOT" as const,
				payload: snapshot,
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.snapshots).toHaveLength(1);
			expect(newState.snapshots[0]).toEqual(snapshot);
		});

		it("should handle ADD_NOTIFICATION action", () => {
			const notification: Notification = {
				id: "1",
				type: "info" as const,
				title: "Test",
				message: "Test message",
				timestamp: new Date(),
			};

			const action = {
				type: "ADD_NOTIFICATION" as const,
				payload: notification,
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.notifications).toHaveLength(1);
			expect(newState.notifications[0]).toEqual(notification);
		});

		it("should handle TOGGLE_AI_MONITORING action", () => {
			const action = {
				type: "TOGGLE_AI_MONITORING" as const,
			};

			const newState = snapBackReducer(initialState, action);

			expect(newState.isAiMonitoringEnabled).toBe(false);

			const newState2 = snapBackReducer(newState, action);
			expect(newState2.isAiMonitoringEnabled).toBe(true);
		});
	});
});
