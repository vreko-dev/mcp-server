import type { Policy, ProtectionLevel } from "./types.js";

/**
 * Parses policy files like .snapbackprotected, .snapbackignore, .snapbackrc
 * Accepts both "pattern" and "@level pattern" syntax
 */
export function parsePolicyFile(content: string): Policy[] {
	const lines = content.split("\n");
	const policies: Policy[] = [];

	for (const line of lines) {
		const raw = line.trim();

		// Skip empty lines and comments
		if (!raw || raw.startsWith("#")) {
			continue;
		}

		// Parse "@level pattern" or "pattern" syntax
		let level: "watch" | "warn" | "block" = "watch";
		let pattern = raw;

		const m = raw.match(/^@(watch|warn|block)\s+(.+)$/i);
		if (m?.[1] && m[2]) {
			level = m[1].toLowerCase() as typeof level;
			pattern = m[2].trim();
		}

		policies.push({
			pattern,
			protectionLevel: level,
			type: "protected",
		});
	}

	return policies;
}

/**
 * Parses .snapbackignore file
 */
export function parseIgnoreFile(content: string): Policy[] {
	const lines = content.split("\n");
	const policies: Policy[] = [];

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith("#")) {
			continue;
		}

		policies.push({
			pattern: trimmedLine,
			protectionLevel: "unprotected", // Not used for ignore policies
			type: "ignore",
		});
	}

	return policies;
}

/**
 * Combines multiple policy sources
 */
export function combinePolicies(...policySets: Policy[][]): Policy[] {
	// Flatten all policy sets
	const allPolicies = policySets.flat();

	// Process in order, with later policies overriding earlier ones
	const combined: Policy[] = [];

	for (const policy of allPolicies) {
		// Check if we already have a policy for this pattern
		const existingIndex = combined.findIndex(
			(p) => p.pattern === policy.pattern,
		);

		if (existingIndex >= 0) {
			// Replace existing policy
			combined[existingIndex] = policy;
		} else {
			// Add new policy
			combined.push(policy);
		}
	}

	return combined;
}

/**
 * Parses `.snapbackrc` YAML-like configuration.
 * We only support the subset used in marketing demos:
 *   - hats.{critical|protected|watched}: array of glob patterns
 *   - rules: [{ pattern, hat }]
 */
export function parseSnapbackRc(content: string): Policy[] {
	const lines = content.split("\n");
	const policies: Policy[] = [];

	let inHatsSection = false;
	let inRulesSection = false;
	let currentHat: "critical" | "protected" | "watched" | null = null;
	let pendingRule: {
		pattern?: string;
		hat?: "critical" | "protected" | "watched";
	} | null = null;

	const pushPolicy = (
		pattern: string,
		hat: "critical" | "protected" | "watched",
	) => {
		const protectionLevel = hatToProtectionLevel(hat);
		if (!pattern || !protectionLevel) {
			return;
		}

		policies.push({
			pattern,
			protectionLevel,
			type: "protected",
		});
	};

	const normalizePattern = (pattern: string): string => {
		let trimmed = pattern.trim();
		if (trimmed.startsWith("-")) {
			trimmed = trimmed.slice(1).trim();
		}

		// Strip surrounding quotes if present
		if (
			(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'"))
		) {
			trimmed = trimmed.slice(1, -1);
		}

		return trimmed;
	};

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) {
			continue;
		}

		if (line === "hats:") {
			inHatsSection = true;
			inRulesSection = false;
			currentHat = null;
			continue;
		}

		if (line === "rules:") {
			inHatsSection = false;
			inRulesSection = true;
			currentHat = null;
			continue;
		}

		if (inHatsSection) {
			if (!line.startsWith("-") && line.endsWith(":")) {
				const sectionHat = line.slice(0, -1).trim().toLowerCase();
				if (
					sectionHat === "critical" ||
					sectionHat === "protected" ||
					sectionHat === "watched"
				) {
					currentHat = sectionHat;
				} else {
					currentHat = null;
				}
				continue;
			}

			if (currentHat && line.startsWith("-")) {
				const pattern = normalizePattern(line);
				if (pattern) {
					pushPolicy(pattern, currentHat);
				}
			}
			continue;
		}

		if (inRulesSection) {
			if (line.startsWith("-")) {
				// Finalise previous rule
				if (pendingRule?.pattern) {
					pushPolicy(pendingRule.pattern, pendingRule.hat ?? "watched");
				}

				pendingRule = { hat: "watched" };

				const inline = normalizePattern(line);
				if (inline.toLowerCase().startsWith("pattern:")) {
					const patternValue = normalizePattern(
						inline.replace(/pattern:/i, "").trim(),
					);
					if (patternValue) {
						pendingRule.pattern = patternValue;
					}
				} else if (inline.toLowerCase().startsWith("hat:")) {
					const hatValue = normalizePattern(
						inline.replace(/hat:/i, "").trim(),
					).toLowerCase();
					if (
						hatValue === "critical" ||
						hatValue === "protected" ||
						hatValue === "watched"
					) {
						pendingRule.hat = hatValue;
					}
				}

				continue;
			}

			if (!pendingRule) {
				pendingRule = { hat: "watched" };
			}

			const lower = line.toLowerCase();
			if (lower.startsWith("pattern:")) {
				const patternValue = normalizePattern(
					line.replace(/pattern:/i, "").trim(),
				);
				if (patternValue) {
					pendingRule.pattern = patternValue;
				}
				continue;
			}

			if (lower.startsWith("hat:")) {
				const hatValue = normalizePattern(
					line.replace(/hat:/i, "").trim(),
				).toLowerCase();
				if (
					hatValue === "critical" ||
					hatValue === "protected" ||
					hatValue === "watched"
				) {
					pendingRule.hat = hatValue;
				}
			}
		}
	}

	if (pendingRule?.pattern) {
		pushPolicy(pendingRule.pattern, pendingRule.hat ?? "watched");
	}

	return policies;
}

function hatToProtectionLevel(
	hat: "critical" | "protected" | "watched",
): ProtectionLevel | null {
	switch (hat) {
		case "critical":
			return "block";
		case "protected":
			return "warn";
		case "watched":
			return "watch";
		default:
			return null;
	}
}
