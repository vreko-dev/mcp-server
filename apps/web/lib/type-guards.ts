/**
 * Type-safe array access with fallback
 */
export function getArrayItem<T>(array: T[], index: number, fallback?: T): T | undefined {
	const item = array[index];
	return item ?? fallback;
}

/**
 * Assert item exists or throw
 */
export function assertDefined<T>(value: T | undefined | null, message: string): asserts value is T {
	if (value === undefined || value === null) {
		throw new Error(message);
	}
}

/**
 * Get first item or throw
 */
export function getFirstOrThrow<T>(array: T[], message: string): T {
	const item = array[0];
	assertDefined(item, message);
	return item;
}
