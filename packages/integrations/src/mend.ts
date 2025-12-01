// map Guardian findings → provider format (offline)

export interface MendFinding {
	vulnerabilityId: string;
	severity: "Low" | "Medium" | "High" | "Critical";
	componentName: string;
	componentVersion: string;
	description: string;
	remediation?: string;
	cvssScore?: number;
}

export class MendIntegration {
	async mapGuardianFindings(findings: any[]): Promise<MendFinding[]> {
		// Map Guardian findings to Mend format
		return findings.map((finding) => ({
			vulnerabilityId: this.generateVulnerabilityId(finding),
			severity: this.mapSeverity(finding.severity),
			componentName: this.extractComponentName(finding),
			componentVersion: this.extractComponentVersion(finding) || "unknown",
			description: finding.message || "No description provided",
			remediation: finding.suggestion,
			cvssScore: this.calculateCvssScore(finding.severity),
		}));
	}

	private generateVulnerabilityId(finding: any): string {
		// Generate a vulnerability ID
		const type = finding.type || "generic";
		const hash = this.simpleHash(finding.message || "");
		return `SNAPBACK-${type.toUpperCase()}-${hash}`;
	}

	private mapSeverity(severity: any): "Low" | "Medium" | "High" | "Critical" {
		if (typeof severity === "number") {
			if (severity >= 9) {
				return "Critical";
			}
			if (severity >= 7) {
				return "High";
			}
			if (severity >= 5) {
				return "Medium";
			}
			return "Low";
		}

		if (typeof severity === "string") {
			const lower = severity.toLowerCase();
			if (lower.includes("critical")) {
				return "Critical";
			}
			if (lower.includes("high")) {
				return "High";
			}
			if (lower.includes("medium")) {
				return "Medium";
			}
			return "Low";
		}

		return "Low";
	}

	private extractComponentName(finding: any): string {
		if (finding.component) {
			return finding.component;
		}
		if (finding.package) {
			return finding.package;
		}
		if (finding.dependency) {
			return finding.dependency;
		}
		return "unknown-component";
	}

	private extractComponentVersion(finding: any): string | null {
		if (finding.version) {
			return finding.version;
		}
		if (finding.componentVersion) {
			return finding.componentVersion;
		}
		return null;
	}

	private calculateCvssScore(severity: any): number {
		if (typeof severity === "number") {
			return Math.min(10, Math.max(0, severity));
		}
		return 5.0; // Default CVSS score
	}

	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(16).substring(0, 8);
	}

	// Offline test fixtures
	static getTestFixtures(): any[] {
		return [
			{
				type: "vulnerable-dependency",
				component: "lodash",
				version: "4.17.10",
				severity: 8,
				message: "Prototype pollution vulnerability in lodash",
				suggestion: "Upgrade to lodash 4.17.19 or later",
			},
			{
				type: "license-violation",
				component: "some-package",
				version: "1.2.3",
				severity: 4,
				message: "GPL license detected in dependency chain",
				suggestion: "Replace with MIT or Apache 2.0 licensed alternative",
			},
		];
	}
}
