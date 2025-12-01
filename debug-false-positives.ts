import { calculateCombinedEntropy } from "./packages/core/src/detection/utils/entropy.js";

function debug() {
	// Test UUID case
	const uuidLine = 'const userId = "550e8400-e29b-41d4-a716-446655440000";';
	console.log("UUID Line:", uuidLine);
	const uuidEntropy = calculateCombinedEntropy(uuidLine);
	console.log("UUID Combined entropy:", uuidEntropy);
	console.log("UUID Character entropy (scaled):", uuidEntropy * 8);

	// Test placeholder case
	const placeholderLine = 'const awsKey = "<YOUR_AWS_KEY>";';
	console.log("\nPlaceholder Line:", placeholderLine);
	const placeholderEntropy = calculateCombinedEntropy(placeholderLine);
	console.log("Placeholder Combined entropy:", placeholderEntropy);
	console.log("Placeholder Character entropy (scaled):", placeholderEntropy * 8);

	// Test what makes them high entropy
	console.log("\nAnalyzing UUID components:");
	const uuid = "550e8400-e29b-41d4-a716-446655440000";
	console.log("Raw UUID:", uuid);
	const rawUuidEntropy = calculateCombinedEntropy(uuid);
	console.log("Raw UUID Combined entropy:", rawUuidEntropy);
	console.log("Raw UUID Character entropy (scaled):", rawUuidEntropy * 8);

	console.log("\nAnalyzing placeholder components:");
	const placeholder = "<YOUR_AWS_KEY>";
	console.log("Raw Placeholder:", placeholder);
	const rawPlaceholderEntropy = calculateCombinedEntropy(placeholder);
	console.log("Raw Placeholder Combined entropy:", rawPlaceholderEntropy);
	console.log("Raw Placeholder Character entropy (scaled):", rawPlaceholderEntropy * 8);
}

debug();
