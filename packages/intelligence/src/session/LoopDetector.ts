/**
 * Loop Detector
 *
 * Hybrid loop detection combining structural and semantic analysis.
 *
 * Based on arXiv:2511.10650 research:
 * - Structural: Call stack temporal patterns (F1: 0.08 alone)
 * - Semantic: Cosine similarity of tool args (F1: 0.28 alone)
 * - Hybrid: Combined approach (F1: 0.72, precision: 0.62, recall: 0.86)
 *
 * Thresholds calibrated from research findings.
 */

import type { LoopDetectionResult, SessionState } from "../types/session.js";

/**
 * Loop Detector
 *
 * Detects infinite loops in LLM agent behavior using:
 * 1. Structural analysis - same tool called repeatedly
 * 2. Semantic analysis - similar args (redundant content generation)
 */
export class LoopDetector {
	// Thresholds from research (arXiv:2511.10650)
	private readonly STRUCTURAL_THRESHOLD = 3; // 3+ consecutive same tool = loop
	private readonly SEMANTIC_THRESHOLD = 0.9; // 90% similarity = redundant
	private readonly CONFIDENCE_THRESHOLD_HALT = 0.8; // Halt at 80%+ confidence
	private readonly CONFIDENCE_THRESHOLD_WARN = 0.5; // Warn at 50%+ confidence

	/**
	 * Detect loops in session
	 */
	detect(session: SessionState): LoopDetectionResult {
		// Defensive check (L6256620335)
		if (!session || !session.loopDetection) {
			return {
				detected: false,
				confidence: 0,
				evidence: [],
				action: "continue",
			};
		}

		// Run both detection methods
		const structuralResult = this.detectStructuralLoop(session);
		const semanticResult = this.detectSemanticLoop(session);

		// Combine results
		const detected = structuralResult.detected || semanticResult.detected;
		const type =
			structuralResult.detected && semanticResult.detected
				? "both"
				: structuralResult.detected
					? "structural"
					: semanticResult.detected
						? "semantic"
						: undefined;

		// Combine evidence
		const evidence = [...structuralResult.evidence, ...semanticResult.evidence];

		// Confidence = max of both methods (research shows hybrid is best)
		const confidence = Math.max(structuralResult.confidence, semanticResult.confidence);

		// Determine action
		let action: LoopDetectionResult["action"];
		if (confidence >= this.CONFIDENCE_THRESHOLD_HALT) {
			action = "halt";
		} else if (confidence >= this.CONFIDENCE_THRESHOLD_WARN) {
			action = "warn";
		} else {
			action = "continue";
		}

		return {
			detected,
			type,
			confidence,
			evidence,
			action,
		};
	}

	/**
	 * Structural loop detection
	 * Detects: same tool called 3+ times in sequence
	 */
	private detectStructuralLoop(session: SessionState): {
		detected: boolean;
		confidence: number;
		evidence: string[];
	} {
		const evidence: string[] = [];
		let maxConsecutive = 0;
		let maxTool = "";

		// Check consecutive same-tool calls
		for (const [tool, count] of session.loopDetection.consecutiveSameTool.entries()) {
			if (count > maxConsecutive) {
				maxConsecutive = count;
				maxTool = tool;
			}
		}

		// Check sequence pattern (last 5 calls)
		const sequence = session.loopDetection.sequence;
		if (sequence.length >= 3) {
			// Pattern: A-B-A-B (alternating)
			const isAlternating =
				sequence.length >= 4 &&
				sequence[sequence.length - 1] === sequence[sequence.length - 3] &&
				sequence[sequence.length - 2] === sequence[sequence.length - 4];

			if (isAlternating) {
				evidence.push(`Alternating pattern detected: ${sequence.slice(-4).join(" → ")}`);
			}
		}

		const detected = maxConsecutive >= this.STRUCTURAL_THRESHOLD;

		if (detected) {
			evidence.push(`Tool '${maxTool}' called ${maxConsecutive} times consecutively`);
		}

		// Confidence based on consecutive count
		// Research shows: 3+ consecutive = high confidence structural loop
		const confidence = detected ? Math.min(0.6 + (maxConsecutive - this.STRUCTURAL_THRESHOLD) * 0.1, 1.0) : 0;

		return { detected, confidence, evidence };
	}

	/**
	 * Semantic loop detection
	 * Detects: similar args (cosine similarity > 90%)
	 */
	private detectSemanticLoop(session: SessionState): {
		detected: boolean;
		confidence: number;
		evidence: string[];
	} {
		const evidence: string[] = [];

		// Need at least 2 tool calls to compare
		if (session.toolCalls.length < 2) {
			return { detected: false, confidence: 0, evidence: [] };
		}

		// Get last 5 tool calls for comparison
		const recentCalls = session.toolCalls.slice(-5);

		let maxSimilarity = 0;
		const similarityPairs: Array<[number, number]> = [];

		// Compare each pair
		for (let i = 0; i < recentCalls.length - 1; i++) {
			for (let j = i + 1; j < recentCalls.length; j++) {
				const call1 = recentCalls[i];
				const call2 = recentCalls[j];

				// Only compare same tool
				if (call1.name !== call2.name) {
					continue;
				}

				const similarity = this.calculateArgsSimilarity(call1.args, call2.args);

				if (similarity > maxSimilarity) {
					maxSimilarity = similarity;
				}

				if (similarity >= this.SEMANTIC_THRESHOLD) {
					similarityPairs.push([i, j]);
					evidence.push(
						`Tool '${call1.name}' calls ${i} and ${j} are ${(similarity * 100).toFixed(1)}% similar`,
					);
				}
			}
		}

		const detected = maxSimilarity >= this.SEMANTIC_THRESHOLD;

		// Confidence based on similarity score
		// Research shows: >90% similarity = high confidence semantic loop
		const confidence = detected ? Math.min(0.5 + (maxSimilarity - this.SEMANTIC_THRESHOLD) * 2, 1.0) : 0;

		return { detected, confidence, evidence };
	}

	/**
	 * Calculate similarity between tool arguments
	 * Uses simple string-based similarity (could be enhanced with embeddings)
	 */
	private calculateArgsSimilarity(args1: Record<string, unknown>, args2: Record<string, unknown>): number {
		// Convert args to comparable strings
		const str1 = JSON.stringify(args1, Object.keys(args1).sort());
		const str2 = JSON.stringify(args2, Object.keys(args2).sort());

		// Exact match
		if (str1 === str2) {
			return 1.0;
		}

		// Jaccard similarity (simple but effective)
		const tokens1 = new Set(str1.split(/\W+/));
		const tokens2 = new Set(str2.split(/\W+/));

		const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
		const union = new Set([...tokens1, ...tokens2]);

		return intersection.size / union.size;
	}
}
