/**
 * Calculate Shannon entropy: -Σ(p(x) * log2(p(x)))
 * High entropy (>4.5) indicates randomness
 *
 * @param str - String to calculate entropy for
 * @returns Entropy value between 0-8 (theoretical max for byte entropy)
 */
export function calculateEntropy(str: string): number {
	// Handle empty string
	if (!str || str.length === 0) {
		return 0;
	}

	// Use Map for frequency counting
	const frequencyMap = new Map<string, number>();

	// Count character frequencies
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		frequencyMap.set(char, (frequencyMap.get(char) || 0) + 1);
	}

	// Calculate entropy
	let entropy = 0;
	const len = str.length;

	for (const [_, frequency] of frequencyMap) {
		const probability = frequency / len;
		entropy -= probability * Math.log2(probability);
	}

	// Cap at theoretical maximum (8 for byte entropy)
	return Math.min(entropy, 8);
}

/**
 * Calculate bigram entropy for better detection of structured randomness
 *
 * @param str - String to calculate bigram entropy for
 * @returns Bigram entropy value
 */
export function calculateBigramEntropy(str: string): number {
	// Handle strings too short for bigram analysis
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

/**
 * Combined entropy score using both character and bigram entropy
 *
 * @param str - String to calculate combined entropy for
 * @returns Combined entropy score between 0-1
 */
export function calculateCombinedEntropy(str: string): number {
	const charEntropy = calculateEntropy(str);
	const bigramEntropy = calculateBigramEntropy(str);

	// Normalize both entropies to 0-1 range
	const normalizedCharEntropy = charEntropy / 8; // Character entropy max is 8
	const normalizedBigramEntropy = bigramEntropy / 8; // Approximate max for bigram entropy

	// Weighted combination (70% character, 30% bigram)
	const combined = 0.7 * normalizedCharEntropy + 0.3 * normalizedBigramEntropy;

	return Math.min(combined, 1.0);
}
