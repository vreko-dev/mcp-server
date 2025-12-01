import { minimatch } from "minimatch";
import type { Policy, ProtectionLevel } from "./types.js";

/**
 * Cycles through protection levels in order
 * unprotected → watch → warn → block → unprotected
 */
export function cycleProtectionLevel(
	currentLevel: ProtectionLevel,
): ProtectionLevel {
	const levels: ProtectionLevel[] = ["unprotected", "watch", "warn", "block"];
	const currentIndex = levels.indexOf(currentLevel);

	// Handle case where currentLevel is not found in levels
	if (currentIndex === -1) {
		return "unprotected";
	}

	const nextIndex = (currentIndex + 1) % levels.length;
	const nextLevel = levels[nextIndex];

	// This should never happen due to the modulo operation, but TypeScript needs assurance
	if (nextLevel === undefined) {
		return "unprotected";
	}

	return nextLevel;
}

/**
 * Matches a file path against a protection policy pattern
 */
export function matchPolicy(path: string, policy: Policy): boolean {
	// For ignore policies, we want to exclude matches
	if (policy.type === "ignore") {
		return minimatch(path, policy.pattern);
	}

	// For protected policies, we want to include matches
	return minimatch(path, policy.pattern);
}

/**
 * Determines if a file should be protected based on policies
 */
export function shouldProtectFile(
	path: string,
	policies: Policy[],
): ProtectionLevel | null {
	// Check ignore policies first (they take precedence)
	for (const policy of policies) {
		if (policy.type === "ignore" && matchPolicy(path, policy)) {
			return null; // Don't protect ignored files
		}
	}

	// Check protected policies
	for (const policy of policies) {
		if (policy.type === "protected" && matchPolicy(path, policy)) {
			return policy.protectionLevel;
		}
	}

	return null; // No matching policy
}

/**
 * Gets the badge text for a protection level
 */
export function getProtectionBadgeText(level: ProtectionLevel): string {
	switch (level) {
		case "watch":
			return "W";
		case "warn":
			return "!";
		case "block":
			return "B";
		default:
			return "";
	}
}

/**
 * Gets the badge color for a protection level
 */
export function getProtectionBadgeColor(level: ProtectionLevel): string {
	switch (level) {
		case "watch":
			return "blue";
		case "warn":
			return "yellow";
		case "block":
			return "red";
		default:
			return "gray";
	}
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			func(...args);
		}, delay);
	};
}
