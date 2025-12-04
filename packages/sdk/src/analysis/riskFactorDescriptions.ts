/**
 * Risk Factor Descriptions and Transformations
 *
 * Centralized mappings for converting risk factor identifiers to human-readable
 * descriptions across all SnapBack platforms (VSCode, CLI, Web, API).
 *
 * This ensures consistent risk communication and simplifies integration for clients.
 */

/**
 * Mapping of risk factor identifiers to detailed descriptions
 * Used to transform raw factor strings into user-friendly explanations
 */
export const RISK_FACTOR_DESCRIPTIONS: Record<string, string> = {
	"eval execution": "Dynamic code execution detected - eval() allows runtime code execution",
	"sql injection": "SQL injection vulnerability pattern - concatenated user input in queries",
	"command execution": "Dangerous shell command usage - potential OS command injection",
	"hardcoded secret": "Potential secret/credential found in code - API keys, tokens exposed",
	"auth bypass": "Authentication bypass pattern - insufficient access control checks",
	"path traversal": "Directory traversal vulnerability - unrestricted path access",
	"xss pattern": "Cross-site scripting vulnerability - unsanitized user input in DOM",
	deserialization: "Unsafe deserialization detected - potential object injection",
	cryptography: "Weak cryptography usage - deprecated algorithms or insufficient key length",
	"dependency change": "Dependency version change - verify no breaking changes or vulnerabilities",
};

/**
 * Transform raw risk factor identifiers into human-readable descriptions
 *
 * This is the canonical method for converting risk factor strings to descriptions
 * across all SnapBack platforms. Use this instead of custom implementations.
 *
 * @param factors - Array of raw risk factor identifiers
 * @returns Array of human-readable risk factor descriptions
 *
 * @example
 * ```typescript
 * import { describeRiskFactors } from '@snapback/sdk';
 *
 * const rawFactors = ["eval execution", "sql injection"];
 * const descriptions = describeRiskFactors(rawFactors);
 * // Returns: [
 * //   "Dynamic code execution detected...",
 * //   "SQL injection vulnerability pattern..."
 * // ]
 * ```
 */
export function describeRiskFactors(factors: string[]): string[] {
	return factors.map((factor) => RISK_FACTOR_DESCRIPTIONS[factor.toLowerCase()] || factor);
}

/**
 * Get description for a single risk factor
 *
 * @param factor - Risk factor identifier
 * @returns Human-readable description, or original factor if not found in mapping
 *
 * @example
 * ```typescript
 * import { describeRiskFactor } from '@snapback/sdk';
 *
 * const description = describeRiskFactor("eval execution");
 * // Returns: "Dynamic code execution detected - eval() allows runtime code execution"
 * ```
 */
export function describeRiskFactor(factor: string): string {
	return RISK_FACTOR_DESCRIPTIONS[factor.toLowerCase()] || factor;
}

/**
 * Check if a risk factor is recognized in the standard mapping
 *
 * @param factor - Risk factor identifier
 * @returns True if factor has a description in the standard mapping
 *
 * @example
 * ```typescript
 * import { isKnownRiskFactor } from '@snapback/sdk';
 *
 * isKnownRiskFactor("eval execution"); // true
 * isKnownRiskFactor("unknown factor"); // false
 * ```
 */
export function isKnownRiskFactor(factor: string): boolean {
	return factor.toLowerCase() in RISK_FACTOR_DESCRIPTIONS;
}

/**
 * Get all available risk factor identifiers
 *
 * @returns Array of all standard risk factor identifiers
 *
 * @example
 * ```typescript
 * import { getStandardRiskFactors } from '@snapback/sdk';
 *
 * const factors = getStandardRiskFactors();
 * // Returns: ["eval execution", "sql injection", "command execution", ...]
 * ```
 */
export function getStandardRiskFactors(): string[] {
	return Object.keys(RISK_FACTOR_DESCRIPTIONS);
}
