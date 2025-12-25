// Example of using the Snapback SDK
// This demonstrates the convenience wrapper approach

import { Snapback } from "@snapback/sdk";

// Initialize the SDK with your API key
const client = new Snapback({
	cloud: {
		baseUrl: "https://api.snapback.dev",
		apiKey: "sk_live_your_api_key_here",
	},
});

// Create a snapshot using the SDK
async function createSnapshot() {
	try {
		const snapshot = await client.createSnapshot(
			[
				{
					path: "src/index.js",
					content: 'console.log("Hello World");',
				},
			],
			{
				description: "Initial commit",
			},
		);

		console.log("Snapshot created:", snapshot.id);
		return snapshot;
	} catch (error) {
		console.error("Failed to create snapshot:", error);
	}
}

// List snapshots using the SDK
async function listSnapshots() {
	try {
		const snapshots = await client.listSnapshots();
		console.log("Snapshots:", snapshots);
		return snapshots;
	} catch (error) {
		console.error("Failed to list snapshots:", error);
	}
}

// Get analytics using the SDK
async function getAnalytics() {
	try {
		const metrics = await client.getAnalyticsMetrics();
		console.log("Analytics:", metrics);
		return metrics;
	} catch (error) {
		console.error("Failed to get analytics:", error);
	}
}

// Example usage
async function main() {
	await createSnapshot();
	await listSnapshots();
	await getAnalytics();
}

main();
