import { describe, expect, it } from "vitest";

describe("Severity Comparison", () => {
	it("should correctly identify maximum severity", () => {
		const severityLevels: ("low" | "medium" | "high" | "critical")[] = ["low", "medium", "high", "critical"];

		// Test case 1: low, low, critical, low
		let maxSeverity: "low" | "medium" | "high" | "critical" = "low";
		const severities1 = ["low", "low", "critical", "low"];

		for (const severity of severities1) {
			if (severityLevels.indexOf(severity) > severityLevels.indexOf(maxSeverity)) {
				maxSeverity = severity;
			}
		}

		expect(maxSeverity).toBe("critical");

		// Test case 2: medium, high, medium
		maxSeverity = "low";
		const severities2 = ["medium", "high", "medium"];

		for (const severity of severities2) {
			if (severityLevels.indexOf(severity) > severityLevels.indexOf(maxSeverity)) {
				maxSeverity = severity;
			}
		}

		expect(maxSeverity).toBe("high");

		// Test case 3: critical, critical, low
		maxSeverity = "low";
		const severities3 = ["critical", "critical", "low"];

		for (const severity of severities3) {
			if (severityLevels.indexOf(severity) > severityLevels.indexOf(maxSeverity)) {
				maxSeverity = severity;
			}
		}

		expect(maxSeverity).toBe("critical");
	});
});
