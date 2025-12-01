/**
 * ABTest
 * A constructor-based A/B testing harness for validating detection plugin improvements
 *
 * Usage:
 * const abTest = new ABTest(oldImplementation, newImplementation);
 * const results = abTest.run(testData);
 */
export class ABTest<T> {
	private baselineImpl: (data: T) => any;
	private candidateImpl: (data: T) => any;

	/**
	 * Create a new ABTest instance
	 *
	 * @param baselineImpl - The baseline (old) implementation
	 * @param candidateImpl - The candidate (new) implementation
	 */
	constructor(baselineImpl: (data: T) => any, candidateImpl: (data: T) => any) {
		this.baselineImpl = baselineImpl;
		this.candidateImpl = candidateImpl;
	}

	/**
	 * Run the A/B test with the provided test data
	 *
	 * @param testData - Map of test IDs to test data
	 * @returns Comparison results
	 */
	run(testData: Map<string, T>): {
		totalTests: number;
		matches: number;
		mismatchRate: number;
		parity: number;
		details: Array<{
			testId: string;
			baseline: any;
			candidate: any;
			match: boolean;
		}>;
	} {
		const baselineResults = new Map<string, any>();
		const candidateResults = new Map<string, any>();

		// Run both implementations on all test data
		for (const [testId, data] of testData) {
			try {
				const baselineResult = this.baselineImpl(data);
				baselineResults.set(testId, baselineResult);
			} catch (error) {
				console.warn(`Baseline implementation failed for test ${testId}:`, error);
				baselineResults.set(testId, { error: String(error) });
			}

			try {
				const candidateResult = this.candidateImpl(data);
				candidateResults.set(testId, candidateResult);
			} catch (error) {
				console.warn(`Candidate implementation failed for test ${testId}:`, error);
				candidateResults.set(testId, { error: String(error) });
			}
		}

		// Compare results
		const details: Array<{
			testId: string;
			baseline: any;
			candidate: any;
			match: boolean;
		}> = [];

		let matches = 0;
		let totalTests = 0;

		// Compare all baseline results with candidate results
		for (const [testId, baselineResult] of baselineResults) {
			const candidateResult = candidateResults.get(testId);
			totalTests++;

			// Check if results match (same score and factors)
			const match =
				baselineResult &&
				candidateResult &&
				baselineResult.score === candidateResult.score &&
				JSON.stringify(baselineResult.factors?.sort() || []) ===
					JSON.stringify(candidateResult.factors?.sort() || []);

			if (match) {
				matches++;
			}

			details.push({
				testId,
				baseline: baselineResult,
				candidate: candidateResult,
				match,
			});
		}

		// Also check for candidate results that don't have baseline results
		for (const [testId, candidateResult] of candidateResults) {
			if (!baselineResults.has(testId)) {
				totalTests++;
				details.push({
					testId,
					baseline: undefined,
					candidate: candidateResult,
					match: false,
				});
			}
		}

		const mismatchRate = totalTests > 0 ? (totalTests - matches) / totalTests : 0;
		const parity = totalTests > 0 ? matches / totalTests : 1;

		return {
			totalTests,
			matches,
			mismatchRate,
			parity,
			details,
		};
	}

	/**
	 * Check if parity meets the required threshold
	 *
	 * @param testData - Map of test IDs to test data
	 * @param threshold - Required parity threshold (0.999 = 99.9%)
	 * @returns True if parity meets threshold
	 */
	meetsParity(testData: Map<string, T>, threshold = 0.999): boolean {
		const comparison = this.run(testData);
		return comparison.parity >= threshold;
	}
}
