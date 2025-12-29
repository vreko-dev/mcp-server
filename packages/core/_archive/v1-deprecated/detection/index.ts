/**
 * @deprecated These detection plugins are deprecated and will be removed in v1.0.0.
 * Use the V2 engine signals instead:
 * - SecretDetectionPlugin → @snapback/engine signals/threats.ts
 * - MockReplacementPlugin → @snapback/engine signals/threats.ts
 * - PhantomDependencyPlugin → @snapback/engine signals/phantom-deps.ts
 *
 * Migration guide: See packages/engine/AGENT.md for V1 → V2 migration instructions.
 */
export * from "./plugins/mock-replacement";
export * from "./plugins/phantom-dependency";
export * from "./plugins/secret-detection";
export * from "./types";
