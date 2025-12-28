/**
 * DynamicConfidenceCalculator
 *
 * Calculates confidence scores using weighted severity scoring.
 * Different layers have different weights based on their impact on code quality.
 *
 * Weight rationale:
 * - Security (0.30 critical): Security issues are most impactful
 * - Syntax (0.25 critical): Broken code is unusable
 * - Types (0.20 critical): Type errors cause runtime failures
 * - Architecture (0.15 critical): Layer violations create tech debt
 * - Tests (0.05 critical): Test issues don't break production
 * - Dependencies (0.03 critical): Usually minor impact
 * - Performance (0.02 critical): Often informational
 *
 * @module validation/DynamicConfidenceCalculator
 */

import type { Issue } from "../types/config.js";
import type { ValidationResult } from "../types/validation.js";

/**
 * Weight configuration for each layer
 */
interface LayerWeight {
	critical: number;
	warning: number;
	info: number;
}

/**
 * Default weights for validation layers
 */
const DEFAULT_WEIGHTS: Record<string, LayerWeight> = {
	// Core code quality
	syntax: { critical: 0.25, warning: 0.05, info: 0.01 },
	types: { critical: 0.2, warning: 0.03, info: 0.01 },
	"typescript-compiler": { critical: 0.2, warning: 0.03, info: 0.01 },

	// Security is paramount
	security: { critical: 0.3, warning: 0.1, info: 0.02 },

	// Architecture matters for maintainability
	architecture: { critical: 0.15, warning: 0.05, info: 0.01 },

	// Test issues are less critical to production
	tests: { critical: 0.05, warning: 0.02, info: 0.005 },

	// Dependencies and performance are informational
	dependencies: { critical: 0.03, warning: 0.01, info: 0.005 },
	performance: { critical: 0.02, warning: 0.01, info: 0.005 },

	// Biome catches style/lint issues - moderate weight
	biome: { critical: 0.1, warning: 0.03, info: 0.01 },
};

/**
 * Default weight for unknown layers
 */
const UNKNOWN_LAYER_WEIGHT: LayerWeight = {
	critical: 0.05,
	warning: 0.02,
	info: 0.01,
};

/**
 * DynamicConfidenceCalculator
 *
 * Calculates confidence using weighted penalties instead of hardcoded thresholds.
 * This provides more nuanced scoring where security issues matter more than style.
 */
export class DynamicConfidenceCalculator {
	private weights: Record<string, LayerWeight>;

	constructor(customWeights?: Record<string, LayerWeight>) {
		this.weights = { ...DEFAULT_WEIGHTS, ...customWeights };
	}

	/**
	 * Calculate confidence score from validation results
	 *
	 * @param layers - Validation results from each layer
	 * @returns Confidence score between 0.10 and 0.95
	 */
	calculate(layers: ValidationResult[]): number {
		if (layers.length === 0) {
			return 0.95; // No validation = assume good (edge case)
		}

		let totalPenalty = 0;

		for (const layer of layers) {
			const layerWeight = this.weights[layer.layer] || UNKNOWN_LAYER_WEIGHT;

			for (const issue of layer.issues) {
				const severityWeight = this.getSeverityWeight(layerWeight, issue.severity);
				totalPenalty += severityWeight;
			}
		}

		// Calculate confidence: start at 1.0, subtract penalties
		const rawConfidence = 1 - totalPenalty;

		// Clamp to [0.10, 0.95]
		return Math.max(0.1, Math.min(0.95, rawConfidence));
	}

	/**
	 * Get weight for a severity level in a layer
	 */
	private getSeverityWeight(layerWeight: LayerWeight, severity: Issue["severity"]): number {
		switch (severity) {
			case "critical":
				return layerWeight.critical;
			case "warning":
				return layerWeight.warning;
			case "info":
				return layerWeight.info;
			default:
				return layerWeight.info;
		}
	}

	/**
	 * Get weight for a specific layer
	 */
	getLayerWeight(layerName: string): LayerWeight {
		return this.weights[layerName] || UNKNOWN_LAYER_WEIGHT;
	}

	/**
	 * Update weights for a layer
	 */
	setLayerWeight(layerName: string, weight: LayerWeight): void {
		this.weights[layerName] = weight;
	}

	/**
	 * Get all configured weights
	 */
	getWeights(): Record<string, LayerWeight> {
		return { ...this.weights };
	}
}

/**
 * Default instance for convenience
 */
export const defaultConfidenceCalculator = new DynamicConfidenceCalculator();
