export interface Threat {
	pattern: RegExp;
	description: string;
	severity: number;
}

export interface DetectedThreat {
	description: string;
	severity: number;
	match: string;
}

// Core threat detection patterns
const threatPatterns = {
	critical: [
		{ pattern: /rm\s+-rf/i, description: "rm -rf", severity: 1.0 },
		{ pattern: /DROP\s+TABLE/i, description: "DROP TABLE", severity: 1.0 },
	],
	high: [
		{
			pattern: /password\s*[:=]\s*['"]/i,
			description: "hardcoded password",
			severity: 0.8,
		},
		{
			pattern: /api_?key\s*[:=]\s*['"]/i,
			description: "exposed API key",
			severity: 0.8,
		},
	],
};

export function detectThreats(code: string): DetectedThreat[] {
	const threats: DetectedThreat[] = [];

	// Check for critical threats
	for (const threat of threatPatterns.critical) {
		const matches = code.match(threat.pattern);
		if (matches) {
			threats.push({
				description: threat.description,
				severity: threat.severity,
				match: matches[0],
			});
		}
	}

	// Check for high threats
	for (const threat of threatPatterns.high) {
		const matches = code.match(threat.pattern);
		if (matches) {
			threats.push({
				description: threat.description,
				severity: threat.severity,
				match: matches[0],
			});
		}
	}

	return threats;
}

export class ThreatDetector {
	detect(code: string): DetectedThreat[] {
		return detectThreats(code);
	}
}
