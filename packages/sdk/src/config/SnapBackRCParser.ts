/**
 * SnapBackRC Parser - Platform-agnostic .snapbackrc configuration parser
 *
 * This module provides utilities for parsing, validating, and merging
 * .snapbackrc configuration files across different platforms.
 *
 * @module SnapBackRCParser
 */

import type { ProtectionRule, SnapBackPolicies, SnapBackRC, SnapBackSettings } from "./types.js";

/**
 * Result of parsing a configuration
 */
export interface ParseResult {
	/** Whether the configuration is valid */
	isValid: boolean;

	/** The parsed configuration (if valid) */
	config?: SnapBackRC;

	/** List of validation errors (if invalid) */
	errors?: string[];

	/** List of validation warnings */
	warnings?: string[];
}

/**
 * Options for merging configurations
 */
export interface MergeOptions {
	/** Provenance for base configuration */
	baseProvenance?: string;

	/** Provenance for override configuration */
	overrideProvenance?: string;
}

/**
 * Valid protection levels
 */
const VALID_PROTECTION_LEVELS = ["Watched", "Warning", "Protected"] as const;

/**
 * SnapBackRCParser - Parses and validates .snapbackrc configuration files
 *
 * Provides platform-agnostic parsing and validation of SnapBack configuration
 * files with support for merging multiple configurations and tracking provenance.
 *
 * @example
 * ```typescript
 * const parser = new SnapBackRCParser();
 * const result = parser.parse(configString);
 *
 * if (result.isValid) {
 *   console.log("Config is valid:", result.config);
 * } else {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export class SnapBackRCParser {
	/**
	 * Parse a .snapbackrc configuration string
	 *
	 * @param content - The configuration file content as a string
	 * @returns Parse result with validation status and errors
	 */
	parse(content: string): ParseResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Step 1: Parse JSON
		let config: SnapBackRC;
		try {
			config = JSON.parse(content) as SnapBackRC;
		} catch (error) {
			return {
				isValid: false,
				errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
			};
		}

		// Step 2: Validate structure
		const validationErrors = this.validate(config);
		errors.push(...validationErrors);

		return {
			isValid: errors.length === 0,
			config: errors.length === 0 ? config : undefined,
			errors: errors.length > 0 ? errors : undefined,
			warnings: warnings.length > 0 ? warnings : undefined,
		};
	}

	/**
	 * Validate a configuration object
	 *
	 * @param config - The configuration to validate
	 * @returns Array of validation error messages
	 */
	private validate(config: SnapBackRC): string[] {
		const errors: string[] = [];

		// Validate protection rules
		if (config.protection !== undefined) {
			if (!Array.isArray(config.protection)) {
				errors.push("protection must be an array");
			} else {
				for (let i = 0; i < config.protection.length; i++) {
					const rule = config.protection[i];
					const ruleErrors = this.validateProtectionRule(rule, i);
					errors.push(...ruleErrors);
				}
			}
		}

		// Validate ignore patterns
		if (config.ignore !== undefined && !Array.isArray(config.ignore)) {
			errors.push("ignore must be an array of strings");
		}

		// Validate settings
		if (config.settings !== undefined) {
			const settingsErrors = this.validateSettings(config.settings);
			errors.push(...settingsErrors);
		}

		// Validate policies
		if (config.policies !== undefined) {
			const policyErrors = this.validatePolicies(config.policies);
			errors.push(...policyErrors);
		}

		return errors;
	}

	/**
	 * Validate a single protection rule
	 *
	 * @param rule - The protection rule to validate
	 * @param index - The index of the rule in the array
	 * @returns Array of validation error messages
	 */
	private validateProtectionRule(rule: ProtectionRule, index: number): string[] {
		const errors: string[] = [];
		const prefix = `protection[${index}]`;

		// Check required fields
		if (!rule.pattern) {
			errors.push(`${prefix}: pattern is required`);
		}

		if (!rule.level) {
			errors.push(`${prefix}: level is required`);
		} else if (!VALID_PROTECTION_LEVELS.includes(rule.level)) {
			errors.push(`${prefix}: level must be one of ${VALID_PROTECTION_LEVELS.join(", ")} (got "${rule.level}")`);
		}

		// Validate optional fields
		if (rule.debounce !== undefined && (typeof rule.debounce !== "number" || rule.debounce < 0)) {
			errors.push(`${prefix}: debounce must be a non-negative number`);
		}

		if (rule.excludeFrom !== undefined && !Array.isArray(rule.excludeFrom)) {
			errors.push(`${prefix}: excludeFrom must be an array of strings`);
		}

		if (rule.autoSnapshot !== undefined && typeof rule.autoSnapshot !== "boolean") {
			errors.push(`${prefix}: autoSnapshot must be a boolean`);
		}

		return errors;
	}

	/**
	 * Validate settings
	 *
	 * @param settings - The settings to validate
	 * @returns Array of validation error messages
	 */
	private validateSettings(settings: SnapBackSettings): string[] {
		const errors: string[] = [];

		if (settings.maxSnapshots !== undefined) {
			if (typeof settings.maxSnapshots !== "number" || settings.maxSnapshots < 1) {
				errors.push("settings.maxSnapshots must be a positive number");
			}
		}

		if (
			settings.defaultProtectionLevel !== undefined &&
			!VALID_PROTECTION_LEVELS.includes(settings.defaultProtectionLevel)
		) {
			errors.push(`settings.defaultProtectionLevel must be one of ${VALID_PROTECTION_LEVELS.join(", ")}`);
		}

		if (
			settings.protectionDebounce !== undefined &&
			(typeof settings.protectionDebounce !== "number" || settings.protectionDebounce < 0)
		) {
			errors.push("settings.protectionDebounce must be a non-negative number");
		}

		if (
			settings.maxStorageSize !== undefined &&
			(typeof settings.maxStorageSize !== "number" || settings.maxStorageSize < 0)
		) {
			errors.push("settings.maxStorageSize must be a non-negative number");
		}

		if (
			settings.parallelOperations !== undefined &&
			(typeof settings.parallelOperations !== "number" || settings.parallelOperations < 1)
		) {
			errors.push("settings.parallelOperations must be a positive number");
		}

		return errors;
	}

	/**
	 * Validate policies
	 *
	 * @param policies - The policies to validate
	 * @returns Array of validation error messages
	 */
	private validatePolicies(policies: SnapBackPolicies): string[] {
		const errors: string[] = [];

		if (
			policies.minimumProtectionLevel !== undefined &&
			!VALID_PROTECTION_LEVELS.includes(policies.minimumProtectionLevel)
		) {
			errors.push(`policies.minimumProtectionLevel must be one of ${VALID_PROTECTION_LEVELS.join(", ")}`);
		}

		return errors;
	}

	/**
	 * Merge two configurations
	 *
	 * Combines two configurations with the override taking precedence.
	 * Arrays are concatenated, objects are deeply merged.
	 *
	 * @param base - The base configuration
	 * @param override - The override configuration
	 * @param options - Merge options including provenance tracking
	 * @returns Merged configuration
	 */
	merge(base: SnapBackRC, override: SnapBackRC, options?: MergeOptions): SnapBackRC {
		const result: SnapBackRC = {};

		// Merge protection rules (concatenate)
		if (base.protection || override.protection) {
			result.protection = [];

			if (base.protection) {
				result.protection.push(
					...base.protection.map((rule) => ({
						...rule,
						_provenance: options?.baseProvenance,
					})),
				);
			}

			if (override.protection) {
				result.protection.push(
					...override.protection.map((rule) => ({
						...rule,
						_provenance: options?.overrideProvenance,
					})),
				);
			}
		}

		// Merge ignore patterns (concatenate and deduplicate)
		if (base.ignore || override.ignore) {
			const ignoreSet = new Set<string>();

			if (base.ignore) {
				for (const pattern of base.ignore) {
					ignoreSet.add(pattern);
				}
			}

			if (override.ignore) {
				for (const pattern of override.ignore) {
					ignoreSet.add(pattern);
				}
			}

			result.ignore = Array.from(ignoreSet);
		}

		// Merge settings (deep merge, override takes precedence)
		if (base.settings || override.settings) {
			result.settings = {
				...base.settings,
				...override.settings,
			};
		}

		// Merge policies (deep merge, override takes precedence)
		if (base.policies || override.policies) {
			result.policies = {
				...base.policies,
				...override.policies,
			};
		}

		// Merge hooks (override takes precedence)
		if (base.hooks || override.hooks) {
			result.hooks = {
				...base.hooks,
				...override.hooks,
			};
		}

		// Merge templates (concatenate)
		if (base.templates || override.templates) {
			result.templates = [...(base.templates || []), ...(override.templates || [])];
		}

		return result;
	}

	/**
	 * Filter configuration by pattern
	 *
	 * Returns a new configuration containing only protection rules
	 * that match the given pattern.
	 *
	 * @param config - The configuration to filter
	 * @param pattern - The pattern to match
	 * @returns Filtered configuration
	 */
	filterByPattern(config: SnapBackRC, pattern: string): SnapBackRC {
		const result: SnapBackRC = {
			...config,
		};

		if (config.protection) {
			result.protection = config.protection.filter((rule) => rule.pattern === pattern);
		}

		return result;
	}
}
