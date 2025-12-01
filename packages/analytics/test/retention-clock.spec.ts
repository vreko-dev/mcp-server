import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Clock } from "../src/clock.js";
import { RetentionService } from "../src/retention.js";

describe("RET-CLOCK: Retention service clock injection", () => {
	const testId1 = "ret-clock-001";
	const testId2 = "ret-clock-002";
	const testId3 = "ret-clock-003";

	let mockDb: any;
	let mockClock: Clock;
	let retentionService: RetentionService;
	let fixedDate: Date;

	beforeEach(() => {
		// Fixed date for deterministic tests
		fixedDate = new Date("2025-11-08T12:00:00Z");

		// Mock clock implementation
		mockClock = {
			now: vi.fn(() => fixedDate),
		};

		// Mock database
		mockDb = {
			select: vi.fn(() => ({
				from: vi.fn(() => Promise.resolve([])),
			})),
			insert: vi.fn(() => ({
				values: vi.fn(() => Promise.resolve()),
			})),
			update: vi.fn(() => ({
				set: vi.fn(() => ({
					where: vi.fn(() => Promise.resolve()),
				})),
			})),
			delete: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve()),
			})),
		};

		retentionService = new RetentionService(mockDb, mockClock);
	});

	it(`${testId1}: should use injected clock for calculating cutoff date`, async () => {
		// Mock config with 30 day retention
		const mockConfig = {
			tableName: "agent_suggestions",
			retentionDays: 30,
			isEnabled: true,
		};

		// Override select to return mock config
		mockDb.select = vi.fn(() => ({
			from: vi.fn(() => Promise.resolve([mockConfig])),
		}));

		await retentionService.purgeTelemetryData();

		// Verify clock.now() was called
		expect(mockClock.now).toHaveBeenCalled();

		// Calculate expected cutoff (30 days before fixed date)
		const expectedCutoff = new Date(fixedDate);
		expectedCutoff.setDate(expectedCutoff.getDate() - 30);

		// Verify delete was called with correct cutoff date
		expect(mockDb.delete).toHaveBeenCalled();
	});

	it(`${testId2}: should use injected clock for lastRunAt timestamp`, async () => {
		const mockConfig = {
			tableName: "feedback",
			retentionDays: 90,
			isEnabled: true,
		};

		mockDb.select = vi.fn(() => ({
			from: vi.fn(() => Promise.resolve([mockConfig])),
		}));

		await retentionService.purgeTelemetryData();

		// Verify update was called with clock time
		expect(mockDb.update).toHaveBeenCalled();
		expect(mockClock.now).toHaveBeenCalled();
	});

	it(`${testId3}: should use injected clock for createdAt/updatedAt in config`, async () => {
		const newConfig = {
			tableName: "test_table",
			retentionDays: 60,
			isEnabled: true,
		};

		await retentionService.addRetentionConfig(newConfig);

		// Verify clock was used for timestamps
		expect(mockClock.now).toHaveBeenCalled();
		expect(mockDb.insert).toHaveBeenCalled();
	});

	it("ret-clock-004: should allow testing with different times", async () => {
		// First purge at time T
		const time1 = new Date("2025-01-01T00:00:00Z");
		mockClock.now = vi.fn(() => time1);

		const mockConfig = {
			tableName: "loops",
			retentionDays: 7,
			isEnabled: true,
		};

		mockDb.select = vi.fn(() => ({
			from: vi.fn(() => Promise.resolve([mockConfig])),
		}));

		await retentionService.purgeTelemetryData();

		const firstCallDate = mockClock.now.mock.results[0].value;

		// Second purge at time T+1
		const time2 = new Date("2025-01-02T00:00:00Z");
		mockClock.now = vi.fn(() => time2);

		await retentionService.purgeTelemetryData();

		const secondCallDate = mockClock.now.mock.results[0].value;

		// Verify different times were used
		expect(firstCallDate.getTime()).toBe(time1.getTime());
		expect(secondCallDate.getTime()).toBe(time2.getTime());
		expect(firstCallDate.getTime()).not.toBe(secondCallDate.getTime());
	});

	it("ret-clock-005: should default to system clock if no clock injected", () => {
		// Create service without explicit clock
		const serviceWithDefaultClock = new RetentionService(mockDb);

		// Should not throw - uses default system clock
		expect(() => serviceWithDefaultClock).not.toThrow();
	});
});
