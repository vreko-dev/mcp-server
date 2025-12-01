// merge provider criticals into SnapBack block decisions

import type { PolicyDecision } from "./index";

export interface ProviderFinding {
	id: string;
	severity: "low" | "medium" | "high" | "critical";
	message: string;
	file?: string;
	line?: number;
}

export interface ProviderGateConfig {
	snyk?: {
		enabled: boolean;
		blockOnCritical: boolean;
	};
	checkmarx?: {
		enabled: boolean;
		blockOnHigh: boolean;
	};
	mend?: {
		enabled: boolean;
		blockOnCritical: boolean;
	};
}

export class ProviderGate {
	private config: ProviderGateConfig;

	constructor(config: ProviderGateConfig) {
		this.config = config;
	}

	mergeProviderDecisions(snapbackDecision: PolicyDecision, providerFindings: ProviderFinding[]): PolicyDecision {
		// If SnapBack already decided to block, respect that decision
		if (snapbackDecision.action === "block") {
			return snapbackDecision;
		}

		// Check provider findings against gate configuration
		const shouldBlock = this.shouldBlockBasedOnProviders(providerFindings);

		if (shouldBlock) {
			return {
				action: "block",
				reason: [snapbackDecision.reason, "External security provider detected critical issues"].join(", "),
				rules_hit: [...(snapbackDecision.rules_hit || []), "provider_gate:critical_findings"],
				confidence: snapbackDecision.confidence,
				policyVersion: snapbackDecision.policyVersion,
				etag: snapbackDecision.etag,
				details: snapbackDecision.details,
			};
		}

		// If providers don't require blocking, return original decision
		return snapbackDecision;
	}

	private shouldBlockBasedOnProviders(findings: ProviderFinding[]): boolean {
		for (const finding of findings) {
			// Check Snyk configuration
			if (this.config.snyk?.enabled && this.config.snyk?.blockOnCritical) {
				if (finding.severity === "critical") {
					return true;
				}
			}

			// Check Checkmarx configuration
			if (this.config.checkmarx?.enabled && this.config.checkmarx?.blockOnHigh) {
				if (finding.severity === "high" || finding.severity === "critical") {
					return true;
				}
			}

			// Check Mend configuration
			if (this.config.mend?.enabled && this.config.mend?.blockOnCritical) {
				if (finding.severity === "critical") {
					return true;
				}
			}
		}

		return false;
	}

	// Static method for offline testing
	static createTestGate(): ProviderGate {
		return new ProviderGate({
			snyk: {
				enabled: true,
				blockOnCritical: true,
			},
			checkmarx: {
				enabled: true,
				blockOnHigh: true,
			},
			mend: {
				enabled: true,
				blockOnCritical: true,
			},
		});
	}
}
