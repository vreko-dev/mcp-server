/**
 * Basic usage example for the SnapBack SDK
 *
 * This demonstrates the improved developer experience with the unified Snapback class
 */

import { Snapback } from "../src/index";

// Example 1: Simple local-only usage (like the issue requested)
async function basicExample() {
	// ✅ ONE import, ONE client, WORKS OUT OF THE BOX
	const snapback = new Snapback({
		storage: "./snapshots.db", // SDK figures it out
		protection: {
			patterns: [{ pattern: "**/*.env", level: "block", enabled: true }],
			defaultLevel: "watch",
			enabled: true,
			autoProtectConfigs: true,
		},
	});

	// Everything just works:
	await snapback.save("file.ts", "content", "My change");
	await snapback.protectFile("config.ts", "warn");
	const snapshots = await snapback.listSnapshots();

	console.log("Created snapshots:", snapshots.length);

	await snapback.close();
}

// Example 2: Simple case is simple
async function simpleApiExample() {
	const snapback = new Snapback({ storage: ":memory:" });

	// ✅ Simple case is simple
	await snapback.save("file.ts", "content", "My change");

	// ✅ Complex case is possible
	await snapback.createSnapshot(
		[
			{ path: "file1.ts", content: "code1", action: "modify" },
			{ path: "file2.ts", content: "code2", action: "modify" },
		],
		{ protected: true },
	);

	await snapback.close();
}

// Example 3: Access to underlying managers for advanced usage
async function advancedExample() {
	const snapback = new Snapback({ storage: ":memory:" });

	// Direct access to managers for advanced operations
	const snapshot = await snapback.snapshots.create([
		{ path: "advanced.ts", content: "advanced code", action: "modify" },
	]);

	console.log("Advanced snapshot created:", snapshot.id);

	await snapback.close();
}

// Run the examples
basicExample().then(() => console.log("Basic example completed"));
simpleApiExample().then(() => console.log("Simple API example completed"));
advancedExample().then(() => console.log("Advanced example completed"));
