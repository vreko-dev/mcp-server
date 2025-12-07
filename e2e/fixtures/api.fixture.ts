import type { APIRequestContext } from "@playwright/test";

export class ApiFixture {
	constructor(_request: APIRequestContext) {}

	async seedSnapshots(count: number) {
		// Mock implementation or real API call
		console.log(`Seeding ${count} snapshots`);
		// await this.request.post('/api/test/seed/snapshots', { data: { count } });
	}

	async seedRestores(count: number) {
		console.log(`Seeding ${count} restores`);
	}

	async seedAIDetections(detections: Array<{ tool: string; count: number }>) {
		console.log("Seeding AI detections", detections);
	}

	async seedActivityEvents(events: Array<{ type: string; timestamp: number }>) {
		console.log("Seeding activity events", events);
	}
}

export const createApiFixture = (request: APIRequestContext) => new ApiFixture(request);
