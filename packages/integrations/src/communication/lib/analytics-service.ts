export interface User {
	id: string;
	properties: Record<string, string>;
}

export interface SegmentRule {
	properties: Record<string, string>;
}

export function isUserInSegment(user: User, rule: SegmentRule): boolean {
	for (const [key, value] of Object.entries(rule.properties)) {
		const userValue = user.properties[key];

		// Handle numeric comparisons
		if (value.startsWith(">")) {
			const threshold = Number.parseInt(value.substring(1), 10);
			const userNum = Number.parseInt(userValue, 10);
			if (Number.isNaN(userNum) || userNum <= threshold) {
				return false;
			}
		} else if (value.startsWith("<")) {
			const threshold = Number.parseInt(value.substring(1), 10);
			const userNum = Number.parseInt(userValue, 10);
			if (Number.isNaN(userNum) || userNum >= threshold) {
				return false;
			}
		} else if (userValue !== value) {
			// Exact match
			return false;
		}
	}

	return true;
}
