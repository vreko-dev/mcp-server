/**
 * Domain Module Index
 *
 * Exports domain-specific pattern detection.
 *
 * @module domain
 */

// Re-export types from core for convenience
export type { DomainBundle, DomainPattern } from "@snapback/core/analysis";
export { apiPatterns, authPatterns, daemonPatterns } from "./bundles/index.js";
