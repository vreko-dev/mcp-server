/**
 * Performance Pattern Matchers
 *
 * Detects performance patterns and anti-patterns in the codebase.
 *
 * @module patterns/matchers/performance
 */

import type { PatternMatch, PatternMatcher } from "../types.js";

/**
 * Create line-based match from regex match
 */
function createMatch(content: string, filePath: string, regexMatch: RegExpExecArray, confidence = 0.9): PatternMatch {
	const beforeMatch = content.slice(0, regexMatch.index);
	const line = (beforeMatch.match(/\n/g) || []).length + 1;
	const lines = content.split("\n");
	const snippet = lines[line - 1]?.trim() || regexMatch[0];

	return {
		file: filePath,
		line,
		snippet: snippet.slice(0, 100),
		confidence,
	};
}

/**
 * Matcher for React memoization
 */
export const reactMemoMatcher: PatternMatcher = {
	id: "react-memo",
	name: "React Memoization",
	category: "performance",
	files: ["**/*.{tsx,jsx}"],
	isPositive: true,
	importance: "optional",
	description: "Performance optimization with React.memo, useMemo, useCallback",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/React\.memo\s*\(/g, /memo\s*\(/g, /useMemo\s*\(/g, /useCallback\s*\(/g];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for lazy loading
 */
export const lazyLoadingMatcher: PatternMatcher = {
	id: "lazy-loading",
	name: "Lazy Loading",
	category: "performance",
	files: ["**/*.{tsx,jsx,ts,js}"],
	isPositive: true,
	importance: "recommended",
	description: "Code splitting with lazy loading",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/React\.lazy\s*\(/g,
			/lazy\s*\(/g,
			/dynamic\s*\(\s*\(\s*\)\s*=>/g,
			/import\s*\(\s*['"][^'"]+['"]\s*\)/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for image optimization
 */
export const imageOptimizationMatcher: PatternMatcher = {
	id: "image-optimization",
	name: "Image Optimization",
	category: "performance",
	files: ["**/*.{tsx,jsx}"],
	isPositive: true,
	importance: "recommended",
	description: "Optimized images with next/image or similar",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/import.*Image.*from ['"]next\/image['"]/g,
			/import.*Image.*from ['"]@astro\/assets['"]/g,
			/<Image[^>]+/g,
			/loading\s*=\s*['"]lazy['"]/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for bundle size issues (anti-pattern)
 */
export const largeBundleMatcher: PatternMatcher = {
	id: "large-bundle-imports",
	name: "Large Bundle Imports",
	category: "performance",
	files: ["**/*.{tsx,jsx,ts,js}"],
	isPositive: false,
	importance: "recommended",
	description: "Imports that may cause large bundle sizes",
	match: (content, filePath) => {
		// Skip config files
		if (filePath.includes("config") || filePath.includes(".config.")) {
			return [];
		}

		const matches: PatternMatch[] = [];

		const patterns = [
			/import\s+\*\s+as\s+\w+\s+from\s+['"]lodash['"]/g,
			/import\s+\{\s*\}\s+from\s+['"]moment['"]/g,
			/import\s+moment\s+from\s+['"]moment['"]/g,
			/import\s+\*\s+as\s+\w+\s+from\s+['"]rxjs['"]/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match, 0.7));
			}
		}

		return matches;
	},
};

/**
 * Matcher for caching
 */
export const cachingMatcher: PatternMatcher = {
	id: "caching",
	name: "Data Caching",
	category: "performance",
	files: ["**/*.{ts,js}"],
	isPositive: true,
	importance: "recommended",
	description: "Caching for improved performance",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/cache-manager/g,
			/@nestjs\/cache-manager/g,
			/redis/g,
			/lru-cache/g,
			/quick-lru/g,
			/unstable_cache/g,
			/revalidate\s*:/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for async state in loops (anti-pattern)
 */
export const asyncInLoopMatcher: PatternMatcher = {
	id: "async-in-loop",
	name: "Async Operations in Loop",
	category: "performance",
	files: ["**/*.{ts,tsx,js,jsx}"],
	isPositive: false,
	importance: "recommended",
	description: "Sequential async operations that could be parallelized",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/for\s*\([^)]+\)\s*\{[^}]*await\s+/g, /\.forEach\s*\(\s*async/g];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match, 0.6));
			}
		}

		return matches;
	},
};

/**
 * Matcher for response compression
 */
export const compressionMatcher: PatternMatcher = {
	id: "compression",
	name: "Response Compression",
	category: "performance",
	files: ["**/*.{ts,js}"],
	isPositive: true,
	importance: "recommended",
	description: "Gzip/Brotli compression for responses",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/compression/g, /brotli/g, /gzip/g, /Content-Encoding/g];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * All performance matchers
 */
export const performanceMatchers: PatternMatcher[] = [
	reactMemoMatcher,
	lazyLoadingMatcher,
	imageOptimizationMatcher,
	largeBundleMatcher,
	cachingMatcher,
	asyncInLoopMatcher,
	compressionMatcher,
];
