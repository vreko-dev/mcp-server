import type { AnalysisResult } from "../guardian.js";

// Base plugin interface that extends the existing AnalysisPlugin
export interface DetectionPlugin {
	name: string;
	analyze(content: string, filePath?: string): Promise<AnalysisResult>;
}

// Secret detection specific result
export interface SecretDetectionResult extends AnalysisResult {
	secretsFound: Array<{
		type: string;
		line: number;
		position: number;
		value: string;
	}>;
}

// Mock replacement specific result
export interface MockReplacementResult extends AnalysisResult {
	mocksFound: Array<{
		type: string;
		line: number;
		importPath: string;
	}>;
}

// Phantom dependency specific result
export interface PhantomDependencyResult extends AnalysisResult {
	dependenciesFound: Array<{
		name: string;
		line: number;
		isUsed: boolean;
	}>;
}

// Package.json structure
export interface PackageJson {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

// AST node types
export interface ASTNode {
	type: string;
	loc?: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
	range?: [number, number];
	[key: string]: any;
}

export interface ImportDeclaration extends ASTNode {
	type: "ImportDeclaration";
	source: {
		type: string;
		value: string;
	};
}

export interface CallExpression extends ASTNode {
	type: "CallExpression";
	callee: ASTNode;
	arguments: ASTNode[];
}
