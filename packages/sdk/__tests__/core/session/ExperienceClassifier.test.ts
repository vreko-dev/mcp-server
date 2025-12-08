/**
 * Tests for ExperienceClassifier - User experience tier classification
 *
 * These tests follow TDD methodology (RED → GREEN → REFACTOR)
 * Testing platform-agnostic experience classification logic.
 */

import { ExperienceClassifier, type IKeyValueStorage } from "@snapback-sdk/core/session/ExperienceClassifier";
import type { ILogger } from "@snapback-sdk/core/session/interfaces";
import { beforeEach, describe, expect, it } from "vitest";

// Mock key-value storage
class MockKeyValueStorage implements IKeyValueStorage {
	private data = new Map<string, unknown>();

	async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
		return (this.data.get(key) as T) ?? defaultValue;
	}

	async set<T>(key: string, value: T): Promise<void> {
		this.data.set(key, value);
	}

	// Test helper
	clear(): void {
		this.data.clear();
	}

	// Test helper
	getAll(): Map<string, unknown> {
		return new Map(this.data);
	}
}

// Mock logger
class MockLogger implements ILogger {
	public debugCalls: Array<{ message: string; data?: unknown }> = [];
	public infoCalls: Array<{ message: string; data?: unknown }> = [];
	public errorCalls: Array<{ message: string; error?: Error; data?: unknown }> = [];

	debug(message: string, data?: unknown): void {
		this.debugCalls.push({ message, data });
	}

	info(message: string, data?: unknown): void {
		this.infoCalls.push({ message, data });
	}

	error(message: string, error?: Error, data?: unknown): void {
		this.errorCalls.push({ message, error, data });
	}
}

describe("ExperienceClassifier", () => {
	let classifier: ExperienceClassifier;
	let storage: MockKeyValueStorage;
	let logger: MockLogger;

	beforeEach(() => {
		storage = new MockKeyValueStorage();
		logger = new MockLogger();
		classifier = new ExperienceClassifier({ storage, logger });
	});

	describe("Tier Classification", () => {
		it("should return 'unknown' for new users with no metrics", async () => {
			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("unknown");
		});

		it("should return 'explorer' when metrics meet explorer threshold", async () => {
			// Set metrics just above explorer threshold
			await storage.set("snapshotsCreated", 5);
			await storage.set("sessionsRecorded", 3);
			await storage.set("protectedFiles", 2);
			await storage.set("manualRestores", 1);
			await storage.set("aiAssistedSessions", 0);
			await storage.set("firstUseTimestamp", Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
			await storage.set("commandsUsed", { cmd1: 3, cmd2: 3 }); // diversity = 2/6 = 0.33

			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("explorer");
		});

		it("should return 'intermediate' when metrics meet intermediate threshold", async () => {
			// Set metrics just above intermediate threshold
			await storage.set("snapshotsCreated", 20);
			await storage.set("sessionsRecorded", 10);
			await storage.set("protectedFiles", 5);
			await storage.set("manualRestores", 5);
			await storage.set("aiAssistedSessions", 2);
			await storage.set("firstUseTimestamp", Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
			await storage.set("commandsUsed", {
				cmd1: 1,
				cmd2: 1,
				cmd3: 1,
				cmd4: 1,
				cmd5: 1,
				cmd6: 1,
				cmd7: 1,
				cmd8: 1,
				cmd9: 1,
				cmd10: 1,
			}); // diversity = 10/10 = 1.0 (well above 0.6)

			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("intermediate");
		});

		it("should return 'power' when metrics meet power threshold", async () => {
			// Set metrics just above power threshold
			await storage.set("snapshotsCreated", 100);
			await storage.set("sessionsRecorded", 50);
			await storage.set("protectedFiles", 20);
			await storage.set("manualRestores", 20);
			await storage.set("aiAssistedSessions", 10);
			await storage.set("firstUseTimestamp", Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
			await storage.set("commandsUsed", {
				cmd1: 1,
				cmd2: 1,
				cmd3: 1,
				cmd4: 1,
				cmd5: 1,
				cmd6: 1,
				cmd7: 1,
				cmd8: 1,
				cmd9: 1,
				cmd10: 1,
				cmd11: 1,
				cmd12: 1,
				cmd13: 1,
				cmd14: 1,
				cmd15: 1,
				cmd16: 1,
				cmd17: 1,
				cmd18: 1,
			}); // diversity = 18/18 = 1.0 (well above 0.9)

			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("power");
		});

		it("should prioritize manually set tier over calculated tier", async () => {
			// Set manual tier
			await classifier.setExperienceTier("power");

			// Set metrics that would make it explorer
			await storage.set("snapshotsCreated", 1);
			await storage.set("sessionsRecorded", 1);

			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("power");
		});

		it("should not prioritize manually set 'unknown' tier", async () => {
			// Set manual tier to unknown
			await classifier.setExperienceTier("unknown");

			// Set metrics that would make it explorer
			await storage.set("snapshotsCreated", 5);
			await storage.set("sessionsRecorded", 3);
			await storage.set("protectedFiles", 2);
			await storage.set("manualRestores", 1);
			await storage.set("firstUseTimestamp", Date.now() - 7 * 24 * 60 * 60 * 1000);
			await storage.set("commandsUsed", { cmd1: 3, cmd2: 3 });

			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("explorer");
		});
	});

	describe("Metrics Retrieval", () => {
		it("should return default metrics for new user", async () => {
			const metrics = await classifier.getExperienceMetrics();
			expect(metrics.snapshotsCreated).toBe(0);
			expect(metrics.sessionsRecorded).toBe(0);
			expect(metrics.protectedFiles).toBe(0);
			expect(metrics.manualRestores).toBe(0);
			expect(metrics.aiAssistedSessions).toBe(0);
			expect(metrics.daysSinceFirstUse).toBe(0);
			expect(metrics.commandDiversity).toBe(0);
		});

		it("should calculate daysSinceFirstUse correctly", async () => {
			const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
			await storage.set("firstUseTimestamp", threeDaysAgo);

			const metrics = await classifier.getExperienceMetrics();
			expect(metrics.daysSinceFirstUse).toBe(3);
		});

		it("should calculate commandDiversity correctly", async () => {
			// 3 unique commands, 12 total uses → diversity = 3/12 = 0.25
			await storage.set("commandsUsed", {
				cmd1: 5,
				cmd2: 4,
				cmd3: 3,
			});

			const metrics = await classifier.getExperienceMetrics();
			expect(metrics.commandDiversity).toBe(0.25);
		});

		it("should cap commandDiversity calculation at 20 total commands", async () => {
			// 10 unique commands, 100 total uses → diversity = 10/20 = 0.5 (capped at 20)
			const commandsUsed: Record<string, number> = {};
			for (let i = 0; i < 10; i++) {
				commandsUsed[`cmd${i}`] = 10;
			}
			await storage.set("commandsUsed", commandsUsed);

			const metrics = await classifier.getExperienceMetrics();
			expect(metrics.commandDiversity).toBe(0.5);
		});
	});

	describe("Metrics Updates", () => {
		it("should update snapshotsCreated metric", async () => {
			await classifier.updateExperienceMetrics("snapshotsCreated", 1);
			const metrics = await classifier.getExperienceMetrics();
			expect(metrics.snapshotsCreated).toBe(1);
		});

		it("should increment existing metric value", async () => {
			await classifier.updateExperienceMetrics("snapshotsCreated", 5);
			await classifier.updateExperienceMetrics("snapshotsCreated", 3);
			const metrics = await classifier.getExperienceMetrics();
			expect(metrics.snapshotsCreated).toBe(8);
		});

		it("should set firstUseTimestamp on first metric update", async () => {
			const before = Date.now();
			await classifier.updateExperienceMetrics("snapshotsCreated", 1);
			const after = Date.now();

			const timestamp = await storage.get<number>("firstUseTimestamp");
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it("should not overwrite existing firstUseTimestamp", async () => {
			const originalTimestamp = Date.now() - 10000;
			await storage.set("firstUseTimestamp", originalTimestamp);

			await classifier.updateExperienceMetrics("snapshotsCreated", 1);

			const timestamp = await storage.get<number>("firstUseTimestamp");
			expect(timestamp).toBe(originalTimestamp);
		});

		it("should log debug message on metric update", async () => {
			await classifier.updateExperienceMetrics("snapshotsCreated", 5);
			expect(logger.debugCalls.length).toBeGreaterThan(0);
			expect(logger.debugCalls[0].message).toContain("Experience metrics updated");
		});
	});

	describe("Command Usage Recording", () => {
		it("should record first command usage", async () => {
			await classifier.recordCommandUsage("snapback.createSnapshot");
			const commandsUsed = await storage.get<Record<string, number>>("commandsUsed");
			expect(commandsUsed?.["snapback.createSnapshot"]).toBe(1);
		});

		it("should increment command usage count", async () => {
			await classifier.recordCommandUsage("snapback.createSnapshot");
			await classifier.recordCommandUsage("snapback.createSnapshot");
			await classifier.recordCommandUsage("snapback.createSnapshot");

			const commandsUsed = await storage.get<Record<string, number>>("commandsUsed");
			expect(commandsUsed?.["snapback.createSnapshot"]).toBe(3);
		});

		it("should track multiple different commands", async () => {
			await classifier.recordCommandUsage("snapback.createSnapshot");
			await classifier.recordCommandUsage("snapback.restoreSnapshot");
			await classifier.recordCommandUsage("snapback.createSnapshot");

			const commandsUsed = await storage.get<Record<string, number>>("commandsUsed");
			expect(commandsUsed?.["snapback.createSnapshot"]).toBe(2);
			expect(commandsUsed?.["snapback.restoreSnapshot"]).toBe(1);
		});

		it("should log debug message on command recording", async () => {
			await classifier.recordCommandUsage("snapback.createSnapshot");
			expect(logger.debugCalls.length).toBeGreaterThan(0);
			expect(logger.debugCalls[0].message).toContain("Command usage recorded");
		});
	});

	describe("Manual Tier Management", () => {
		it("should set experience tier manually", async () => {
			await classifier.setExperienceTier("power");
			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("power");
		});

		it("should reset experience tier", async () => {
			await classifier.setExperienceTier("power");
			await classifier.resetExperienceTier();

			// Should return unknown since no metrics exist
			const tier = await classifier.getExperienceTier();
			expect(tier).toBe("unknown");
		});

		it("should log info message when setting tier", async () => {
			await classifier.setExperienceTier("intermediate");
			expect(logger.infoCalls.length).toBeGreaterThan(0);
			expect(logger.infoCalls[0].message).toContain("Experience tier manually set");
		});

		it("should log info message when resetting tier", async () => {
			await classifier.resetExperienceTier();
			expect(logger.infoCalls.length).toBeGreaterThan(0);
			expect(logger.infoCalls[0].message).toContain("Experience tier reset");
		});
	});

	describe("Tier Descriptions", () => {
		it("should return explorer description for explorer tier", async () => {
			await classifier.setExperienceTier("explorer");
			const description = await classifier.getExperienceTierDescription();
			expect(description).toContain("just getting started");
		});

		it("should return intermediate description for intermediate tier", async () => {
			await classifier.setExperienceTier("intermediate");
			const description = await classifier.getExperienceTierDescription();
			expect(description).toContain("becoming a SnapBack pro");
		});

		it("should return power description for power tier", async () => {
			await classifier.setExperienceTier("power");
			const description = await classifier.getExperienceTierDescription();
			expect(description).toContain("SnapBack expert");
		});

		it("should return unknown description for unknown tier", async () => {
			const description = await classifier.getExperienceTierDescription();
			expect(description).toContain("still learning");
		});
	});

	describe("Custom Thresholds", () => {
		it("should use custom thresholds when provided", async () => {
			const customClassifier = new ExperienceClassifier({
				storage,
				thresholds: {
					explorer: {
						snapshotsCreated: 1,
						sessionsRecorded: 1,
						protectedFiles: 1,
						manualRestores: 0,
						aiAssistedSessions: 0,
						daysSinceFirstUse: 1,
						commandDiversity: 0.1,
					},
					intermediate: {
						snapshotsCreated: 10,
						sessionsRecorded: 5,
						protectedFiles: 3,
						manualRestores: 2,
						aiAssistedSessions: 1,
						daysSinceFirstUse: 10,
						commandDiversity: 0.4,
					},
					power: {
						snapshotsCreated: 50,
						sessionsRecorded: 25,
						protectedFiles: 10,
						manualRestores: 10,
						aiAssistedSessions: 5,
						daysSinceFirstUse: 30,
						commandDiversity: 0.7,
					},
				},
			});

			// Set metrics just above custom explorer threshold
			await storage.set("snapshotsCreated", 1);
			await storage.set("sessionsRecorded", 1);
			await storage.set("protectedFiles", 1);
			await storage.set("manualRestores", 0);
			await storage.set("aiAssistedSessions", 0);
			await storage.set("firstUseTimestamp", Date.now() - 1 * 24 * 60 * 60 * 1000);
			await storage.set("commandsUsed", { cmd1: 10 }); // diversity = 1/10 = 0.1

			const tier = await customClassifier.getExperienceTier();
			expect(tier).toBe("explorer");
		});
	});
});
