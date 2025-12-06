import { beforeEach, describe, expect, it, vi } from "vitest";
import { type DeviceTrialsDependencies, DeviceTrialsService } from "../../services/device-trials";

describe("Device Trials Service", () => {
	let deviceTrialsService: DeviceTrialsService;
	let mockDeps: DeviceTrialsDependencies;

	// Specialized mocks to handle different query chains
	const mockSelectBuilder = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue([]),
	};

	const mockUpdateBuilder = {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
	};

	const mockInsertBuilder = {
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
	};

	const mockDb = {
		select: vi.fn().mockReturnValue(mockSelectBuilder),
		update: vi.fn().mockReturnValue(mockUpdateBuilder),
		insert: vi.fn().mockReturnValue(mockInsertBuilder),
	};

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Reset builder defaults
		mockDb.select.mockReturnValue(mockSelectBuilder);
		mockDb.update.mockReturnValue(mockUpdateBuilder);
		mockDb.insert.mockReturnValue(mockInsertBuilder);

		mockSelectBuilder.from.mockReturnThis();
		mockSelectBuilder.where.mockResolvedValue([]);

		mockUpdateBuilder.set.mockReturnThis();
		mockUpdateBuilder.where.mockReturnThis();
		mockUpdateBuilder.returning.mockResolvedValue([]);

		mockInsertBuilder.values.mockReturnThis();
		mockInsertBuilder.returning.mockResolvedValue([]);

		// Setup mock dependencies
		mockDeps = {
			db: mockDb,
			deviceTrials: {
				deviceFingerprint: "deviceFingerprint",
				installCount: "installCount",
				blockedUntil: "blockedUntil",
				apiKeyId: "apiKeyId",
				id: "id",
			} as any,
			apiKeys: {
				id: "id",
				userId: "userId",
			} as any,
			nanoid: vi.fn().mockReturnValue("test-api-key-123"),
			hash: vi.fn().mockResolvedValue("hashed-key"),
		};

		deviceTrialsService = new DeviceTrialsService(mockDeps);
	});

	it("should create new device trial when none exists", async () => {
		// Mock select returns empty (no exist trial)
		mockSelectBuilder.where.mockResolvedValue([]);

		// Mock insert returns
		mockInsertBuilder.returning
			.mockResolvedValueOnce([{ id: "new_key_id" }]) // API Key insert
			.mockResolvedValueOnce([{ id: "new_trial_id", deviceFingerprint: "device123" }]); // Trial insert

		const result =
			await deviceTrialsService.getOrCreateDeviceTrial("device123");

		// Should create a new trial
		expect(mockDb.insert).toHaveBeenCalledTimes(2);
		expect(result).toHaveProperty("apiKey");
		expect(result).toHaveProperty("trialInfo");
	});

	it("should return existing trial and increment install count", async () => {
		// Mock database to return existing trial
		const existingTrial = {
			id: "trial123",
			deviceFingerprint: "device123",
			installCount: 1,
			apiKeyId: "key123",
			checkpointsUsed: 10,
			checkpointLimit: 50,
			apiCallsUsed: 50,
			apiCallLimit: 100,
			blockedUntil: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const mockKey = { key: "existing-key" };

		// 1. Check existing trial
		mockSelectBuilder.where.mockResolvedValueOnce([existingTrial]);

		// 2. Update trial
		mockUpdateBuilder.returning.mockResolvedValueOnce([existingTrial]);

		// 3. Get API Key (this is a select)
		mockSelectBuilder.where.mockResolvedValueOnce([mockKey]);

		const result =
			await deviceTrialsService.getOrCreateDeviceTrial("device123");

		// Should return existing trial and increment install count
		expect(mockDb.update).toHaveBeenCalled();
		expect(mockUpdateBuilder.set).toHaveBeenCalled();
		expect(result).toHaveProperty("apiKey", "existing-key");
		expect(result).toHaveProperty("trialInfo");
	});

	it("should block device after too many reinstalls", async () => {
		// Mock database to return trial with 3 reinstalls
		const existingTrial = {
			id: "trial123",
			deviceFingerprint: "device123",
			installCount: 3, // Abuse threshold
			apiKeyId: "key123",
			checkpointsUsed: 10,
			checkpointLimit: 50,
			apiCallsUsed: 50,
			apiCallLimit: 100,
			blockedUntil: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		mockSelectBuilder.where.mockResolvedValue([existingTrial]);

		try {
			await deviceTrialsService.getOrCreateDeviceTrial("device123");
		} catch (e) {
			// Expected error
		}

		// Should block the device
		expect(mockDb.update).toHaveBeenCalled();
		// Specifically checking if it set blockedUntil
		expect(mockUpdateBuilder.set).toHaveBeenCalledWith(expect.objectContaining({
			blockedUntil: expect.any(Date),
		}));
	});

	it("should throw error for blocked devices", async () => {
		// Mock database to return trial with recent block
		const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours in future
		const existingTrial = {
			id: "trial123",
			deviceFingerprint: "device123",
			installCount: 3,
			apiKeyId: "key123",
			checkpointsUsed: 10,
			checkpointLimit: 50,
			apiCallsUsed: 50,
			apiCallLimit: 100,
			blockedUntil: futureDate,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		mockSelectBuilder.where.mockResolvedValue([existingTrial]);

		// Should throw an error for blocked device
		await expect(
			deviceTrialsService.getOrCreateDeviceTrial("device123"),
		).rejects.toThrow("Device trial has been blocked due to abuse");
	});

	it("should link device to user", async () => {
		// Mock database to return existing trial
		const existingTrial = {
			id: "trial123",
			deviceFingerprint: "device123",
			installCount: 1,
			apiKeyId: "key123",
			checkpointsUsed: 10,
			checkpointLimit: 50,
			apiCallsUsed: 50,
			apiCallLimit: 100,
			blockedUntil: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			userId: null,
		};

		mockSelectBuilder.where.mockResolvedValue([existingTrial]); // Trial lookup
		mockUpdateBuilder.returning.mockResolvedValue([existingTrial]); // Update result

		await deviceTrialsService.linkDeviceToUser("device123", "user123");

		// Should update the trial and the api key
		expect(mockDb.update).toHaveBeenCalledTimes(2);
	});
});
