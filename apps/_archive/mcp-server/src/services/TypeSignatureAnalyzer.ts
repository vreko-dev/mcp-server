/**
 * TypeScript Signature Analyzer
 *
 * Performs AST-based comparison of TypeScript declaration files (.d.ts)
 * to detect API signature changes between package versions.
 *
 * Detects:
 * - Removed/added exports
 * - Function signature changes
 * - Type definition changes
 * - Interface property changes
 *
 * @module TypeSignatureAnalyzer
 */

import { logger } from "@snapback/infrastructure";

export interface TypeSignatureDiff {
	removed: TypeSignatureChange[];
	added: TypeSignatureChange[];
	modified: TypeSignatureChange[];
	severity: "critical" | "high" | "medium" | "low";
}

export interface TypeSignatureChange {
	name: string;
	type: "function" | "interface" | "type" | "class" | "const" | "enum";
	before?: string; // Signature before change
	after?: string; // Signature after change
	impact: "breaking" | "additive" | "internal";
	description: string;
}

/**
 * Analyzer for TypeScript declaration file differences
 */
export class TypeSignatureAnalyzer {
	/**
	 * Compare type signatures between two versions
	 */
	async compareVersions(packageName: string, fromVersion: string, toVersion: string): Promise<TypeSignatureDiff> {
		const diff: TypeSignatureDiff = {
			removed: [],
			added: [],
			modified: [],
			severity: "low",
		};

		try {
			// Fetch .d.ts files from unpkg CDN
			const oldDefs = await this.fetchTypeDefinitions(packageName, fromVersion);
			const newDefs = await this.fetchTypeDefinitions(packageName, toVersion);

			if (!oldDefs || !newDefs) {
				logger.info("Type definitions not available for comparison", {
					package: packageName,
					fromVersion,
					toVersion,
				});
				return diff;
			}

			// Extract exports from both versions
			const oldExports = this.extractExports(oldDefs);
			const newExports = this.extractExports(newDefs);

			// Detect removals
			for (const [name, signature] of oldExports) {
				if (!newExports.has(name)) {
					diff.removed.push({
						name,
						type: this.inferType(signature),
						before: signature,
						impact: "breaking",
						description: `Removed export: ${name}`,
					});
				} else if (newExports.get(name) !== signature) {
					// Signature changed
					diff.modified.push({
						name,
						type: this.inferType(signature),
						before: signature,
						after: newExports.get(name),
						impact: this.assessImpact(signature, newExports.get(name)!),
						description: `Modified signature: ${name}`,
					});
				}
			}

			// Detect additions
			for (const [name, signature] of newExports) {
				if (!oldExports.has(name)) {
					diff.added.push({
						name,
						type: this.inferType(signature),
						after: signature,
						impact: "additive",
						description: `Added export: ${name}`,
					});
				}
			}

			// Determine overall severity
			diff.severity = this.calculateSeverity(diff);

			return diff;
		} catch (error) {
			logger.warn("Type signature analysis failed", {
				error: error instanceof Error ? error.message : String(error),
				package: packageName,
			});

			return diff;
		}
	}

	/**
	 * Fetch type definitions from unpkg
	 */
	private async fetchTypeDefinitions(packageName: string, version: string): Promise<string | null> {
		try {
			// Try common .d.ts locations
			const urls = [
				`https://unpkg.com/${packageName}@${version}/dist/index.d.ts`,
				`https://unpkg.com/${packageName}@${version}/index.d.ts`,
				`https://unpkg.com/${packageName}@${version}/types/index.d.ts`,
				`https://unpkg.com/${packageName}@${version}/lib/index.d.ts`,
			];

			for (const url of urls) {
				try {
					const response = await fetch(url);
					if (response.ok) {
						return await response.text();
					}
				} catch {}
			}

			return null;
		} catch (error) {
			logger.warn("Failed to fetch type definitions", {
				error: error instanceof Error ? error.message : String(error),
				package: packageName,
				version,
			});
			return null;
		}
	}

	/**
	 * Extract exported symbols from .d.ts file
	 * Simplified extraction - production would use TypeScript compiler API
	 */
	private extractExports(dts: string): Map<string, string> {
		const exports = new Map<string, string>();

		// Extract function exports
		const functionPattern = /export\s+(?:declare\s+)?function\s+(\w+)\s*([^{;]+)/g;
		let match: RegExpExecArray | null;
		while ((match = functionPattern.exec(dts)) !== null) {
			exports.set(match[1], `function ${match[1]}${match[2]}`);
		}

		// Extract const exports
		const constPattern = /export\s+(?:declare\s+)?const\s+(\w+)\s*:\s*([^;]+)/g;
		while ((match = constPattern.exec(dts)) !== null) {
			exports.set(match[1], `const ${match[1]}: ${match[2]}`);
		}

		// Extract interface exports
		const interfacePattern = /export\s+interface\s+(\w+)\s*(?:<[^>]+>)?\s*{([^}]+)}/g;
		while ((match = interfacePattern.exec(dts)) !== null) {
			exports.set(match[1], `interface ${match[1]} { ${match[2].trim()} }`);
		}

		// Extract type exports
		const typePattern = /export\s+type\s+(\w+)\s*=\s*([^;]+)/g;
		while ((match = typePattern.exec(dts)) !== null) {
			exports.set(match[1], `type ${match[1]} = ${match[2]}`);
		}

		// Extract class exports
		const classPattern = /export\s+(?:declare\s+)?class\s+(\w+)\s*(?:<[^>]+>)?\s*{/g;
		while ((match = classPattern.exec(dts)) !== null) {
			exports.set(match[1], `class ${match[1]}`);
		}

		return exports;
	}

	/**
	 * Infer export type from signature
	 */
	private inferType(signature: string): TypeSignatureChange["type"] {
		if (signature.startsWith("function")) return "function";
		if (signature.startsWith("interface")) return "interface";
		if (signature.startsWith("type")) return "type";
		if (signature.startsWith("class")) return "class";
		if (signature.startsWith("const")) return "const";
		if (signature.startsWith("enum")) return "enum";
		return "const";
	}

	/**
	 * Assess impact of signature change
	 */
	private assessImpact(before: string, after: string): "breaking" | "additive" | "internal" {
		// Simplified heuristics - production would use semantic analysis

		// Function parameters removed = breaking
		if (before.includes("function") && after.includes("function")) {
			const beforeParams = this.extractParameters(before);
			const afterParams = this.extractParameters(after);

			// Required parameters removed = breaking
			if (beforeParams.required > afterParams.required) {
				return "breaking";
			}

			// Optional parameters added = additive
			if (afterParams.optional > beforeParams.optional) {
				return "additive";
			}
		}

		// Interface properties removed = breaking
		if (before.includes("interface") && after.includes("interface")) {
			const beforeProps = this.extractProperties(before);
			const afterProps = this.extractProperties(after);

			if (afterProps.length < beforeProps.length) {
				return "breaking";
			}
		}

		// Return type changed = potentially breaking
		const beforeReturn = this.extractReturnType(before);
		const afterReturn = this.extractReturnType(after);

		if (beforeReturn !== afterReturn) {
			return "breaking";
		}

		return "internal";
	}

	/**
	 * Extract parameter counts from function signature
	 */
	private extractParameters(signature: string): { required: number; optional: number } {
		const paramMatch = signature.match(/\(([^)]*)\)/);
		if (!paramMatch) {
			return { required: 0, optional: 0 };
		}

		const params = paramMatch[1].split(",").filter((p) => p.trim());
		const optional = params.filter((p) => p.includes("?") || p.includes("=")).length;
		const required = params.length - optional;

		return { required, optional };
	}

	/**
	 * Extract properties from interface definition
	 */
	private extractProperties(signature: string): string[] {
		const propsMatch = signature.match(/{\s*([^}]+)\s*}/);
		if (!propsMatch) {
			return [];
		}

		return propsMatch[1]
			.split(/[;\n]/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
	}

	/**
	 * Extract return type from function signature
	 */
	private extractReturnType(signature: string): string {
		const returnMatch = signature.match(/:\s*([^;{]+)/);
		return returnMatch ? returnMatch[1].trim() : "void";
	}

	/**
	 * Calculate overall severity from diff
	 */
	private calculateSeverity(diff: TypeSignatureDiff): "critical" | "high" | "medium" | "low" {
		const breakingCount = [
			...diff.removed.filter((c) => c.impact === "breaking"),
			...diff.modified.filter((c) => c.impact === "breaking"),
		].length;

		if (breakingCount > 5) return "critical";
		if (breakingCount > 2) return "high";
		if (breakingCount > 0) return "medium";
		return "low";
	}
}
