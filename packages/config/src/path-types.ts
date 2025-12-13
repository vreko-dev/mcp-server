/**
 * Type-Safe Path Access for ConfigStoreV2
 *
 * Provides compile-time validation for dot-notation paths like:
 * - "settings.privacy.consent"
 * - "engine.maxDepth"
 * - "policies.allowOverrides"
 *
 * Based on TypeScript template literal types pattern.
 * @see https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
 */

/**
 * Extract deeply nested property type from object using dot notation
 *
 * Examples:
 * - PathValue<ConfigStoreV2, "settings.privacy.consent"> -> boolean
 * - PathValue<ConfigStoreV2, "engine.maxDepth"> -> number
 * - PathValue<ConfigStoreV2, "settings"> -> Settings
 */
export type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
	? Key extends keyof T
		? PathValue<T[Key], Rest>
		: never
	: P extends keyof T
		? T[P]
		: never;

/**
 * Generate all valid dot-notation paths for an object type
 *
 * Example for { user: { name: string; age: number } }:
 * - "user" | "user.name" | "user.age"
 *
 * Limits depth to prevent infinite recursion on circular types.
 */
export type Paths<T, Depth extends number = 5> = [Depth] extends [never]
	? never
	: T extends object
		? {
				[K in keyof T]-?: K extends string | number
					? T[K] extends object
						? K | `${K}.${Paths<T[K], Prev[Depth]>}`
						: K
					: never;
			}[keyof T]
		: never;

/**
 * Depth counter type for recursive types (prevents infinite recursion)
 */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Branded path type - ensures only valid paths are passed
 *
 * Usage:
 * ```ts
 * const validPath: ConfigPath = "settings.privacy.consent"; // ✅ OK
 * const invalidPath: ConfigPath = "settings.fake.path"; // ❌ Compile error
 * ```
 */
export type ConfigPath<T> = Paths<T>;

/**
 * Type-safe get function signature
 *
 * Usage:
 * ```ts
 * const consent = store.get("settings.privacy.consent"); // boolean
 * const maxDepth = store.get("engine.maxDepth"); // number
 * const invalid = store.get("fake.path"); // ❌ Compile error
 * ```
 */
export type SafeGet<T> = <P extends ConfigPath<T> & string>(path: P) => PathValue<T, P> | undefined;
