/**
 * Policy Engine - Orchestrates detectors and enforces policies
 * Provides watch/warn/block actions based on detection results
 */

import { type MockDetectionResult, MockDetector } from "./detectors/MockDetector.js";
import { PhantomDependencyDetector, type PhantomDependencyResult } from "./detectors/PhantomDependencyDetector.js";
import { type SecretDetectionResult, SecretDetector } from "./detectors/SecretDetector.js";

export type PolicyAction = "watch" | "warn" | "block";

export interface PolicyRule {
	id: string;
	name: string;
	detector: "secret" | "mock" | "phantom-dependency";
	action: PolicyAction;
	severity?: "low" | "medium" | "high" | "critical";
	enabled: boolean;
}

export interface PolicyEngineConfig {
	rules: PolicyRule[];
	defaultAction?: PolicyAction;
}

export interface DetectionEvent {
	ruleId: string;
	detector: string;
	action: PolicyAction;
	findings: any[];
	riskScore: number;
	timestamp: string;
}

export interface PolicyEngineResult {
	action: PolicyAction;
	events: DetectionEvent[];
	summary: {
		totalFindings: number;
		byDetector: Record<string, number>;
		highestAction: PolicyAction;
	};
}

/**
 * Default policy rules configuration
 */
const DEFAULT_RULES: PolicyRule[] = [
	{
		id: "secret-detection-critical",
		name: "Critical Secret Detection",
		detector: "secret",
		action: "block",
		severity: "critical",
		enabled: true,
	},
	{
		id: "secret-detection-high",
		name: "High Severity Secret Detection",
		detector: "secret",
		action: "warn",
		severity: "high",
		enabled: true,
	},
	{
		id: "mock-detection",
		name: "Mock/Test Leakage Detection",
		detector: "mock",
		action: "warn",
		enabled: true,
	},
	{
		id: "phantom-dependency",
		name: "Phantom Dependency Detection",
		detector: "phantom-dependency",
		action: "watch",
		enabled: true,
	},
];

export class PolicyEngine {
	private secretDetector: SecretDetector;
	private mockDetector: MockDetector;
	private phantomDependencyDetector: PhantomDependencyDetector;
	private config: PolicyEngineConfig;

	constructor(config?: Partial<PolicyEngineConfig>) {
		this.secretDetector = new SecretDetector();
		this.mockDetector = new MockDetector();
		this.phantomDependencyDetector = new PhantomDependencyDetector();

		this.config = {
			// Deep copy DEFAULT_RULES to avoid mutation across instances
			rules: config?.rules || DEFAULT_RULES.map((rule) => ({ ...rule })),
			defaultAction: config?.defaultAction || "watch",
		};
	}

	/**
	 * Run all enabled detectors on a file
	 */
	async analyzeFile(filePath: string, content: string): Promise<PolicyEngineResult> {
		const events: DetectionEvent[] = [];
		let totalFindings = 0;
		const byDetector: Record<string, number> = {};

		// Run secret detection
		if (this.isDetectorEnabled("secret")) {
			const result = this.secretDetector.detect(content, filePath);
			const action = this.determineAction("secret", result);

			if (result.findings.length > 0) {
				events.push({
					ruleId: "secret-detection",
					detector: "secret",
					action,
					findings: result.findings,
					riskScore: result.riskScore,
					timestamp: new Date().toISOString(),
				});

				totalFindings += result.findings.length;
				byDetector.secret = result.findings.length;
			}
		}

		// Run mock detection
		if (this.isDetectorEnabled("mock")) {
			const result = this.mockDetector.detect(content, filePath);
			const action = this.determineAction("mock", result);

			if (result.findings.length > 0) {
				events.push({
					ruleId: "mock-detection",
					detector: "mock",
					action,
					findings: result.findings,
					riskScore: result.riskScore,
					timestamp: new Date().toISOString(),
				});

				totalFindings += result.findings.length;
				byDetector.mock = result.findings.length;
			}
		}

		// Determine highest action
		const highestAction = this.getHighestAction(events.map((e) => e.action));

		return {
			action: highestAction,
			events,
			summary: {
				totalFindings,
				byDetector,
				highestAction,
			},
		};
	}

	/**
	 * Analyze package.json for phantom dependencies
	 */
	async analyzePackageJson(
		packageJsonContent: string,
		codebaseFiles: Array<{ path: string; content: string }>,
	): Promise<PolicyEngineResult> {
		const events: DetectionEvent[] = [];

		if (this.isDetectorEnabled("phantom-dependency")) {
			const result = await this.phantomDependencyDetector.detect(packageJsonContent, codebaseFiles);
			const action = this.determineAction("phantom-dependency", result);

			if (result.findings.length > 0) {
				events.push({
					ruleId: "phantom-dependency",
					detector: "phantom-dependency",
					action,
					findings: result.findings,
					riskScore: result.riskScore,
					timestamp: new Date().toISOString(),
				});
			}
		}

		const highestAction = this.getHighestAction(events.map((e) => e.action));

		return {
			action: highestAction,
			events,
			summary: {
				totalFindings: events.reduce((sum, e) => sum + e.findings.length, 0),
				byDetector: events.reduce((acc, e) => ({ ...acc, [e.detector]: e.findings.length }), {}),
				highestAction,
			},
		};
	}

	/**
	 * Check if a detector is enabled in the policy
	 */
	private isDetectorEnabled(detector: "secret" | "mock" | "phantom-dependency"): boolean {
		return this.config.rules.some((rule) => rule.detector === detector && rule.enabled);
	}

	/**
	 * Determine action based on detection results and configured rules
	 */
	private determineAction(
		detector: "secret" | "mock" | "phantom-dependency",
		result: SecretDetectionResult | MockDetectionResult | PhantomDependencyResult,
	): PolicyAction {
		// Find the most severe matching rule
		let highestAction: PolicyAction = this.config.defaultAction || "watch";

		for (const rule of this.config.rules) {
			if (rule.detector !== detector || !rule.enabled) {
				continue;
			}

			// For secret detection, check severity
			if (detector === "secret" && rule.severity) {
				const secretResult = result as SecretDetectionResult;
				const hasSeverity = secretResult.findings.some((f) => f.severity === rule.severity);
				if (hasSeverity) {
					highestAction = this.getHigherAction(highestAction, rule.action);
				}
			} else {
				// For other detectors, apply rule action if there are findings
				if (result.findings.length > 0) {
					highestAction = this.getHigherAction(highestAction, rule.action);
				}
			}
		}

		return highestAction;
	}

	/**
	 * Get the higher priority action
	 */
	private getHigherAction(current: PolicyAction, candidate: PolicyAction): PolicyAction {
		const priority: Record<PolicyAction, number> = {
			watch: 1,
			warn: 2,
			block: 3,
		};

		return priority[candidate] > priority[current] ? candidate : current;
	}

	/**
	 * Get the highest action from a list
	 */
	private getHighestAction(actions: PolicyAction[]): PolicyAction {
		if (actions.length === 0) {
			return this.config.defaultAction || "watch";
		}

		return actions.reduce((highest, current) => this.getHigherAction(highest, current), "watch" as PolicyAction);
	}

	/**
	 * Update policy configuration
	 */
	updateConfig(config: Partial<PolicyEngineConfig>): void {
		if (config.rules) {
			this.config.rules = config.rules;
		}
		if (config.defaultAction) {
			this.config.defaultAction = config.defaultAction;
		}
	}

	/**
	 * Get current policy configuration
	 */
	getConfig(): PolicyEngineConfig {
		return { ...this.config };
	}

	/**
	 * Enable a specific rule
	 */
	enableRule(ruleId: string): void {
		const rule = this.config.rules.find((r) => r.id === ruleId);
		if (rule) {
			rule.enabled = true;
		}
	}

	/**
	 * Disable a specific rule
	 */
	disableRule(ruleId: string): void {
		const rule = this.config.rules.find((r) => r.id === ruleId);
		if (rule) {
			rule.enabled = false;
		}
	}
}
