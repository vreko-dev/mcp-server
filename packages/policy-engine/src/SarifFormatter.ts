/**
 * SARIF Formatter - Converts detection results to SARIF format
 * SARIF (Static Analysis Results Interchange Format) v2.1.0
 * https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

import type { MockFinding } from "./detectors/MockDetector";
import type { PhantomDependencyFinding } from "./detectors/PhantomDependencyDetector";
import type { SecretFinding } from "./detectors/SecretDetector";
import type { PolicyEngineResult } from "./PolicyEngine";

export interface SarifLog {
	version: "2.1.0";
	$schema: string;
	runs: SarifRun[];
}

export interface SarifRun {
	tool: {
		driver: {
			name: string;
			version: string;
			informationUri?: string;
			rules?: SarifRule[];
		};
	};
	results: SarifResult[];
}

export interface SarifRule {
	id: string;
	name: string;
	shortDescription: {
		text: string;
	};
	fullDescription?: {
		text: string;
	};
	defaultConfiguration?: {
		level: "error" | "warning" | "note";
	};
	helpUri?: string;
}

export interface SarifResult {
	ruleId: string;
	level: "error" | "warning" | "note";
	message: {
		text: string;
	};
	locations?: Array<{
		physicalLocation: {
			artifactLocation: {
				uri: string;
			};
			region?: {
				startLine: number;
				startColumn?: number;
			};
		};
	}>;
	properties?: {
		severity?: string;
		confidence?: number;
		[key: string]: any;
	};
}

export class SarifFormatter {
	private toolName = "SnapBack Guardian";
	private toolVersion = "1.0.0";
	private toolUri = "https://snapback.dev";

	/**
	 * Convert PolicyEngineResult to SARIF format
	 */
	toSarif(result: PolicyEngineResult, analysisSource?: string): SarifLog {
		const rules: SarifRule[] = [];
		const results: SarifResult[] = [];

		// Process each detection event
		for (const event of result.events) {
			// Add rule definitions
			this.addRulesForEvent(event.detector, rules);

			// Convert findings to SARIF results
			for (const finding of event.findings) {
				const sarifResult = this.convertFindingToResult(finding, event.detector, analysisSource);
				if (sarifResult) {
					results.push(sarifResult);
				}
			}
		}

		return {
			version: "2.1.0",
			$schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
			runs: [
				{
					tool: {
						driver: {
							name: this.toolName,
							version: this.toolVersion,
							informationUri: this.toolUri,
							rules: this.deduplicateRules(rules),
						},
					},
					results,
				},
			],
		};
	}

	/**
	 * Add rule definitions based on detector type
	 */
	private addRulesForEvent(detector: string, rules: SarifRule[]): void {
		switch (detector) {
			case "secret":
				rules.push({
					id: "secret-detection/aws-key",
					name: "AWS Access Key Detection",
					shortDescription: {
						text: "Detects AWS access keys in code",
					},
					defaultConfiguration: {
						level: "error",
					},
					helpUri: "https://snapback.dev/docs/detectors/secret-detection",
				});
				rules.push({
					id: "secret-detection/github-token",
					name: "GitHub Token Detection",
					shortDescription: {
						text: "Detects GitHub personal access tokens",
					},
					defaultConfiguration: {
						level: "error",
					},
					helpUri: "https://snapback.dev/docs/detectors/secret-detection",
				});
				rules.push({
					id: "secret-detection/high-entropy-string",
					name: "High Entropy String Detection",
					shortDescription: {
						text: "Detects high-entropy strings that may be secrets",
					},
					defaultConfiguration: {
						level: "warning",
					},
					helpUri: "https://snapback.dev/docs/detectors/secret-detection",
				});
				break;

			case "mock":
				rules.push({
					id: "mock-detection/test-import",
					name: "Test Library Import Detection",
					shortDescription: {
						text: "Detects test library imports in production code",
					},
					defaultConfiguration: {
						level: "warning",
					},
					helpUri: "https://snapback.dev/docs/detectors/mock-detection",
				});
				rules.push({
					id: "mock-detection/mock-pattern",
					name: "Mock Pattern Detection",
					shortDescription: {
						text: "Detects mock/test patterns in production code",
					},
					defaultConfiguration: {
						level: "warning",
					},
					helpUri: "https://snapback.dev/docs/detectors/mock-detection",
				});
				break;

			case "phantom-dependency":
				rules.push({
					id: "phantom-deps/unused-dependency",
					name: "Unused Dependency Detection",
					shortDescription: {
						text: "Detects declared dependencies that are not imported",
					},
					defaultConfiguration: {
						level: "note",
					},
					helpUri: "https://snapback.dev/docs/detectors/phantom-dependency",
				});
				break;
		}
	}

	/**
	 * Convert a finding to SARIF result format
	 */
	private convertFindingToResult(finding: any, detector: string, source?: string): SarifResult | null {
		if (detector === "secret") {
			return this.convertSecretFinding(finding as SecretFinding, source);
		}
		if (detector === "mock") {
			return this.convertMockFinding(finding as MockFinding, source);
		}
		if (detector === "phantom-dependency") {
			return this.convertPhantomDependencyFinding(finding as PhantomDependencyFinding);
		}
		return null;
	}

	/**
	 * Convert secret finding to SARIF result
	 */
	private convertSecretFinding(finding: SecretFinding, source?: string): SarifResult {
		return {
			ruleId: finding.ruleId,
			level: this.mapSeverityToLevel(finding.severity),
			message: {
				text: `${finding.type} detected: ${finding.snippet.substring(0, 50)}...`,
			},
			locations: source
				? [
						{
							physicalLocation: {
								artifactLocation: {
									uri: source,
								},
								region: {
									startLine: finding.line,
									startColumn: finding.column,
								},
							},
						},
					]
				: undefined,
			properties: {
				severity: finding.severity,
				entropy: finding.entropy,
			},
		};
	}

	/**
	 * Convert mock finding to SARIF result
	 */
	private convertMockFinding(finding: MockFinding, source?: string): SarifResult {
		return {
			ruleId: finding.ruleId,
			level: this.mapSeverityToLevel(finding.severity),
			message: {
				text: `${finding.type} detected: ${finding.snippet}`,
			},
			locations: source
				? [
						{
							physicalLocation: {
								artifactLocation: {
									uri: source,
								},
								region: {
									startLine: finding.line,
								},
							},
						},
					]
				: undefined,
			properties: {
				severity: finding.severity,
			},
		};
	}

	/**
	 * Convert phantom dependency finding to SARIF result
	 */
	private convertPhantomDependencyFinding(finding: PhantomDependencyFinding): SarifResult {
		return {
			ruleId: finding.ruleId,
			level: this.mapSeverityToLevel(finding.severity),
			message: {
				text: `Unused dependency '${finding.packageName}' in ${finding.declaredIn}`,
			},
			locations: [
				{
					physicalLocation: {
						artifactLocation: {
							uri: "package.json",
						},
					},
				},
			],
			properties: {
				severity: finding.severity,
				packageName: finding.packageName,
				declaredIn: finding.declaredIn,
			},
		};
	}

	/**
	 * Map internal severity to SARIF level
	 */
	private mapSeverityToLevel(severity: "low" | "medium" | "high" | "critical"): "error" | "warning" | "note" {
		switch (severity) {
			case "critical":
			case "high":
				return "error";
			case "medium":
				return "warning";
			default:
				return "note";
		}
	}

	/**
	 * Deduplicate rules by ID
	 */
	private deduplicateRules(rules: SarifRule[]): SarifRule[] {
		const seen = new Set<string>();
		const deduplicated: SarifRule[] = [];

		for (const rule of rules) {
			if (!seen.has(rule.id)) {
				seen.add(rule.id);
				deduplicated.push(rule);
			}
		}

		return deduplicated;
	}

	/**
	 * Export to SARIF JSON string
	 */
	toJson(result: PolicyEngineResult, analysisSource?: string): string {
		const sarif = this.toSarif(result, analysisSource);
		return JSON.stringify(sarif, null, 2);
	}

	/**
	 * Static method to format PolicyEngineResult to SARIF (matches export API)
	 */
	static format(result: PolicyEngineResult, options: { toolVersion: string; baseUri?: string }): SarifLog {
		const formatter = new SarifFormatter();
		formatter.toolVersion = options.toolVersion;
		return formatter.toSarif(result);
	}

	/**
	 * Static method to convert SARIF log to JSON string (matches export API)
	 */
	static toJSON(log: SarifLog): string {
		return JSON.stringify(log, null, 2);
	}

	/**
	 * Static method to write SARIF log to file (matches export API)
	 */
	static toFile(log: SarifLog, filePath: string): void {
		const fs = require("node:fs");
		fs.writeFileSync(filePath, SarifFormatter.toJSON(log), "utf-8");
	}
}
