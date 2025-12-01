import { describe, expect, it } from "vitest";
import { createSnapshot } from "../../domain/snapshot.js";
import type { ProtectionLevel } from "../../domain/types.js";

describe("Save Pipeline Matrix", () => {
	describe("protection level × content change × debounce window", () => {
		const testCases = [
			{
				name: "watch level, unchanged content, within debounce",
				level: "watch",
				content: "test content",
				previousContent: "test content",
				withinDebounce: true,
				expectSnapshot: false,
			},
			{
				name: "watch level, changed content, within debounce",
				level: "watch",
				content: "new content",
				previousContent: "test content",
				withinDebounce: true,
				expectSnapshot: false,
			},
			{
				name: "watch level, unchanged content, outside debounce",
				level: "watch",
				content: "test content",
				previousContent: "test content",
				withinDebounce: false,
				expectSnapshot: false,
			},
			{
				name: "watch level, changed content, outside debounce",
				level: "watch",
				content: "new content",
				previousContent: "test content",
				withinDebounce: false,
				expectSnapshot: true,
			},
			{
				name: "warn level, changed content, outside debounce",
				level: "warn",
				content: "new content",
				previousContent: "test content",
				withinDebounce: false,
				expectSnapshot: true,
			},
			{
				name: "block level, changed content, outside debounce",
				level: "block",
				content: "new content",
				previousContent: "test content",
				withinDebounce: false,
				expectSnapshot: true,
			},
		];

		for (const testCase of testCases) {
			it(testCase.name, () => {
				const fileId = "test-file";
				const currentSnapshots =
					testCase.previousContent !== testCase.content
						? [
								{
									id: "previous-snapshot",
									fileId,
									content: testCase.previousContent,
									timestamp: new Date(
										Date.now() - (testCase.withinDebounce ? 1000 : 301000),
									), // 1s vs 5min+1s
									name: "previous",
									protectionLevel: testCase.level as ProtectionLevel,
								},
							]
						: [];

				const snapshot = createSnapshot(
					fileId,
					testCase.content,
					currentSnapshots,
					testCase.level as ProtectionLevel,
					undefined,
					{
						checkpointInterval: 300000, // 5 minutes
						forceCreate: false,
					},
				);

				if (testCase.expectSnapshot) {
					expect(snapshot).not.toBeNull();
					expect(snapshot?.content).toBe(testCase.content);
					expect(snapshot?.protectionLevel).toBe(
						testCase.level as ProtectionLevel,
					);
				} else {
					expect(snapshot).toBeNull();
				}
			});
		}
	});

	describe("manual vs auto snapshots", () => {
		it("should create snapshot regardless of debounce when forced", () => {
			const fileId = "test-file";
			const content = "test content";
			const currentSnapshots = [
				{
					id: "previous-snapshot",
					fileId,
					content,
					timestamp: new Date(Date.now() - 1000), // Just 1 second ago
					name: "previous",
					protectionLevel: "watch" as ProtectionLevel,
				},
			];

			// Try to create snapshot with debounce (should fail)
			const autoSnapshot = createSnapshot(
				fileId,
				`${content} modified`,
				currentSnapshots,
				"watch",
				undefined,
				{
					checkpointInterval: 300000,
				},
			);

			expect(autoSnapshot).toBeNull();

			// Try to create snapshot with force (should succeed)
			const manualSnapshot = createSnapshot(
				fileId,
				`${content} modified`,
				currentSnapshots,
				"watch",
				undefined,
				{
					checkpointInterval: 300000,
					forceCreate: true,
				},
			);

			expect(manualSnapshot).not.toBeNull();
			expect(manualSnapshot?.content).toBe(`${content} modified`);
		});
	});
});
