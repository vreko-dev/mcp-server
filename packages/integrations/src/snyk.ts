// map Guardian findings → provider format (offline)

export interface SnykFinding {
	id: string;
	title: string;
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	remediation?: string;
	references?: string[];
}

export class SnykIntegration {
	async mapGuardianFindings(findings: any[]): Promise<SnykFinding[]> {
		// Map Guardian findings to Snyk format
		return findings.map((finding) => ({
			id: this.generateId(finding),
			title: this.extractTitle(finding),
			severity: this.mapSeverity(finding.severity),
			description: finding.message || "No description provided",
			remediation: finding.suggestion,
			references: finding.references || [],
		}));
	}

	private generateId(finding: any): string {
		// Generate a deterministic ID for the finding
		return `snapback-${finding.type || "finding"}-${finding.file || "unknown"}-${finding.line || 0}`;
	}

	private extractTitle(finding: any): string {
		if (finding.title) {
			return finding.title;
		}
		if (finding.message) {
			return finding.message.substring(0, 100);
		}
		return "Unknown Finding";
	}

	private mapSeverity(severity: any): "low" | "medium" | "high" | "critical" {
		if (typeof severity === "number") {
			if (severity >= 8) {
				return "critical";
			}
			if (severity >= 6) {
				return "high";
			}
			if (severity >= 4) {
				return "medium";
			}
			return "low";
		}

		if (typeof severity === "string") {
			const lower = severity.toLowerCase();
			if (lower.includes("critical")) {
				return "critical";
			}
			if (lower.includes("high")) {
				return "high";
			}
			if (lower.includes("medium")) {
				return "medium";
			}
			return "low";
		}

		return "low";
	}

	// Offline test fixtures
	static getTestFixtures(): any[] {
		return [
			{
				type: "phantom-dependency",
				file: "package.json",
				severity: 7,
				message: "Phantom dependency detected: lodash",
				suggestion: "Add lodash to dependencies in package.json",
			},
			{
				type: "ai-generated-code",
				file: "src/index.ts",
				severity: 5,
				message: "AI-generated code detected without review",
				suggestion: "Review AI-generated code for security issues",
			},
		];
	}
}
