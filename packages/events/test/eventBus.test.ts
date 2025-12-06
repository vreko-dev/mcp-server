import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SnapBackEvent, SnapBackEventBus } from "../src/index";

describe("SnapBackEventBus", () => {
	let eventBus: SnapBackEventBus;

	beforeEach(async () => {
		eventBus = new SnapBackEventBus();
		await eventBus.initialize();
	});

	afterEach(() => {
		eventBus.close();
	});

	it("should publish and receive events locally", async () => {
		return new Promise<void>((resolve) => {
			// Listen for event
			eventBus.on(SnapBackEvent.SNAPSHOT_CREATED, (payload) => {
				expect(payload.id).toBe("test-snapshot");
				expect(payload.filePath).toBe("test/file.ts");
				resolve();
			});

			// Publish event
			eventBus.publish(SnapBackEvent.SNAPSHOT_CREATED, {
				id: "test-snapshot",
				filePath: "test/file.ts",
				source: "test",
				timestamp: Date.now(),
			});
		});
	});

	it("should support request/response pattern", async () => {
		// Register request handler
		eventBus.onRequest("get_stats", async (data) => {
			return {
				filePath: data.filePath,
				count: 5,
				level: "medium",
			};
		});

		// Client makes request
		const response = await eventBus.request("get_stats", {
			filePath: "test/file.ts",
		});

		// Verify response
		expect(response.filePath).toBe("test/file.ts");
		expect(response.count).toBe(5);
		expect(response.level).toBe("medium");
	});
});
