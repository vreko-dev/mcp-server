/**
 * SnapBackRC Parser - Platform-agnostic .snapbackrc configuration parser
 *
 * This module provides utilities for parsing, validating, and merging
 * .snapbackrc configuration files across different platforms.
 *
 * @module SnapBackRCParser
 */
import type { SnapBackRC } from "./types.js";
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
export declare class SnapBackRCParser {
	/**
	 * Parse a .snapbackrc configuration string
	 *
	 * @param content - The configuration file content as a string
	 * @returns Parse result with validation status and errors
	 */
	parse(content: string): ParseResult;
	/**
	 * Validate a configuration object
	 *
	 * @param config - The configuration to validate
	 * @returns Array of validation error messages
	 */
	private validate;
	/**
	 * Validate a single protection rule
	 *
	 * @param rule - The protection rule to validate
	 * @param index - The index of the rule in the array
	 * @returns Array of validation error messages
	 */
	private validateProtectionRule;
	/**
	 * Validate settings
	 *
	 * @param settings - The settings to validate
	 * @returns Array of validation error messages
	 */
	private validateSettings;
	/**
	 * Validate policies
	 *
	 * @param policies - The policies to validate
	 * @returns Array of validation error messages
	 */
	private validatePolicies;
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
	merge(base: SnapBackRC, override: SnapBackRC, options?: MergeOptions): SnapBackRC;
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
	filterByPattern(config: SnapBackRC, pattern: string): SnapBackRC;
}
//# sourceMappingURL=SnapBackRCParser.d.ts.map
