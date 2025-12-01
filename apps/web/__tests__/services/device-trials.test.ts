import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceTrialsService } from "../../services/device-trials.js";

// Mock nanoid
vi.mock("@snapback/platform", () => {
	return {
		nanoid: vi.fn().mockReturnValue("test-api-key-123"),
	};
});

// Mock database client
const mockDb = {
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockResolvedValue({}),
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
};

vi.mock("@snapback/platform", () => ({
	db: mockDb,
}));

vi.mock("@snapback/platform", () => ({
	deviceTrials: {
		deviceFingerprint: "deviceFingerprint",
		installCount: "installCount",
		blockedUntil: "blockedUntil",
		apiKeyId: "apiKeyId",
	},
}));

vi.mock("drizzle-orm", () => ({
	eq: vi.fn(),
	sql: {
		template: vi.fn(),
	},
}));

describe("Device Trials Service", () => {
	let deviceTrialsService: DeviceTrialsService;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		deviceTrialsService = new DeviceTrialsService();
	});

	it("should create new device trial when none exists", async () => {
		// Mock database to return empty result (no existing trial)
		mockDb.select.mockResolvedValue([]);

		const result =
			await deviceTrialsService.getOrCreateDeviceTrial("device123");

		// Should create a new trial
		expect(mockDb.insert).toHaveBeenCalled();
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

		mockDb.select.mockResolvedValue([existingTrial]);

		const result =
			await deviceTrialsService.getOrCreateDeviceTrial("device123");

		// Should return existing trial and increment install count
		expect(mockDb.update).toHaveBeenCalled();
		expect(result).toHaveProperty("apiKey");
		expect(result).toHaveProperty("trialInfo");
	});

	it("should block device after too many reinstalls", async () => {
		// Mock database to return trial with 3 reinstalls
		const existingTrial = {
			id: "trial123",
			deviceFingerprint: "device123",
			installCount: 3,
			apiKeyId: "key123",
			checkpointsUsed: 10,
			checkpointLimit: 50,
			apiCallsUsed: 50,
			apiCallLimit: 100,
			blockedUntil: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		mockDb.select.mockResolvedValue([existingTrial]);

		const _result =
			await deviceTrialsService.getOrCreateDeviceTrial("device123");

		// Should block the device
		expect(mockDb.update).toHaveBeenCalled();
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

		mockDb.select.mockResolvedValue([existingTrial]);

		// Should throw an error for blocked device
		await expect(
			deviceTrialsService.getOrCreateDeviceTrial("device123"),
		).rejects.toThrow("Device blocked due to abuse");
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
		};

		mockDb.select.mockResolvedValue([existingTrial]);

		await deviceTrialsService.linkDeviceToUser("device123", "user123");

		// Should update the trial to link to user
		expect(mockDb.update).toHaveBeenCalled();
	});
});
