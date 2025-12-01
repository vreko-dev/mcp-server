// map Guardian findings → provider format (offline)

export interface CheckmarxFinding {
	queryId: string;
	severity: "Information" | "Low" | "Medium" | "High";
	description: string;
	fileName: string;
	line: number;
	column: number;
	recommendation?: string;
}

export class CheckmarxIntegration {
	async mapGuardianFindings(findings: any[]): Promise<CheckmarxFinding[]> {
		// Map Guardian findings to Checkmarx format
		return findings.map((finding) => ({
			queryId: this.generateQueryId(finding),
			severity: this.mapSeverity(finding.severity),
			description: finding.message || "No description provided",
			fileName: finding.file || "unknown",
			line: finding.line || 0,
			column: finding.column || 0,
			recommendation: finding.suggestion,
		}));
	}

	private generateQueryId(finding: any): string {
		// Generate a query ID based on the finding type
		const type = finding.type || "generic";
		return `SNAPBACK-${type.toUpperCase()}`;
	}

	private mapSeverity(severity: any): "Information" | "Low" | "Medium" | "High" {
		if (typeof severity === "number") {
			if (severity >= 8) {
				return "High";
			}
			if (severity >= 6) {
				return "Medium";
			}
			if (severity >= 4) {
				return "Low";
			}
			return "Information";
		}

		if (typeof severity === "string") {
			const lower = severity.toLowerCase();
			if (lower.includes("critical") || lower.includes("high")) {
				return "High";
			}
			if (lower.includes("medium")) {
				return "Medium";
			}
			if (lower.includes("low")) {
				return "Low";
			}
			return "Information";
		}

		return "Information";
	}

	// Offline test fixtures
	static getTestFixtures(): any[] {
		return [
			{
				type: "secret-exposure",
				file: "src/config.ts",
				line: 15,
				column: 10,
				severity: 9,
				message: "Hardcoded API key detected",
				suggestion: "Use environment variables or a secrets manager",
			},
			{
				type: "insecure-dependency",
				file: "package.json",
				severity: 6,
				message: "Outdated dependency with known vulnerabilities",
				suggestion: "Update to the latest secure version",
			},
		];
	}
}
