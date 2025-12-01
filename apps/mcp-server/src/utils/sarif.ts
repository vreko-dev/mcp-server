/**
 * SARIF (Static Analysis Results Interchange Format) utility functions
 * Version 2.1.0
 */

// SARIF interfaces based on the specification
export interface SarifLog {
	$schema?: string;
	version: "2.1.0";
	runs: Run[];
	inlineExternalProperties?: ExternalProperties[];
	properties?: PropertyBag;
}

export interface Run {
	tool: Tool;
	results?: Result[];
	invocations?: Invocation[];
	artifacts?: Artifact[];
	properties?: PropertyBag;
}

export interface Tool {
	driver: ToolComponent;
	extensions?: ToolComponent[];
	properties?: PropertyBag;
}

export interface ToolComponent {
	name: string;
	version?: string;
	rules?: ReportingDescriptor[];
	properties?: PropertyBag;
}

export interface ReportingDescriptor {
	id: string;
	name?: string;
	shortDescription?: Message;
	fullDescription?: Message;
	defaultConfiguration?: ReportingConfiguration;
	properties?: PropertyBag;
}

export interface ReportingConfiguration {
	enabled?: boolean;
	level?: ResultLevel;
	rank?: number;
	parameters?: PropertyBag;
}

export type ResultLevel = "none" | "note" | "warning" | "error";

export interface Result {
	ruleId: string;
	ruleIndex?: number;
	kind?: ResultKind;
	level?: ResultLevel;
	message: Message;
	locations?: Location[];
	relatedLocations?: Location[];
	partialFingerprints?: { [key: string]: string };
	properties?: PropertyBag;
}

export type ResultKind = "notApplicable" | "pass" | "fail" | "review" | "open" | "informational";

export interface Message {
	text?: string;
	markdown?: string;
	properties?: PropertyBag;
}

export interface Location {
	physicalLocation?: PhysicalLocation;
	logicalLocations?: LogicalLocation[];
	properties?: PropertyBag;
}

export interface PhysicalLocation {
	artifactLocation?: ArtifactLocation;
	region?: Region;
	properties?: PropertyBag;
}

export interface ArtifactLocation {
	uri?: string;
	uriBaseId?: string;
	index?: number;
	properties?: PropertyBag;
}

export interface Region {
	startLine?: number;
	startColumn?: number;
	endLine?: number;
	endColumn?: number;
	charOffset?: number;
	charLength?: number;
	snippet?: ArtifactContent;
	properties?: PropertyBag;
}

export interface Artifact {
	location?: ArtifactLocation;
	parentIndex?: number;
	offset?: number;
	length?: number;
	roles?: ArtifactRoles[];
	mimeType?: string;
	properties?: PropertyBag;
}

export type ArtifactRoles =
	| "analysisTarget"
	| "attachment"
	| "responseFile"
	| "resultFile"
	| "standardStream"
	| "tracedFile"
	| "unmodified"
	| "modified"
	| "added"
	| "deleted"
	| "renamed"
	| "uncontrolled"
	| "driver"
	| "extension"
	| "translation"
	| "taxonomy"
	| "policy"
	| "referencedOnCommandLine"
	| "memoryContents"
	| "directory"
	| "userSpecifiedConfiguration"
	| "toolSpecifiedConfiguration"
	| "debugOutputFile";

export interface ArtifactContent {
	text?: string;
	binary?: string;
	rendered?: MultiformatMessageString;
	properties?: PropertyBag;
}

export interface MultiformatMessageString {
	text: string;
	markdown?: string;
	properties?: PropertyBag;
}

export interface PropertyBag {
	[key: string]: any;
}

export interface ExternalProperties {
	guid?: string;
	runGuid?: string;
	conversion?: Conversion;
	graphs?: Graph[];
	properties?: PropertyBag;
}

export interface Conversion {
	tool: Tool;
	invocation?: Invocation;
	properties?: PropertyBag;
}

export interface Invocation {
	commandLine?: string;
	arguments?: string[];
	responseFiles?: ArtifactLocation[];
	startTimeUtc?: string;
	endTimeUtc?: string;
	exitCode?: number;
	properties?: PropertyBag;
}

export interface Graph {
	description?: Message;
	nodes?: Node[];
	properties?: PropertyBag;
}

export interface Node {
	id: string;
	label?: Message;
	properties?: PropertyBag;
}

export interface LogicalLocation {
	name?: string;
	index?: number;
	parentIndex?: number;
	kind?: string;
	properties?: PropertyBag;
}

/**
 * Create a basic SARIF log structure
 *
 * @param toolName - Name of the tool generating the SARIF
 * @param toolVersion - Version of the tool
 * @returns A SARIF log object with basic structure
 */
export function createSarifLog(toolName: string, toolVersion?: string): SarifLog {
	return {
		version: "2.1.0",
		$schema: "https://json.schemastore.org/sarif-2.1.0.json",
		runs: [
			{
				tool: {
					driver: {
						name: toolName,
						version: toolVersion,
						rules: [],
					},
				},
				results: [],
			},
		],
	};
}

/**
 * Add a result to a SARIF log
 *
 * @param sarifLog - The SARIF log to add the result to
 * @param ruleId - The ID of the rule that was violated
 * @param message - The message describing the result
 * @param uri - The URI of the file where the result was found
 * @param region - The region in the file where the result was found
 * @returns The updated SARIF log
 */
export function addResult(
	sarifLog: SarifLog,
	ruleId: string,
	message: string,
	uri?: string,
	region?: Region,
): SarifLog {
	// Ensure we have at least one run
	if (!sarifLog.runs || sarifLog.runs.length === 0) {
		sarifLog.runs = [
			{
				tool: {
					driver: {
						name: "snapback",
						rules: [],
					},
				},
				results: [],
			},
		];
	}

	// Get the first run
	const run = sarifLog.runs[0];

	// Ensure results array exists
	if (!run.results) {
		run.results = [];
	}

	// Create the result
	const result: Result = {
		ruleId,
		message: {
			text: message,
		},
	};

	// Add location if provided
	if (uri || region) {
		result.locations = [
			{
				physicalLocation: {
					artifactLocation: uri ? { uri } : undefined,
					region,
				},
			},
		];
	}

	// Add the result to the run
	run.results.push(result);

	return sarifLog;
}

/**
 * Convert SARIF log to JSON string
 *
 * @param sarifLog - The SARIF log to convert
 * @returns JSON string representation of the SARIF log
 */
export function sarifToJson(sarifLog: SarifLog): string {
	return JSON.stringify(sarifLog, null, 2);
}
