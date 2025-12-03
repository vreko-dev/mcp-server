import { z } from "zod";
/**
 * Configuration file types
 */
export declare const ConfigFileTypeSchema: z.ZodEnum<{
	package: "package";
	typescript: "typescript";
	linting: "linting";
	build: "build";
	environment: "environment";
	testing: "testing";
	framework: "framework";
	database: "database";
	ci: "ci";
}>;
export type ConfigFileType = z.infer<typeof ConfigFileTypeSchema>;
/**
 * Supported programming languages
 */
export declare const SupportedLanguageSchema: z.ZodEnum<{
	typescript: "typescript";
	javascript: "javascript";
	python: "python";
	universal: "universal";
}>;
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;
/**
 * File baseline information for config files
 */
export declare const FileBaselineSchema: z.ZodObject<
	{
		path: z.ZodString;
		hash: z.ZodString;
		timestamp: z.ZodNumber;
		size: z.ZodNumber;
	},
	z.core.$strip
>;
export type FileBaseline = z.infer<typeof FileBaselineSchema>;
/**
 * Base configuration file interface
 */
export declare const ConfigFileSchema: z.ZodObject<
	{
		path: z.ZodString;
		type: z.ZodEnum<{
			package: "package";
			typescript: "typescript";
			linting: "linting";
			build: "build";
			environment: "environment";
			testing: "testing";
			framework: "framework";
			database: "database";
			ci: "ci";
		}>;
		language: z.ZodEnum<{
			typescript: "typescript";
			javascript: "javascript";
			python: "python";
			universal: "universal";
		}>;
		critical: z.ZodDefault<z.ZodBoolean>;
		baseline: z.ZodOptional<
			z.ZodObject<
				{
					path: z.ZodString;
					hash: z.ZodString;
					timestamp: z.ZodNumber;
					size: z.ZodNumber;
				},
				z.core.$strip
			>
		>;
	},
	z.core.$strip
>;
export type ConfigFile = z.infer<typeof ConfigFileSchema>;
/**
 * Detected configuration file
 */
export declare const DetectedConfigFileSchema: z.ZodObject<
	{
		type: z.ZodString;
		path: z.ZodString;
		name: z.ZodString;
		critical: z.ZodDefault<z.ZodBoolean>;
	},
	z.core.$strip
>;
export type DetectedConfigFile = z.infer<typeof DetectedConfigFileSchema>;
/**
 * Config parse result
 */
export declare const ConfigParseResultSchema: z.ZodObject<
	{
		content: z.ZodAny;
		valid: z.ZodBoolean;
		error: z.ZodOptional<z.ZodString>;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
	},
	z.core.$strip
>;
export type ConfigParseResult = z.infer<typeof ConfigParseResultSchema>;
/**
 * Config validation result
 */
export declare const ConfigValidationResultSchema: z.ZodObject<
	{
		valid: z.ZodBoolean;
		errors: z.ZodDefault<z.ZodArray<z.ZodString>>;
		warnings: z.ZodDefault<z.ZodArray<z.ZodString>>;
	},
	z.core.$strip
>;
export type ConfigValidationResult = z.infer<
	typeof ConfigValidationResultSchema
>;
/**
 * Config file change
 */
export declare const ConfigChangeSchema: z.ZodObject<
	{
		type: z.ZodEnum<{
			added: "added";
			modified: "modified";
			deleted: "deleted";
		}>;
		file: z.ZodString;
		timestamp: z.ZodNumber;
		baseline: z.ZodOptional<
			z.ZodObject<
				{
					path: z.ZodString;
					hash: z.ZodString;
					timestamp: z.ZodNumber;
					size: z.ZodNumber;
				},
				z.core.$strip
			>
		>;
	},
	z.core.$strip
>;
export type ConfigChange = z.infer<typeof ConfigChangeSchema>;
/**
 * Config detection patterns
 */
export interface ConfigDetectionPattern {
	pattern: string | RegExp;
	type: ConfigFileType;
	language: SupportedLanguage;
	critical: boolean;
}
/**
 * Config manager options
 */
export declare const ConfigManagerOptionsSchema: z.ZodObject<
	{
		autoDetect: z.ZodDefault<z.ZodBoolean>;
		watchChanges: z.ZodDefault<z.ZodBoolean>;
		autoProtect: z.ZodDefault<z.ZodBoolean>;
		customPatterns: z.ZodOptional<z.ZodArray<z.ZodAny>>;
	},
	z.core.$strip
>;
export type ConfigManagerOptions = z.infer<typeof ConfigManagerOptionsSchema>;
/**
 * Selective snapshot configuration
 */
export declare const SelectiveSnapshotConfigSchema: z.ZodObject<
	{
		enabled: z.ZodBoolean;
		patterns: z.ZodOptional<z.ZodArray<z.ZodString>>;
		threshold: z.ZodOptional<z.ZodNumber>;
		includePatterns: z.ZodOptional<z.ZodArray<z.ZodString>>;
		excludePatterns: z.ZodOptional<z.ZodArray<z.ZodString>>;
	},
	z.core.$strip
>;
export type SelectiveSnapshotConfig = z.infer<
	typeof SelectiveSnapshotConfigSchema
>;
