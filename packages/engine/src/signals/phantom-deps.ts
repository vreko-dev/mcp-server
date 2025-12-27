#!/usr/bin/env npx tsx
/**
 * Phantom Dependencies Signal - Missing Package Detection
 *
 * SOURCE REFERENCE: packages/core/src/detection/plugins/phantom-dependency.ts
 *
 * Detects imports that reference packages not declared in package.json.
 * This catches AI-generated code that imports non-existent or undeclared dependencies.
 *
 * INPUT: JSON via stdin
 * { "files": [{ "path": string, "content": string }], "workspace": string }
 *
 * OUTPUT: JSON to stdout (SignalOutput schema)
 * { "signal": "phantom-deps", "value": number, "metadata": { phantomCount, phantoms, typosquats } }
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SignalOutput } from "../types.js";

// Node.js built-in modules to skip
const NODE_BUILTINS = new Set([
	"fs",
	"path",
	"http",
	"https",
	"url",
	"util",
	"os",
	"crypto",
	"stream",
	"events",
	"buffer",
	"assert",
	"child_process",
	"cluster",
	"dgram",
	"dns",
	"domain",
	"module",
	"net",
	"process",
	"punycode",
	"querystring",
	"readline",
	"repl",
	"tls",
	"tty",
	"vm",
	"zlib",
	"v8",
	"worker_threads",
	"node:fs",
	"node:path",
	"node:http",
	"node:https",
	"node:url",
	"node:util",
	"node:os",
	"node:crypto",
	"node:stream",
	"node:events",
	"node:buffer",
	"node:assert",
	"node:child_process",
	"node:cluster",
	"node:dgram",
	"node:dns",
	"node:net",
	"node:process",
	"node:readline",
	"node:repl",
	"node:tls",
	"node:tty",
	"node:vm",
	"node:zlib",
	"node:v8",
	"node:worker_threads",
]);

// Import extraction patterns
const IMPORT_PATTERNS = [
	/import\s+.*?\s+from\s+["']([^"']+)["']/g, // ES6 import
	/import\s+["']([^"']+)["']/g, // Side-effect import
	/require\(["']([^"']+)["']\)/g, // CommonJS require
	/import\(["']([^"']+)["']\)/g, // Dynamic import
];

interface FileInput {
	path: string;
	content: string;
}

interface PhantomResult {
	phantoms: string[];
	typosquats: Array<{ pkg: string; suggestion: string }>;
}

async function readInput(): Promise<{ files: FileInput[]; workspace: string }> {
	return new Promise((resolve, reject) => {
		let data = "";
		process.stdin.on("data", (chunk) => (data += chunk));
		process.stdin.on("end", () => {
			try {
				resolve(JSON.parse(data));
			} catch (e) {
				reject(new Error(`Invalid JSON input: ${e}`));
			}
		});
	});
}

/** Extract all import paths from content - exported for testing */
export function extractImports(content: string): string[] {
	const imports: string[] = [];
	for (const pattern of IMPORT_PATTERNS) {
		const regex = new RegExp(pattern.source, pattern.flags);
		let match: RegExpExecArray | null;
		while ((match = regex.exec(content)) !== null) {
			if (match[1]) {
				// Remove query params and hash fragments
				const cleanPath = match[1].split(/[?#]/)[0];
				imports.push(cleanPath);
			}
		}
	}
	return imports;
}

/** Find package.json and get declared dependencies - exported for testing */
export function getDeclaredDependencies(workspace: string): Set<string> {
	const deps = new Set<string>();
	const pkgPath = join(workspace, "package.json");

	if (!existsSync(pkgPath)) {
		return deps;
	}

	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
		const allDeps = {
			...pkg.dependencies,
			...pkg.devDependencies,
			...pkg.peerDependencies,
			...pkg.optionalDependencies,
		};
		for (const name of Object.keys(allDeps)) {
			deps.add(name);
		}
	} catch {
		// Fail gracefully
	}

	return deps;
}

/** Simple Levenshtein distance for typosquat detection */
function levenshteinDistance(a: string, b: string): number {
	if (a.length === 0) {
		return b.length;
	}
	if (b.length === 0) {
		return a.length;
	}

	const matrix: number[][] = [];
	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
			}
		}
	}

	return matrix[b.length][a.length];
}

/** Detect phantom dependencies - exported for testing */
export function detectPhantomDeps(imports: string[], declaredDeps: Set<string>): PhantomResult {
	const phantoms: string[] = [];
	const typosquats: Array<{ pkg: string; suggestion: string }> = [];

	for (const importPath of imports) {
		// Skip relative imports
		if (importPath.startsWith(".") || importPath.startsWith("/")) {
			continue;
		}

		// Skip Node.js built-ins
		if (NODE_BUILTINS.has(importPath)) {
			continue;
		}

		// Skip workspace packages
		if (importPath.startsWith("@snapback/")) {
			continue;
		}

		// Skip type-only imports
		if (importPath.startsWith("@types/")) {
			continue;
		}

		// Get package name (handle scoped and subpath imports)
		const pkgName = importPath.startsWith("@")
			? importPath.split("/").slice(0, 2).join("/")
			: importPath.split("/")[0];

		// Check if declared
		if (declaredDeps.has(pkgName)) {
			continue;
		}

		// Check for typosquat (close match in declared deps)
		let bestMatch = "";
		let minDistance = Number.POSITIVE_INFINITY;
		for (const declared of declaredDeps) {
			const dist = levenshteinDistance(pkgName, declared);
			if (dist > 0 && dist <= 2 && dist < minDistance) {
				minDistance = dist;
				bestMatch = declared;
			}
		}

		if (bestMatch) {
			typosquats.push({ pkg: pkgName, suggestion: bestMatch });
		} else if (!phantoms.includes(pkgName)) {
			phantoms.push(pkgName);
		}
	}

	return { phantoms, typosquats };
}

async function main(): Promise<void> {
	try {
		const input = await readInput();
		const workspace = input.workspace || process.cwd();
		const declaredDeps = getDeclaredDependencies(workspace);

		let totalPhantoms = 0;
		let totalTyposquats = 0;
		const allPhantoms: string[] = [];
		const allTyposquats: Array<{ pkg: string; suggestion: string }> = [];

		for (const file of input.files || []) {
			// Skip test files
			if (
				file.path.includes(".test.") ||
				file.path.includes(".spec.") ||
				file.path.includes("__tests__") ||
				file.path.includes("__mocks__")
			) {
				continue;
			}

			const imports = extractImports(file.content || "");
			const result = detectPhantomDeps(imports, declaredDeps);

			for (const phantom of result.phantoms) {
				if (!allPhantoms.includes(phantom)) {
					allPhantoms.push(phantom);
					totalPhantoms++;
				}
			}

			for (const typo of result.typosquats) {
				const exists = allTyposquats.some((t) => t.pkg === typo.pkg);
				if (!exists) {
					allTyposquats.push(typo);
					totalTyposquats++;
				}
			}
		}

		// Calculate risk score: typosquats are more dangerous than phantoms
		const score = Math.min(10, totalPhantoms * 3 + totalTyposquats * 5);

		const output: SignalOutput = {
			signal: "phantom-deps",
			value: score,
			metadata: {
				phantomCount: totalPhantoms,
				typosquatCount: totalTyposquats,
				phantoms: allPhantoms,
				typosquats: allTyposquats,
				severity: totalTyposquats > 0 ? "critical" : totalPhantoms > 0 ? "high" : "none",
			},
		};

		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (err) {
		console.log(
			JSON.stringify({
				signal: "phantom-deps",
				value: 0,
				metadata: { error: err instanceof Error ? err.message : String(err) },
			}),
		);
		process.exit(1);
	}
}

// Only run main() when executed directly (CLI mode), not when imported
if (typeof require !== "undefined" && require.main === module) {
	main();
} else if (typeof import.meta !== "undefined" && (import.meta as any).url === `file://${process.argv[1]}`) {
	main();
}
