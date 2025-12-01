// Type definitions for diff 7.0.0
// Since @types/diff is deprecated, we provide minimal type definitions here
// to prevent TypeScript compilation errors

declare module "diff" {
	// Minimal type definitions to satisfy TypeScript compiler
	// Add more detailed types if needed

	export interface Change {
		added?: boolean;
		removed?: boolean;
		value: string;
	}

	export function diffLines(oldStr: string, newStr: string): Change[];
	export function createTwoFilesPatch(
		oldFileName: string,
		newFileName: string,
		oldStr: string,
		newStr: string,
	): string;
	export function parsePatch(diffStr: string): any[];
}
