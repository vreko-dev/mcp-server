import { calculateEntropy } from "./packages/core/src/detection/utils/entropy";

// Test different types of strings to understand entropy behavior
const testStrings = [
	// Low entropy - structured text
	"const apiKey = 'abc123';",
	"function getData() { return data; }",
	"const user = { name: 'John', age: 30 };",

	// Medium entropy - mixed text
	"const token = 'a1b2c3d4e5f6';",
	"const hash = 'x9y8z7w6v5u4t3s2r1';",

	// High entropy - random strings (potential secrets)
	"const secret = 'xKj83mNp9qR2sL7tU4vY1zW6';",
	"const key = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';",
	"sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",

	// Very high entropy - completely random
	"xKj83mNp9qR2sL7tU4vY1zW6a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",

	// Edge cases
	"",
	"a",
	"aaaaaaa",
	"abcdefghijklmnopqrstuvwxyz",
];

console.log("String Entropy Analysis:");
console.log("======================");

for (const str of testStrings) {
	const entropy = calculateEntropy(str);
	console.log(`"${str}" -> Entropy: ${entropy.toFixed(4)}`);
}

// Test n-gram entropy concept
function calculateBigramEntropy(str: string) {
	if (!str || str.length < 2) {
		return 0;
	}

	// Count bigram frequencies
	const bigramMap = new Map<string, number>();
	for (let i = 0; i < str.length - 1; i++) {
		const bigram = str.substring(i, i + 2);
		bigramMap.set(bigram, (bigramMap.get(bigram) || 0) + 1);
	}

	// Calculate entropy
	let entropy = 0;
	const len = str.length - 1;

	for (const [_, frequency] of bigramMap) {
		const probability = frequency / len;
		entropy -= probability * Math.log2(probability);
	}

	return entropy;
}

console.log("\nBigram Entropy Analysis:");
console.log("=======================");

for (const str of testStrings) {
	const bigramEntropy = calculateBigramEntropy(str);
	const charEntropy = calculateEntropy(str);
	console.log(`"${str}" -> Char: ${charEntropy.toFixed(4)}, Bigram: ${bigramEntropy.toFixed(4)}`);
}

// Test logarithmic scaling for match counts
function logarithmicScaling(count: number, baseWeight = 1.0) {
	if (count === 0) {
		return 0;
	}
	// Using log base 10, scaled and capped at baseWeight
	return Math.min(baseWeight, baseWeight * Math.log10(count + 1));
}

console.log("\nLogarithmic Scaling Analysis:");
console.log("============================");

const matchCounts = [0, 1, 2, 3, 5, 10, 20, 50, 100, 1000];
for (const count of matchCounts) {
	const linear = Math.min(1.0, 0.8 * count); // Current linear approach
	const logarithmic = logarithmicScaling(count, 0.8); // Proposed logarithmic approach
	console.log(`Matches: ${count} -> Linear: ${linear.toFixed(4)}, Logarithmic: ${logarithmic.toFixed(4)}`);
}
